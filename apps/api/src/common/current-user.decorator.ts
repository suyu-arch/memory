import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@togetherly/contracts';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  return context.switchToHttp().getRequest<{ user: AuthUser }>().user;
});
