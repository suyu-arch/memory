import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateInvitationSchema, type AuthUser } from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { parseBody } from '../common/zod.js';
import { InvitationsService } from './invitations.service.js';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.invitations.create(user, parseBody(CreateInvitationSchema, body));
  }

  @Post(':token/accept')
  accept(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.invitations.accept(user, token);
  }

  @Post(':id/revoke')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invitations.revoke(user.id, id);
  }
}
