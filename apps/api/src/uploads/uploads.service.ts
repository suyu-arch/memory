import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompleteMultipartUploadCommand, CreateMultipartUploadCommand, GetObjectCommand, ListPartsCommand, S3Client, UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { CreateUploadBatchInput } from '@togetherly/contracts';
import { PrismaService } from '../common/prisma.service.js';
import { JobsService } from '../common/jobs.service.js';
import { requireEncounterRole } from '../common/permissions.js';

@Injectable()
export class UploadsService {
  private readonly bucket = process.env.S3_BUCKET ?? 'togetherly-private';
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    } : undefined,
  });

  constructor(private readonly prisma: PrismaService, private readonly jobs: JobsService) {}

  async createBatch(userId: string, input: CreateUploadBatchInput) {
    await requireEncounterRole(this.prisma, input.encounterId, userId, ['OWNER', 'EDITOR']);
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const used = await this.prisma.asset.aggregate({ where: { ownerUserId: userId, state: { not: 'FAILED' } }, _sum: { bytes: true } });
    const requested = input.files.reduce((sum, file) => sum + BigInt(file.bytes), 0n);
    if ((used._sum.bytes ?? 0n) + requested > user.storageQuota) throw new ForbiddenException('Storage quota exceeded');

    return this.prisma.uploadBatch.create({
      data: {
        ownerUserId: userId,
        encounterId: input.encounterId,
        totalCount: input.files.length,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        assets: {
          create: input.files.map((file, index) => ({
            ownerUserId: userId,
            encounterId: input.encounterId,
            storageKey: `originals/${userId}/${crypto.randomUUID()}`,
            originalFilename: file.filename,
            mimeType: file.mimeType,
            bytes: BigInt(file.bytes),
            takenAt: file.takenAt ? new Date(file.takenAt) : undefined,
            sortOrder: index,
          })),
        },
      },
      include: { assets: true },
    });
  }

  async initiate(userId: string, assetId: string) {
    const asset = await this.ownedAsset(userId, assetId);
    if (asset.state === 'PROCESSING' || asset.state === 'READY') {
      return { assetId, state: asset.state, completed: true };
    }
    if (asset.multipartUploadId) return { uploadId: asset.multipartUploadId, assetId };
    const response = await this.s3.send(new CreateMultipartUploadCommand({
      Bucket: this.bucket, Key: asset.storageKey, ContentType: asset.mimeType,
      Metadata: { assetId: asset.id, ownerUserId: userId },
      ServerSideEncryption: 'AES256',
    }));
    if (!response.UploadId) throw new BadRequestException('Object storage did not return an upload id');
    await this.prisma.$transaction([
      this.prisma.asset.update({ where: { id: assetId }, data: { multipartUploadId: response.UploadId, state: 'UPLOADING' } }),
      this.prisma.uploadBatch.update({ where: { id: asset.uploadBatchId }, data: { state: 'UPLOADING' } }),
    ]);
    return { uploadId: response.UploadId, assetId };
  }

  async signPart(userId: string, assetId: string, partNumber: number) {
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10_000) throw new BadRequestException('Invalid part number');
    const asset = await this.ownedAsset(userId, assetId);
    if (!asset.multipartUploadId) throw new BadRequestException('Upload has not been initiated');
    const url = await getSignedUrl(this.s3, new UploadPartCommand({
      Bucket: this.bucket, Key: asset.storageKey, UploadId: asset.multipartUploadId, PartNumber: partNumber,
    }), { expiresIn: 900 });
    return { url, partNumber, expiresIn: 900 };
  }

  async uploadedParts(userId: string, assetId: string) {
    const asset = await this.ownedAsset(userId, assetId);
    if (!asset.multipartUploadId) return { parts: [], completed: asset.state === 'PROCESSING' || asset.state === 'READY' };
    const result = await this.s3.send(new ListPartsCommand({
      Bucket: this.bucket, Key: asset.storageKey, UploadId: asset.multipartUploadId,
    }));
    return {
      parts: (result.Parts ?? []).flatMap((part) => part.ETag && part.PartNumber
        ? [{ ETag: part.ETag, PartNumber: part.PartNumber, Size: part.Size ?? 0 }]
        : []),
    };
  }

  async assetUrl(userId: string, assetId: string, variant: 'original' | 'thumbnail') {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    await requireEncounterRole(this.prisma, asset.encounterId, userId);
    const key = variant === 'thumbnail' ? asset.thumbnailKey : asset.storageKey;
    if (!key) throw new NotFoundException('Thumbnail is not ready');
    const url = await getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 900 });
    return { url, expiresIn: 900, variant };
  }

  async complete(userId: string, assetId: string, parts: Array<{ ETag: string; PartNumber: number }>) {
    const asset = await this.ownedAsset(userId, assetId);
    if (asset.state === 'PROCESSING' || asset.state === 'READY') return { assetId, state: asset.state };
    if (!asset.multipartUploadId || parts.length === 0) throw new BadRequestException('Missing upload parts');
    await this.s3.send(new CompleteMultipartUploadCommand({
      Bucket: this.bucket, Key: asset.storageKey, UploadId: asset.multipartUploadId,
      MultipartUpload: { Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber) },
    }));
    await this.prisma.asset.update({ where: { id: assetId }, data: { state: 'PROCESSING', multipartUploadId: null } });
    await this.jobs.processAsset(assetId);
    return { assetId, state: 'PROCESSING' };
  }

  async setAdopted(userId: string, assetId: string, adopted: boolean) {
    const asset = await this.ownedAsset(userId, assetId);
    await requireEncounterRole(this.prisma, asset.encounterId, userId, ['OWNER', 'EDITOR']);
    return this.prisma.asset.update({ where: { id: assetId }, data: { adopted } });
  }

  private async ownedAsset(userId: string, assetId: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.ownerUserId !== userId) throw new ForbiddenException('Only the uploader can manage this upload');
    return asset;
  }
}
