import { createHash } from 'node:crypto';
import exifr from 'exifr';
import sharp from 'sharp';

export interface AnalyzedPhoto {
  sha256: string;
  perceptualHash: string;
  width: number;
  height: number;
  sharpness: number;
  exposure: number;
  takenAt: Date | null;
}

export interface RankedPhoto extends AnalyzedPhoto {
  id: string;
  sceneGroup: number;
  recommended: boolean;
}

export async function analyzePhoto(buffer: Buffer): Promise<AnalyzedPhoto> {
  const image = sharp(buffer, { failOn: 'none' }).rotate();
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error('Image dimensions are unavailable');
  const { data } = await image.clone().resize(9, 8, { fit: 'fill' }).greyscale().raw().toBuffer({ resolveWithObject: true });
  let bits = '';
  let exposureSum = 0;
  let edgeSum = 0;
  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const current = data[y * 9 + x]!;
      const right = data[y * 9 + x + 1]!;
      bits += current > right ? '1' : '0';
      exposureSum += current;
      edgeSum += Math.abs(current - right);
    }
  }
  const perceptualHash = Array.from({ length: 16 }, (_, index) =>
    Number.parseInt(bits.slice(index * 4, index * 4 + 4), 2).toString(16),
  ).join('');
  let takenAt: Date | null = null;
  try {
    const exif = await exifr.parse(buffer, ['DateTimeOriginal', 'CreateDate']);
    const candidate = exif?.DateTimeOriginal ?? exif?.CreateDate;
    if (candidate instanceof Date && !Number.isNaN(candidate.getTime())) takenAt = candidate;
  } catch { /* malformed EXIF must not fail an upload */ }
  return {
    sha256: createHash('sha256').update(buffer).digest('hex'),
    perceptualHash,
    width: metadata.width,
    height: metadata.height,
    sharpness: Number((edgeSum / 64 / 255).toFixed(4)),
    exposure: Number((exposureSum / 64 / 255).toFixed(4)),
    takenAt,
  };
}

export function hammingDistance(left: string, right: string): number {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let distance = 0;
  for (let index = 0; index < left.length; index += 1) {
    const xor = Number.parseInt(left[index]!, 16) ^ Number.parseInt(right[index]!, 16);
    distance += xor.toString(2).replaceAll('0', '').length;
  }
  return distance;
}

export function organizePhotos<T extends AnalyzedPhoto & { id: string }>(photos: T[]): Array<T & { sceneGroup: number; recommended: boolean }> {
  const ordered = [...photos].sort((a, b) => {
    const aTime = a.takenAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.takenAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime || a.id.localeCompare(b.id);
  });
  let sceneGroup = 0;
  let previousTime: number | null = null;
  const grouped = ordered.map((photo) => {
    const time = photo.takenAt?.getTime() ?? null;
    if (time !== null && previousTime !== null && time - previousTime > 45 * 60 * 1000) sceneGroup += 1;
    if (time !== null) previousTime = time;
    return { ...photo, sceneGroup, recommended: true };
  });
  for (let index = 0; index < grouped.length; index += 1) {
    const candidate = grouped[index]!;
    for (let priorIndex = 0; priorIndex < index; priorIndex += 1) {
      const prior = grouped[priorIndex]!;
      if (hammingDistance(candidate.perceptualHash, prior.perceptualHash) <= 5) {
        const candidateScore = qualityScore(candidate);
        const priorScore = qualityScore(prior);
        if (candidateScore > priorScore) prior.recommended = false;
        else candidate.recommended = false;
        break;
      }
    }
  }
  return grouped;
}

function qualityScore(photo: Pick<AnalyzedPhoto, 'sharpness' | 'exposure' | 'width' | 'height'>) {
  const exposurePenalty = Math.abs(photo.exposure - 0.5);
  return photo.sharpness * 4 - exposurePenalty + Math.log2(photo.width * photo.height) / 100;
}
