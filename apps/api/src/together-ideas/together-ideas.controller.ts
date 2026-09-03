import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateTogetherIdeaSchema, UpdateTogetherIdeaSchema, type AuthUser } from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { parseBody } from '../common/zod.js';
import { TogetherIdeasService } from './together-ideas.service.js';

@Controller('together-ideas')
export class TogetherIdeasController {
  constructor(private readonly ideas: TogetherIdeasService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query('personId') personId?: string) {
    return this.ideas.list(user.id, personId);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.ideas.create(user, parseBody(CreateTogetherIdeaSchema, body));
  }

  @Patch(':ideaId')
  update(@CurrentUser() user: AuthUser, @Param('ideaId') ideaId: string, @Body() body: unknown) {
    return this.ideas.update(user.id, ideaId, parseBody(UpdateTogetherIdeaSchema, body));
  }

  @Delete(':ideaId')
  remove(@CurrentUser() user: AuthUser, @Param('ideaId') ideaId: string) {
    return this.ideas.remove(user.id, ideaId);
  }
}
