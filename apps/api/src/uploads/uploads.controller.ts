import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CreateUploadBatchSchema, type AuthUser } from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { parseBody } from '../common/zod.js';
import { UploadsService } from './uploads.service.js';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('batches')
  createBatch(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    return this.uploads.createBatch(user.id, parseBody(CreateUploadBatchSchema, body));
  }

  @Post('assets/:assetId/initiate')
  initiate(@CurrentUser() user: AuthUser, @Param('assetId') assetId: string) {
    return this.uploads.initiate(user.id, assetId);
  }

  @Post('assets/:assetId/parts')
  signPart(@CurrentUser() user: AuthUser, @Param('assetId') assetId: string, @Body() body: { partNumber?: number }) {
    return this.uploads.signPart(user.id, assetId, Number(body.partNumber));
  }

  @Get('assets/:assetId/parts')
  uploadedParts(@CurrentUser() user: AuthUser, @Param('assetId') assetId: string) {
    return this.uploads.uploadedParts(user.id, assetId);
  }

  @Get('assets/:assetId/url')
  assetUrl(@CurrentUser() user: AuthUser, @Param('assetId') assetId: string, @Query('variant') variant?: string) {
    return this.uploads.assetUrl(user.id, assetId, variant === 'thumbnail' ? 'thumbnail' : 'original');
  }

  @Post('assets/:assetId/complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Param('assetId') assetId: string,
    @Body() body: { parts?: Array<{ ETag: string; PartNumber: number }> },
  ) {
    return this.uploads.complete(user.id, assetId, body.parts ?? []);
  }

  @Post('assets/:assetId/adoption')
  adoption(@CurrentUser() user: AuthUser, @Param('assetId') assetId: string, @Body() body: { adopted?: boolean }) {
    return this.uploads.setAdopted(user.id, assetId, Boolean(body.adopted));
  }
}
