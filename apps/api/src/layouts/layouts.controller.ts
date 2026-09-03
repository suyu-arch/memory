import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { GenerateScrapbookSchema, type AuthUser, type ScrapbookDocument } from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { parseBody } from '../common/zod.js';
import { LayoutsService } from './layouts.service.js';

@Controller('encounters/:encounterId/layouts')
export class LayoutsController {
  constructor(private readonly layouts: LayoutsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('encounterId') encounterId: string) {
    return this.layouts.list(user.id, encounterId);
  }

  @Post('generate')
  generate(@CurrentUser() user: AuthUser, @Param('encounterId') encounterId: string, @Body() body: unknown) {
    return this.layouts.generate(user.id, encounterId, parseBody(GenerateScrapbookSchema, body));
  }

  @Patch(':layoutId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('encounterId') encounterId: string,
    @Param('layoutId') layoutId: string,
    @Body() body: { layout?: ScrapbookDocument },
  ) {
    return this.layouts.update(user.id, encounterId, layoutId, body.layout);
  }

  @Post(':layoutId/exports')
  export(@CurrentUser() user: AuthUser, @Param('encounterId') encounterId: string, @Param('layoutId') layoutId: string) {
    return this.layouts.export(user.id, encounterId, layoutId);
  }

  @Get('exports/:exportId/url')
  exportUrl(@CurrentUser() user: AuthUser, @Param('encounterId') encounterId: string, @Param('exportId') exportId: string) {
    return this.layouts.exportUrl(user.id, encounterId, exportId);
  }
}
