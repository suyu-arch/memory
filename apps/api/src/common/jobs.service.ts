import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class JobsService implements OnModuleDestroy {
  private readonly connection = redisConnection(process.env.VALKEY_URL ?? 'redis://localhost:6379');
  private readonly media = new Queue('media', { connection: this.connection });
  private readonly layouts = new Queue('layouts', { connection: this.connection });

  constructor() {
    this.media.on('error', (error) => console.error('Media queue error:', error.message));
    this.layouts.on('error', (error) => console.error('Layouts queue error:', error.message));
  }

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

function redisConnection(raw: string) {
  const url = new URL(raw);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}
