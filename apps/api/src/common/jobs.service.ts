import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly connection = { url: process.env.VALKEY_URL ?? 'redis://localhost:6379' };
  private readonly media = new Queue('media', { connection: this.connection });
  private readonly layouts = new Queue('layouts', { connection: this.connection });

  processAsset(assetId: string) {
    return this.media.add('asset.process', { assetId }, { jobId: `asset:${assetId}`, attempts: 5, backoff: { type: 'exponential', delay: 2_000 } });
  }

  generateLayout(layoutId: string) {
    return this.layouts.add('layout.generate', { layoutId }, { jobId: `layout:${layoutId}`, attempts: 3, backoff: { type: 'exponential', delay: 2_000 } });
  }

  generateExport(exportId: string) {
    return this.layouts.add('export.generate', { exportId }, { jobId: `export:${exportId}`, attempts: 3, backoff: { type: 'exponential', delay: 2_000 } });
  }

  async onModuleDestroy() { await Promise.all([this.media.close(), this.layouts.close()]); }
}
