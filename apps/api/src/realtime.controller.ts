import { Controller, Sse } from '@nestjs/common';
import type { AuthUser } from '@togetherly/contracts';
import { CurrentUser } from './common/current-user.decorator.js';
import { RealtimeService } from './common/realtime.service.js';

@Controller('realtime')
export class RealtimeController {
  constructor(private readonly realtime: RealtimeService) {}

  @Sse('events')
  events(@CurrentUser() user: AuthUser) { return this.realtime.forUser(user.id); }
}
