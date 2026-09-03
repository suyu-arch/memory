import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthUser } from '@togetherly/contracts';
import { PrismaService } from './prisma.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks = process.env.SUPABASE_JWKS_URL
    ? createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL))
    : null;

  constructor(private readonly reflector: Reflector, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();
    const identity = process.env.AUTH_MODE === 'development'
      ? this.developmentIdentity(request.headers)
      : await this.supabaseIdentity(request.headers.authorization);
    const user = await this.prisma.user.upsert({
      where: { id: identity.id },
      update: { email: identity.email, displayName: identity.displayName },
      create: { id: identity.id, email: identity.email, displayName: identity.displayName },
    });
    await this.prisma.person.upsert({
      where: { accountUserId: user.id },
      update: { displayName: user.displayName },
      create: { accountUserId: user.id, createdByUserId: user.id, displayName: user.displayName },
    });
    request.user = { id: user.id, email: user.email, displayName: user.displayName };
    return true;
  }

  private developmentIdentity(headers: Record<string, string | undefined>): AuthUser {
    const id = headers['x-user-id'] ?? 'demo-user';
    return {
      id,
      email: headers['x-user-email'] ?? `${id}@example.test`,
      displayName: headers['x-user-name'] ?? (id === 'demo-user' ? '小满' : id),
    };
  }

  private async supabaseIdentity(authorization?: string): Promise<AuthUser> {
    if (!authorization?.startsWith('Bearer ') || !this.jwks) throw new UnauthorizedException();
    try {
      const { payload } = await jwtVerify(authorization.slice(7), this.jwks);
      if (!payload.sub || typeof payload.email !== 'string') throw new Error('Missing identity claims');
      const metadata = payload.user_metadata as Record<string, unknown> | undefined;
      return {
        id: payload.sub,
        email: payload.email,
        displayName: typeof metadata?.display_name === 'string' ? metadata.display_name : payload.email.split('@')[0]!,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
