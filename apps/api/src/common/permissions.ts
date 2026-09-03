import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { MemberRole } from '@prisma/client';
import { PrismaService } from './prisma.service.js';

export async function requireEncounterRole(
  prisma: PrismaService,
  encounterId: string,
  userId: string,
  allowed: MemberRole[] = ['OWNER', 'EDITOR', 'VIEWER'],
) {
  const member = await prisma.encounterMember.findUnique({ where: { encounterId_userId: { encounterId, userId } } });
  if (!member) throw new NotFoundException('Encounter not found');
  if (!allowed.includes(member.role)) throw new ForbiddenException('Insufficient encounter permission');
  return member;
}
