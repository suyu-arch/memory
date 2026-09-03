import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  CreateCommentSchema, CreateEncounterSchema, CreateMomentSchema, CreateReflectionSchema,
  UpdateEncounterSchema, UpdateMemberSchema, UpdateMomentSchema, type AuthUser,
} from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { parseBody } from '../common/zod.js';
import { EncountersService } from './encounters.service.js';

@Controller('encounters')
export class EncountersController {
  constructor(private readonly encounters: EncountersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('cursor') cursor?: string) { return this.encounters.list(user.id, cursor); }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.encounters.create(user.id, parseBody(CreateEncounterSchema, body));
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.encounters.get(user.id, id); }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.encounters.update(user.id, id, parseBody(UpdateEncounterSchema, body));
  }

  @Post(':id/moments')
  addMoment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.encounters.addMoment(user.id, id, parseBody(CreateMomentSchema, body));
  }

  @Patch(':id/moments/:momentId')
  updateMoment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('momentId') momentId: string, @Body() body: unknown) {
    return this.encounters.updateMoment(user.id, id, momentId, parseBody(UpdateMomentSchema, body));
  }

  @Delete(':id/moments/:momentId')
  removeMoment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('momentId') momentId: string) {
    return this.encounters.removeMoment(user.id, id, momentId);
  }

  @Post(':id/reflections')
  addReflection(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.encounters.addReflection(user.id, id, parseBody(CreateReflectionSchema, body));
  }

  @Post(':id/comments')
  addComment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    return this.encounters.addComment(user.id, id, parseBody(CreateCommentSchema, body));
  }

  @Delete(':id/comments/:commentId')
  removeComment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('commentId') commentId: string) {
    return this.encounters.removeComment(user.id, id, commentId);
  }

  @Patch(':id/members/:memberUserId')
  updateMember(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('memberUserId') memberUserId: string, @Body() body: unknown) {
    return this.encounters.updateMember(user.id, id, memberUserId, parseBody(UpdateMemberSchema, body).role);
  }

  @Delete(':id/members/:memberUserId')
  removeMember(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('memberUserId') memberUserId: string) {
    return this.encounters.removeMember(user.id, id, memberUserId);
  }

  @Get(':id/revisions')
  revisions(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('cursor') cursor?: string) {
    return this.encounters.revisions(user.id, id, cursor);
  }
}
