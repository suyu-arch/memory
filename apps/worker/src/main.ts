import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import type { RealtimeEvent, ScrapbookDocument } from '@togetherly/contracts';
import { analyzePhoto, generateScrapbook, organizePhotos, renderScrapbookSvg } from '@togetherly/media';
import { Worker, type Job } from 'bullmq';
import { Redis } from 'ioredis';
import sharp from 'sharp';
import { Sentry, shutdownTelemetry } from './instrumentation.js';

const prisma = new PrismaClient();
const valkeyUrl = process.env.VALKEY_URL ?? 'redis://localhost:6379';
const connection = parseRedisUrl(valkeyUrl);
const publisher = new Redis(valkeyUrl, { maxRetriesPerRequest: null });
const bucket = process.env.S3_BUCKET ?? 'togetherly-private';
const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  credentials: process.env.S3_ACCESS_KEY ? {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY ?? '',
  } : undefined,
});

const mediaWorker = new Worker('media', async (job) => {
  if (job.name !== 'asset.process') return;
  await processAsset(job as Job<{ assetId: string }>);
}, { connection, concurrency: 3 });

const layoutWorker = new Worker('layouts', async (job) => {
  if (job.name === 'layout.generate') await processLayout(job as Job<{ layoutId: string }>);
  if (job.name === 'export.generate') await processExport(job as Job<{ exportId: string }>);
}, { connection, concurrency: 2 });

async function processAsset(job: Job<{ assetId: string }>) {
  const asset = await prisma.asset.findUniqueOrThrow({ where: { id: job.data.assetId } });
  if (asset.state === 'READY') return;
  try {
    const original = await getObject(asset.storageKey);
    const analysis = await analyzePhoto(original);
    const thumbnailKey = `thumbnails/${asset.ownerUserId}/${asset.id}.webp`;
    const thumbnail = await sharp(original, { failOn: 'none' }).rotate().resize(1440, 1440, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: thumbnailKey, Body: thumbnail, ContentType: 'image/webp', ServerSideEncryption: 'AES256' }));
    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        state: 'READY', thumbnailKey, sha256: analysis.sha256, perceptualHash: analysis.perceptualHash,
        width: analysis.width, height: analysis.height, sharpness: analysis.sharpness, exposure: analysis.exposure,
        takenAt: asset.takenAt ?? analysis.takenAt,
      },
    });
    await reorganizeEncounter(asset.encounterId);
    await refreshBatch(asset.uploadBatchId);
    await publish([asset.ownerUserId], { type: 'asset.ready', encounterId: asset.encounterId, assetId: asset.id });
  } catch (error) {
    await prisma.asset.update({ where: { id: asset.id }, data: { state: 'FAILED', error: error instanceof Error ? error.message : 'Unknown media error' } });
    await refreshBatch(asset.uploadBatchId);
    throw error;
  }
}

async function reorganizeEncounter(encounterId: string) {
  const assets = await prisma.asset.findMany({ where: { encounterId, state: 'READY' }, orderBy: { sortOrder: 'asc' } });
  const organized = organizePhotos(assets.filter((asset): asset is typeof asset & {
    sha256: string; perceptualHash: string; width: number; height: number; sharpness: number; exposure: number;
  } => Boolean(asset.sha256 && asset.perceptualHash && asset.width && asset.height && asset.sharpness !== null && asset.exposure !== null)).map((asset) => ({
    id: asset.id, sha256: asset.sha256, perceptualHash: asset.perceptualHash, width: asset.width,
    height: asset.height, sharpness: asset.sharpness, exposure: asset.exposure, takenAt: asset.takenAt,
  })));
  await prisma.$transaction(organized.map((photo, sortOrder) => prisma.asset.update({
    where: { id: photo.id }, data: { sceneGroup: photo.sceneGroup, recommended: photo.recommended, sortOrder },
  })));
}

async function refreshBatch(batchId: string) {
  const [ready, failed, batch] = await Promise.all([
    prisma.asset.count({ where: { uploadBatchId: batchId, state: 'READY' } }),
    prisma.asset.count({ where: { uploadBatchId: batchId, state: 'FAILED' } }),
    prisma.uploadBatch.findUniqueOrThrow({ where: { id: batchId } }),
  ]);
  const finished = ready + failed;
  const state = finished < batch.totalCount ? 'PROCESSING' : failed === 0 ? 'READY' : 'PARTIAL_FAILED';
  await prisma.uploadBatch.update({ where: { id: batchId }, data: { completedCount: ready, failedCount: failed, state } });
  await publish([batch.ownerUserId], { type: 'upload.progress', batchId, completed: finished, total: batch.totalCount });
}

