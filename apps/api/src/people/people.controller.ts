import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePersonSchema, UpdatePersonSchema, type AuthUser } from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { parseBody } from '../common/zod.js';
import { PeopleService } from './people.service.js';

@Controller('people')
export class PeopleController {
  constructor(private readonly people: PeopleService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.people.list(user.id); }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.people.create(user.id, parseBody(CreatePersonSchema, body));
  }

  @Patch(':personId')
  update(@CurrentUser() user: AuthUser, @Param('personId') personId: string, @Body() body: unknown) {
    return this.people.update(user.id, personId, parseBody(UpdatePersonSchema, body));
  }

  @Delete(':personId')
  remove(@CurrentUser() user: AuthUser, @Param('personId') personId: string) {
    return this.people.remove(user.id, personId);
  }

  @Get(':personId')
  get(@CurrentUser() user: AuthUser, @Param('personId') personId: string) {
    return this.people.get(user.id, personId);
  }

  @Get(':personId/timeline')
  timeline(
    @CurrentUser() user: AuthUser,
    @Param('personId') personId: string,
    @Query('cursor') cursor?: string,
    @Query('year') year?: string,
  ) {
    return this.people.timeline(user.id, personId, cursor, year ? Number(year) : undefined);
  }

  @Get(':personId/calendar')
  calendar(@CurrentUser() user: AuthUser, @Param('personId') personId: string, @Query('year') year?: string) {
    return this.people.calendar(user.id, personId, year ? Number(year) : new Date().getFullYear());
  }
}
