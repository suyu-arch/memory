import { BadRequestException, Injectable } from '@nestjs/common';
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3';
import type { AuthUser } from '@togetherly/contracts';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class AccountService {
  private readonly bucket = process.env.S3_BUCKET ?? 'togetherly-private';
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    } : undefined,
  });

  constructor(private readonly prisma: PrismaService) {}

  async exportData(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        person: true,
        friendLinks: { include: { person: true } },
        ownedEncounters: {
          include: {
            participants: { include: { person: true } }, moments: true, reflections: true,
            comments: true, revisions: true, assets: true, layouts: true, exports: true,
          },
        },
        memberships: { include: { encounter: true } },
        reflections: true,
        comments: true,
      },
    });
    return {
      format: 'togetherly-account-export', version: 1, exportedAt: new Date().toISOString(),
      note: '对象存储保持私有；照片可通过每条 Asset 的短时签名 URL 接口另行下载。',
      data: user,
    };
  }

  async deleteData(user: AuthUser, input: { confirmEmail?: string; confirmation?: string }) {
    if (input.confirmEmail?.toLowerCase() !== user.email.toLowerCase() || input.confirmation !== 'DELETE MY DATA') {
      throw new BadRequestException('Email and exact deletion confirmation are required');
    }
    const ownedEncounters = await this.prisma.encounter.findMany({ where: { ownerUserId: user.id }, select: { id: true } });
    const encounterIds = ownedEncounters.map(({ id }) => id);
    const [assets, exports] = await Promise.all([
      this.prisma.asset.findMany({
        where: { OR: [{ ownerUserId: user.id }, { encounterId: { in: encounterIds } }] },
        select: { storageKey: true, thumbnailKey: true },
      }),
      this.prisma.exportJob.findMany({
        where: { OR: [{ requestedById: user.id }, { encounterId: { in: encounterIds } }] }, select: { storageKey: true },
      }),
    ]);
    const keys = [...new Set([
      ...assets.flatMap((asset) => [asset.storageKey, asset.thumbnailKey]).filter((key): key is string => Boolean(key)),
      ...exports.map((job) => job.storageKey).filter((key): key is string => Boolean(key)),
    ])];
    for (let offset = 0; offset < keys.length; offset += 1000) {
      await this.s3.send(new DeleteObjectsCommand({
        Bucket: this.bucket, Delete: { Objects: keys.slice(offset, offset + 1000).map((Key) => ({ Key })), Quiet: true },
      }));
    }
    await this.prisma.user.delete({ where: { id: user.id } });

    let authIdentityDeleted = false;
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      });
      authIdentityDeleted = response.ok;
    }
    return { deleted: true, deletedObjects: keys.length, authIdentityDeleted };
  }
}
