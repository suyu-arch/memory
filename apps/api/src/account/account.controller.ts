import { Body, Controller, Delete, Get } from '@nestjs/common';
import type { AuthUser } from '@togetherly/contracts';
import { CurrentUser } from '../common/current-user.decorator.js';
import { AccountService } from './account.service.js';

@Controller('account')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('export')
  export(@CurrentUser() user: AuthUser) {
    return this.account.exportData(user.id);
  }

  @Delete()
  delete(@CurrentUser() user: AuthUser, @Body() body: { confirmEmail?: string; confirmation?: string }) {
    return this.account.deleteData(user, body);
  }
}
