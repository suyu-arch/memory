import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { RealtimeEvent } from '@togetherly/contracts';
import { Redis } from 'ioredis';
import { filter, map, Observable, Subject } from 'rxjs';

@Injectable()
export class RealtimeService implements OnModuleInit, OnModuleDestroy {
  private readonly events = new Subject<{ userIds: string[]; event: RealtimeEvent }>();
  private readonly subscriber = new Redis(process.env.VALKEY_URL ?? 'redis://localhost:6379', { lazyConnect: true, maxRetriesPerRequest: null });

  onModuleInit() {
    this.subscriber.on('error', (error) => console.error('Redis subscriber error:', error.message));
    this.subscriber.on('ready', () => {
      void this.subscriber.subscribe('togetherly:events')
        .catch((error: Error) => console.error('Redis subscribe error:', error.message));
    });
    this.subscriber.on('message', (_channel, raw) => {
      try { this.events.next(JSON.parse(raw)); } catch { /* ignore malformed worker messages */ }
    });
    void this.subscriber.connect()
      .catch((error: Error) => console.error('Redis realtime unavailable; API will continue:', error.message));
  }

  publish(userIds: string[], event: RealtimeEvent) { this.events.next({ userIds, event }); }

  forUser(userId: string): Observable<MessageEvent> {
    return this.events.pipe(
      filter(({ userIds }) => userIds.includes(userId)),
      map(({ event }) => ({ data: event }) as MessageEvent),
    );
  }

  async onModuleDestroy() {
    try { await this.subscriber.quit(); } catch { this.subscriber.disconnect(); }
  }
}