async function processLayout(job: Job<{ layoutId: string }>) {
  const layout = await prisma.scrapbookLayout.findUniqueOrThrow({ where: { id: job.data.layoutId }, include: { encounter: true } });
  if (layout.status === 'READY') return;
  await prisma.scrapbookLayout.update({ where: { id: layout.id }, data: { status: 'PROCESSING' } });
  try {
    let assets = await prisma.asset.findMany({ where: { encounterId: layout.encounterId, state: 'READY', adopted: true }, orderBy: { sortOrder: 'asc' } });
    if (layout.allowCloudVision) assets = await applyOptionalCloudVision(assets);
    const document = generateScrapbook({
      story: layout.sourceText,
      dateLabel: layout.encounter.startAt.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
      locationText: layout.encounter.locationText,
      template: layout.template,
      decorationLevel: layout.decorationLevel,
      assets: assets.filter((asset) => asset.width && asset.height).map((asset) => ({
        id: asset.id, sceneGroup: asset.sceneGroup ?? 0, recommended: asset.recommended,
        width: asset.width!, height: asset.height!,
      })),
    });
    if (document.sourceText !== layout.sourceText) throw new Error('Invariant failed: source text was modified');
    await prisma.$transaction([
      prisma.scrapbookLayout.updateMany({ where: { encounterId: layout.encounterId }, data: { isCurrent: false } }),
      prisma.scrapbookLayout.update({ where: { id: layout.id }, data: { status: 'READY', layout: document as object, isCurrent: true } }),
    ]);
    const members = await prisma.encounterMember.findMany({ where: { encounterId: layout.encounterId }, select: { userId: true } });
    await publish(members.map((member) => member.userId), { type: 'layout.ready', encounterId: layout.encounterId, layoutId: layout.id });
  } catch (error) {
    await prisma.scrapbookLayout.update({ where: { id: layout.id }, data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown layout error' } });
    throw error;
  }
}

async function processExport(job: Job<{ exportId: string }>) {
  const exportJob = await prisma.exportJob.findUniqueOrThrow({ where: { id: job.data.exportId }, include: { layout: true } });
  if (exportJob.status === 'READY') return;
  await prisma.exportJob.update({ where: { id: exportJob.id }, data: { status: 'PROCESSING' } });
  try {
    const document = exportJob.layout.layout as unknown as ScrapbookDocument;
    const assetIds = document.pages.flatMap((page) => page.blocks.filter((block) => block.type === 'photo').map((block) => block.assetId));
    const assets = await prisma.asset.findMany({ where: { id: { in: assetIds } } });
    const assetUrls: Record<string, string> = {};
    for (const asset of assets) {
      if (!asset.thumbnailKey) continue;
      const bytes = await getObject(asset.thumbnailKey);
      assetUrls[asset.id] = `data:image/webp;base64,${bytes.toString('base64')}`;
    }
    const svg = renderScrapbookSvg(document, assetUrls);
    const png = await sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
    const storageKey = `exports/${exportJob.requestedById}/${exportJob.id}.png`;
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: storageKey, Body: png, ContentType: 'image/png', ServerSideEncryption: 'AES256' }));
    await prisma.exportJob.update({ where: { id: exportJob.id }, data: { status: 'READY', storageKey } });
  } catch (error) {
    await prisma.exportJob.update({ where: { id: exportJob.id }, data: { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown export error' } });
    throw error;
  }
}

async function applyOptionalCloudVision<T extends { id: string; thumbnailKey: string | null; sceneGroup: number | null }>(assets: T[]): Promise<T[]> {
  if (process.env.CLOUD_VISION_ENABLED !== 'true' || !process.env.CLOUD_VISION_ENDPOINT) return assets;
  const images = [] as Array<{ id: string; imageBase64: string }>;
  for (const asset of assets) {
    if (!asset.thumbnailKey) continue;
    const bytes = await getObject(asset.thumbnailKey);
    const preview = await sharp(bytes).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
    images.push({ id: asset.id, imageBase64: preview.toString('base64') });
  }
  const response = await fetch(process.env.CLOUD_VISION_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.CLOUD_VISION_API_KEY ?? ''}` },
    body: JSON.stringify({ images }),
  });
  if (!response.ok) throw new Error(`Cloud vision failed: ${response.status}`);
  const result = await response.json() as { groups?: Array<{ id: string; sceneGroup: number }> };
  const groups = new Map(result.groups?.map((entry) => [entry.id, entry.sceneGroup]) ?? []);
  return assets.map((asset) => ({ ...asset, sceneGroup: groups.get(asset.id) ?? asset.sceneGroup }));
}

async function getObject(key: string) {
  const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error(`Object ${key} has no body`);
  return Buffer.from(await response.Body.transformToByteArray());
}

async function publish(userIds: string[], event: RealtimeEvent) {
  await publisher.publish('togetherly:events', JSON.stringify({ userIds, event }));
}

function parseRedisUrl(raw: string) {
  const url = new URL(raw);
  return { host: url.hostname, port: Number(url.port || 6379), username: url.username || undefined, password: url.password || undefined };
}

async function shutdown() {
  await Promise.all([mediaWorker.close(), layoutWorker.close(), publisher.quit(), prisma.$disconnect()]);
  await shutdownTelemetry();
}
process.on('SIGINT', () => void shutdown().then(() => process.exit(0)));
process.on('SIGTERM', () => void shutdown().then(() => process.exit(0)));
process.on('unhandledRejection', (error) => Sentry.captureException(error));
