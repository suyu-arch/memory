import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { GenerateScrapbookInput, ScrapbookDocument } from '@togetherly/contracts';
import { JobsService } from '../common/jobs.service.js';
import { requireEncounterRole } from '../common/permissions.js';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class LayoutsService {
  private readonly bucket = process.env.S3_BUCKET ?? 'togetherly-private';
  private readonly s3 = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    credentials: process.env.S3_ACCESS_KEY ? {
      accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    } : undefined,
  });

  constructor(private readonly prisma: PrismaService, private readonly jobs: JobsService) {}

  async list(userId: string, encounterId: string) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    return this.prisma.scrapbookLayout.findMany({ where: { encounterId }, orderBy: { createdAt: 'desc' } });
  }

  async generate(userId: string, encounterId: string, input: GenerateScrapbookInput) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER', 'EDITOR']);
    const encounter = await this.prisma.encounter.findUniqueOrThrow({ where: { id: encounterId } });
    if (input.allowCloudVision && process.env.CLOUD_VISION_ENABLED !== 'true') {
      throw new BadRequestException('Cloud vision is disabled for this deployment');
    }
    const layout = await this.prisma.scrapbookLayout.create({
      data: {
        encounterId, createdByUserId: userId, template: input.template,
        decorationLevel: input.decorationLevel, sourceEncounterVersion: encounter.version,
        sourceText: encounter.story, allowCloudVision: input.allowCloudVision,
      },
    });
    await this.jobs.generateLayout(layout.id);
    return layout;
  }

  async update(userId: string, encounterId: string, layoutId: string, layout?: ScrapbookDocument) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER', 'EDITOR']);
    if (!layout || layout.version !== 1) throw new BadRequestException('Invalid scrapbook document');
    const existing = await this.prisma.scrapbookLayout.findUniqueOrThrow({ where: { id: layoutId } });
    if (existing.encounterId !== encounterId) throw new BadRequestException('Layout does not belong to encounter');
    if (layout.sourceText !== existing.sourceText) throw new BadRequestException('The original story text cannot be changed by layout editing');
    await this.prisma.scrapbookLayout.updateMany({ where: { encounterId }, data: { isCurrent: false } });
    return this.prisma.scrapbookLayout.update({ where: { id: layoutId }, data: { layout: layout as object, isCurrent: true } });
  }

  async export(userId: string, encounterId: string, layoutId: string) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    const layout = await this.prisma.scrapbookLayout.findUniqueOrThrow({ where: { id: layoutId } });
    if (layout.encounterId !== encounterId || layout.status !== 'READY') throw new BadRequestException('Layout is not ready');
    const job = await this.prisma.exportJob.create({ data: { encounterId, layoutId, requestedById: userId } });
    await this.jobs.generateExport(job.id);
    return job;
  }

  async exportUrl(userId: string, encounterId: string, exportId: string) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    const job = await this.prisma.exportJob.findUnique({ where: { id: exportId } });
    if (!job || job.encounterId !== encounterId) throw new NotFoundException('Export not found');
    if (job.status !== 'READY' || !job.storageKey) return { status: job.status, error: job.error };
    const url = await getSignedUrl(this.s3, new GetObjectCommand({
      Bucket: this.bucket, Key: job.storageKey, ResponseContentDisposition: `attachment; filename="togetherly-${exportId}.png"`,
    }), { expiresIn: 900 });
    return { status: job.status, url, expiresIn: 900 };
  }
}
