import { enqueueAssignedUploads, pendingUploads, updateUploadTask, type UploadTask } from './offline';

const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';
const partSize = 5 * 1024 * 1024;
const authHeaders = {
  'content-type': 'application/json',
  'x-user-id': 'demo-user',
  'x-user-email': 'demo@example.test',
  'x-user-name': '小满',
};

async function json<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { ...authHeaders, ...init.headers } });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export async function createEncounter(input: { title: string; story: string }) {
  return json<{ id: string }>('/encounters', {
    method: 'POST',
    body: JSON.stringify({
      kind: 'PERSONAL', title: input.title, story: input.story, startAt: new Date().toISOString(),
      participantPersonIds: [], moments: [],
    }),
  });
}

export async function prepareUploads(
  encounterId: string,
  files: Array<{ uri: string; filename: string; mimeType: string; bytes: number }>,
) {
  if (!files.length) return;
  const batch = await json<{ assets: Array<{ id: string }> }>('/uploads/batches', {
    method: 'POST',
    body: JSON.stringify({ encounterId, files: files.map(({ filename, mimeType, bytes }) => ({ filename, mimeType, bytes })) }),
  });
  await enqueueAssignedUploads(encounterId, files.map((file, index) => ({
    ...file, remoteAssetId: batch.assets[index]!.id,
  })));
}

async function uploadTask(task: UploadTask, onPart: (bytes: number) => void) {
  const assetId = task.remote_asset_id;
  if (!assetId) throw new Error('上传任务缺少远端照片 ID');
  await updateUploadTask(task.id, 'UPLOADING');
  const initiated = await json<{ completed?: boolean }>(`/uploads/assets/${assetId}/initiate`, { method: 'POST' });
  if (initiated.completed) {
    await updateUploadTask(task.id, 'READY');
    return;
  }
  const existing = await json<{ parts: Array<{ ETag: string; PartNumber: number; Size: number }>; completed?: boolean }>(`/uploads/assets/${assetId}/parts`);
  if (existing.completed) {
    await updateUploadTask(task.id, 'READY');
    return;
  }
  const completed = new Map(existing.parts.map((part) => [part.PartNumber, part]));
  const source = await fetch(task.uri);
  const blob = await source.blob();
  for (let offset = 0, partNumber = 1; offset < blob.size; offset += partSize, partNumber += 1) {
    if (completed.has(partNumber)) continue;
    const signed = await json<{ url: string }>(`/uploads/assets/${assetId}/parts`, {
      method: 'POST', body: JSON.stringify({ partNumber }),
    });
    const body = blob.slice(offset, Math.min(offset + partSize, blob.size));
    let response: Response | undefined;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        response = await fetch(signed.url, { method: 'PUT', body });
        if (response.ok) break;
      } catch {
        response = undefined;
      }
      await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** attempt));
    }
    if (!response?.ok) throw new Error(`${task.filename} 第 ${partNumber} 个分片上传失败`);
    const etag = response.headers.get('etag');
    if (!etag) throw new Error('对象存储未暴露 ETag 响应头');
    completed.set(partNumber, { ETag: etag, PartNumber: partNumber, Size: body.size });
    onPart(body.size);
  }
  await json(`/uploads/assets/${assetId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ parts: [...completed.values()].map(({ ETag, PartNumber }) => ({ ETag, PartNumber })) }),
  });
  await updateUploadTask(task.id, 'READY');
}

export async function resumeUploads(encounterId: string, onProgress: (done: number, total: number) => void) {
  const tasks = await pendingUploads(encounterId);
  const total = tasks.reduce((sum, task) => sum + task.bytes, 0);
  let done = 0;
  for (const task of tasks) {
    try {
      await uploadTask(task, (bytes) => { done += bytes; onProgress(done, total); });
    } catch (error) {
      const attempts = task.attempts + 1;
      await updateUploadTask(task.id, attempts >= 5 ? 'FAILED' : 'PENDING', attempts);
      throw error;
    }
  }
}
