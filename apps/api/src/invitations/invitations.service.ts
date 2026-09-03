import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser, CreateInvitationInput } from '@togetherly/contracts';
import { createHash, randomBytes } from 'node:crypto';
import { requireEncounterRole } from '../common/permissions.js';
import { PrismaService } from '../common/prisma.service.js';
import { RealtimeService } from '../common/realtime.service.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async create(user: AuthUser, input: CreateInvitationInput) {
    if (input.encounterId) await requireEncounterRole(this.prisma, input.encounterId, user.id, ['OWNER']);
    if (input.personId) {
      const link = await this.prisma.friendLink.findUnique({ where: { ownerUserId_personId: { ownerUserId: user.id, personId: input.personId } } });
      if (!link) throw new NotFoundException('Friend not found');
    }
    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.invitation.create({
      data: {
        tokenHash: digest(token), email: input.email.toLowerCase(), inviterUserId: user.id,
        encounterId: input.encounterId, personId: input.personId, role: input.role,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    return { ...invitation, token, acceptUrl: `/invite/${token}` };
  }

  async accept(user: AuthUser, token: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash: digest(token) } });
    if (!invitation || invitation.revokedAt || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is invalid or expired');
    }
    if (invitation.email !== user.email.toLowerCase()) throw new ForbiddenException('Sign in with the invited email address');

    const result = await this.prisma.$transaction(async (tx) => {
      const canonical = await tx.person.findUniqueOrThrow({ where: { accountUserId: user.id } });
      if (invitation.personId && invitation.personId !== canonical.id) {
        const placeholder = await tx.person.findUniqueOrThrow({ where: { id: invitation.personId } });
        const participantRows = await tx.encounterParticipant.findMany({ where: { personId: placeholder.id } });
        for (const row of participantRows) {
          const duplicate = await tx.encounterParticipant.findUnique({
            where: { encounterId_personId: { encounterId: row.encounterId, personId: canonical.id } },
          });
          if (duplicate) await tx.encounterParticipant.delete({ where: { id: row.id } });
          else await tx.encounterParticipant.update({ where: { id: row.id }, data: { personId: canonical.id } });
        }
        const links = await tx.friendLink.findMany({ where: { personId: placeholder.id } });
        for (const link of links) {
          const existing = await tx.friendLink.findUnique({ where: { ownerUserId_personId: { ownerUserId: link.ownerUserId, personId: canonical.id } } });
          if (existing) await tx.friendLink.delete({ where: { id: link.id } });
          else await tx.friendLink.update({ where: { id: link.id }, data: { personId: canonical.id } });
        }
        await tx.person.update({ where: { id: placeholder.id }, data: { mergedIntoPersonId: canonical.id } });
      }
      if (invitation.encounterId) {
        await tx.encounterMember.upsert({
          where: { encounterId_userId: { encounterId: invitation.encounterId, userId: user.id } },
          update: { role: invitation.role }, create: { encounterId: invitation.encounterId, userId: user.id, role: invitation.role },
        });
      }
      return tx.invitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
    });
    this.realtime.publish([invitation.inviterUserId], { type: 'invite.accepted', invitationId: invitation.id, userId: user.id });
    return result;
  }

  async revoke(userId: string, id: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.inviterUserId !== userId) throw new NotFoundException('Invitation not found');
    return this.prisma.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
