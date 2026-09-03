const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/v1';
const partSize = 5 * 1024 * 1024;

type BatchAsset = { id: string };
type UploadBatch = { assets: BatchAsset[] };

function apiHeaders() {
  return {
    'content-type': 'application/json',
    'x-user-id': 'demo-user',
    'x-user-email': 'demo@example.test',
    'x-user-name': '小满',
  };
}

async function json<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, { ...init, headers: { ...apiHeaders(), ...init.headers } });
  if (!response.ok) throw new Error(`上传失败 (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

async function uploadFile(assetId: string, file: File, onProgress: (uploaded: number) => void) {
  await json(`/uploads/assets/${assetId}/initiate`, { method: 'POST' });
  const completed: Array<{ ETag: string; PartNumber: number }> = [];
  for (let offset = 0, partNumber = 1; offset < file.size; offset += partSize, partNumber += 1) {
    const signed = await json<{ url: string }>(`/uploads/assets/${assetId}/parts`, {
      method: 'POST', body: JSON.stringify({ partNumber }),
    });
    const part = file.slice(offset, Math.min(offset + partSize, file.size));
    let response: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        response = await fetch(signed.url, { method: 'PUT', body: part });
        if (response.ok) break;
      } catch {
        response = undefined;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
    if (!response?.ok) throw new Error(`照片 ${file.name} 的第 ${partNumber} 个分片上传失败`);
    const etag = response.headers.get('etag');
    if (!etag) throw new Error('对象存储没有暴露 ETag 响应头，请检查存储 CORS 配置');
    completed.push({ ETag: etag, PartNumber: partNumber });
    onProgress(part.size);
  }
  await json(`/uploads/assets/${assetId}/complete`, { method: 'POST', body: JSON.stringify({ parts: completed }) });
}

export async function uploadEncounterPhotos(
  encounterId: string,
  files: File[],
  onProgress: (uploadedBytes: number, totalBytes: number) => void,
) {
  if (files.length === 0) return;
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const batch = await json<UploadBatch>('/uploads/batches', {
    method: 'POST',
    body: JSON.stringify({
      encounterId,
      files: files.map((file) => ({ filename: file.name, mimeType: file.type || 'image/jpeg', bytes: file.size })),
    }),
  });
  let uploadedBytes = 0;
  // Sequential upload keeps memory stable for 200-photo batches; every part retries independently.
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]!;
    const asset = batch.assets[index];
    if (!asset) throw new Error('上传批次与本地照片数量不一致');
    await uploadFile(asset.id, file, (bytes) => {
      uploadedBytes += bytes;
      onProgress(uploadedBytes, totalBytes);
    });
  }
}
