import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateCommentInput, CreateEncounterInput, CreateMomentInput, CreateReflectionInput, UpdateEncounterInput, UpdateMomentInput,
} from '@togetherly/contracts';
import { PrismaService } from '../common/prisma.service.js';
import { requireEncounterRole } from '../common/permissions.js';
import { RealtimeService } from '../common/realtime.service.js';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async create(userId: string, input: CreateEncounterInput) {
    const self = await this.prisma.person.findUniqueOrThrow({ where: { accountUserId: userId } });
    const participantIds = [...new Set([self.id, ...input.participantPersonIds])];
    return this.prisma.$transaction(async (tx) => {
      const encounter = await tx.encounter.create({
        data: {
          kind: input.kind,
          ownerUserId: userId,
          title: input.title,
          story: input.story,
          locationText: input.locationText,
          startAt: new Date(input.startAt),
          endAt: input.endAt ? new Date(input.endAt) : undefined,
          participants: { create: participantIds.map((personId) => ({ personId })) },
          members: { create: { userId, role: 'OWNER' } },
          moments: { create: input.moments.map((moment) => ({ ...moment, startAt: moment.startAt ? new Date(moment.startAt) : undefined })) },
        },
        include: { participants: { include: { person: true } }, moments: true, members: true },
      });
      await tx.revision.create({
        data: { encounterId: encounter.id, authorUserId: userId, fromVersion: 0, toVersion: 1, summary: '创建经历', snapshot: { title: encounter.title, story: encounter.story } },
      });
      return encounter;
    });
  }

  async list(userId: string, cursor?: string) {
    const rows = await this.prisma.encounter.findMany({
      where: { members: { some: { userId } } },
      include: { _count: { select: { participants: true, assets: true } } },
      orderBy: [{ startAt: 'desc' }, { id: 'desc' }], take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return { items: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19]!.id : null };
  }

  async get(userId: string, encounterId: string) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    const encounter = await this.prisma.encounter.findUniqueOrThrow({
      where: { id: encounterId },
      include: {
        participants: { include: { person: true } }, members: { include: { user: true } },
        moments: { orderBy: { sortOrder: 'asc' } },
        assets: { orderBy: [{ sceneGroup: 'asc' }, { sortOrder: 'asc' }] },
        reflections: { where: { OR: [{ visibility: 'PARTICIPANTS' }, { authorUserId: userId }] }, include: { author: true }, orderBy: { createdAt: 'asc' } },
        comments: { include: { author: true }, orderBy: { createdAt: 'asc' } },
        layouts: { orderBy: { createdAt: 'desc' } },
      },
    });
    return encounter;
  }

  async update(userId: string, encounterId: string, input: UpdateEncounterInput) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER', 'EDITOR']);
    const { version, participantPersonIds, moments: _moments, ...changes } = input;
    const data = {
      ...changes,
      startAt: changes.startAt ? new Date(changes.startAt) : undefined,
      endAt: changes.endAt ? new Date(changes.endAt) : undefined,
      version: { increment: 1 },
    };
    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.encounter.updateMany({ where: { id: encounterId, version }, data });
      if (updated.count === 0) throw new ConflictException('Encounter was changed by another editor');
      if (participantPersonIds) {
        const self = await tx.person.findUniqueOrThrow({ where: { accountUserId: userId } });
        const ids = [...new Set([self.id, ...participantPersonIds])];
        await tx.encounterParticipant.deleteMany({ where: { encounterId, personId: { notIn: ids } } });
        for (const personId of ids) await tx.encounterParticipant.upsert({
          where: { encounterId_personId: { encounterId, personId } }, update: {}, create: { encounterId, personId },
        });
      }
      await tx.scrapbookLayout.updateMany({ where: { encounterId }, data: { stale: true } });
      await tx.revision.create({
        data: { encounterId, authorUserId: userId, fromVersion: version, toVersion: version + 1, summary: '更新经历', snapshot: changes as object },
      });
      return tx.encounter.findUniqueOrThrow({ where: { id: encounterId } });
    });
    const members = await this.prisma.encounterMember.findMany({ where: { encounterId }, select: { userId: true } });
    this.realtime.publish(members.map((member) => member.userId), { type: 'encounter.updated', encounterId, version: result.version });
    return result;
  }

  async addMoment(userId: string, encounterId: string, input: CreateMomentInput) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER', 'EDITOR']);
    return this.prisma.moment.create({ data: { encounterId, ...input, startAt: input.startAt ? new Date(input.startAt) : undefined } });
  }

  async updateMoment(userId: string, encounterId: string, momentId: string, input: UpdateMomentInput) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER', 'EDITOR']);
    const result = await this.prisma.moment.updateMany({
      where: { id: momentId, encounterId },
      data: { ...input, startAt: input.startAt ? new Date(input.startAt) : input.startAt },
    });
    if (!result.count) throw new NotFoundException('Moment not found');
    await this.prisma.scrapbookLayout.updateMany({ where: { encounterId }, data: { stale: true } });
    return this.prisma.moment.findUniqueOrThrow({ where: { id: momentId } });
  }

  async removeMoment(userId: string, encounterId: string, momentId: string) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER', 'EDITOR']);
    const result = await this.prisma.moment.deleteMany({ where: { id: momentId, encounterId } });
    if (!result.count) throw new NotFoundException('Moment not found');
    await this.prisma.scrapbookLayout.updateMany({ where: { encounterId }, data: { stale: true } });
    return { removed: true };
  }

  async addReflection(userId: string, encounterId: string, input: CreateReflectionInput) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    return this.prisma.reflection.create({ data: { encounterId, authorUserId: userId, ...input } });
  }

  async addComment(userId: string, encounterId: string, input: CreateCommentInput) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    return this.prisma.comment.create({ data: { encounterId, authorUserId: userId, body: input.body } });
  }

  async removeComment(userId: string, encounterId: string, commentId: string) {
    const member = await requireEncounterRole(this.prisma, encounterId, userId);
    const comment = await this.prisma.comment.findFirst({ where: { id: commentId, encounterId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorUserId !== userId && member.role !== 'OWNER') throw new ForbiddenException('Cannot remove another member\'s comment');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { removed: true };
  }

  async updateMember(userId: string, encounterId: string, memberUserId: string, role: 'EDITOR' | 'VIEWER') {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER']);
    const target = await this.prisma.encounterMember.findUnique({ where: { encounterId_userId: { encounterId, userId: memberUserId } } });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') throw new ForbiddenException('The owner role cannot be changed');
    return this.prisma.encounterMember.update({ where: { id: target.id }, data: { role } });
  }

  async removeMember(userId: string, encounterId: string, memberUserId: string) {
    await requireEncounterRole(this.prisma, encounterId, userId, ['OWNER']);
    const target = await this.prisma.encounterMember.findUnique({ where: { encounterId_userId: { encounterId, userId: memberUserId } } });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') throw new ForbiddenException('The owner cannot be removed');
    await this.prisma.encounterMember.delete({ where: { id: target.id } });
    return { removed: true };
  }

  async revisions(userId: string, encounterId: string, cursor?: string) {
    await requireEncounterRole(this.prisma, encounterId, userId);
    const rows = await this.prisma.revision.findMany({
      where: { encounterId }, include: { author: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    return { items: rows.slice(0, 20), nextCursor: rows.length > 20 ? rows[19]!.id : null };
  }
}
