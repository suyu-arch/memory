import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthGuard } from './common/auth.guard.js';
import { PrismaService } from './common/prisma.service.js';
import { JobsService } from './common/jobs.service.js';
import { RealtimeService } from './common/realtime.service.js';
import { HealthController } from './health.controller.js';
import { RealtimeController } from './realtime.controller.js';
import { PeopleController } from './people/people.controller.js';
import { PeopleService } from './people/people.service.js';
import { EncountersController } from './encounters/encounters.controller.js';
import { EncountersService } from './encounters/encounters.service.js';
import { UploadsController } from './uploads/uploads.controller.js';
import { UploadsService } from './uploads/uploads.service.js';
import { LayoutsController } from './layouts/layouts.controller.js';
import { LayoutsService } from './layouts/layouts.service.js';
import { InvitationsController } from './invitations/invitations.controller.js';
import { InvitationsService } from './invitations/invitations.service.js';
import { AccountController } from './account/account.controller.js';
import { AccountService } from './account/account.service.js';
import { ObservabilityInterceptor } from './common/observability.interceptor.js';
import { TogetherIdeasController } from './together-ideas/together-ideas.controller.js';
import { TogetherIdeasService } from './together-ideas/together-ideas.service.js';

@Module({
  controllers: [
    HealthController, RealtimeController, PeopleController, EncountersController,
    UploadsController, LayoutsController, InvitationsController, AccountController,
    TogetherIdeasController,
  ],
  providers: [
    PrismaService, JobsService, RealtimeService, PeopleService, EncountersService,
    UploadsService, LayoutsService, InvitationsService, AccountService,
    TogetherIdeasService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ObservabilityInterceptor },
  ],
})
export class AppModule {}
