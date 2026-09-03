import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser, CreateTogetherIdeaInput, TogetherIdea, UpdateTogetherIdeaInput } from '@togetherly/contracts';
import { PrismaService } from '../common/prisma.service.js';
import { RealtimeService } from '../common/realtime.service.js';

const ideaInclude = {
  person: true,
  owner: { include: { person: true } },
  createdBy: true,
} as const;

@Injectable()
export class TogetherIdeasService {
  constructor(private readonly prisma: PrismaService, private readonly realtime: RealtimeService) {}

  async list(userId: string, personId?: string): Promise<TogetherIdea[]> {
    const access = [{ ownerUserId: userId }, { person: { accountUserId: userId } }];
    const rows = await this.prisma.togetherIdea.findMany({
      where: personId ? {
        OR: [
          { ownerUserId: userId, personId },
          { person: { accountUserId: userId }, owner: { person: { id: personId } } },
        ],
      } : { OR: access },
      include: ideaInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => this.toView(row, userId));
  }

  async create(user: AuthUser, input: CreateTogetherIdeaInput): Promise<TogetherIdea> {
    const link = await this.prisma.friendLink.findUnique({
      where: { ownerUserId_personId: { ownerUserId: user.id, personId: input.personId } },
    });
    if (!link) throw new NotFoundException('Friend not found');
    const row = await this.prisma.togetherIdea.create({
      data: {
        ownerUserId: user.id,
        createdByUserId: user.id,
        personId: input.personId,
        content: input.content,
        plannedAt: input.plannedAt ? new Date(input.plannedAt) : undefined,
        locationText: input.locationText,
        note: input.note,
        status: input.plannedAt || input.locationText ? 'PLANNING' : 'IDEA',
      },
      include: ideaInclude,
    });
    this.publish(row, user.id);
    return this.toView(row, user.id);
  }

  async update(userId: string, ideaId: string, input: UpdateTogetherIdeaInput): Promise<TogetherIdea> {
    const existing = await this.requireEditor(userId, ideaId);
    if (input.encounterId) {
      const membership = await this.prisma.encounterMember.findUnique({ where: { encounterId_userId: { encounterId: input.encounterId, userId } } });
      if (!membership) throw new ForbiddenException('Cannot connect this encounter');
    }
    const row = await this.prisma.togetherIdea.update({
      where: { id: ideaId },
      data: {
        content: input.content,
        status: input.status,
        plannedAt: input.plannedAt === undefined ? undefined : input.plannedAt ? new Date(input.plannedAt) : null,
        locationText: input.locationText,
        note: input.note,
        encounterId: input.encounterId,
        version: { increment: 1 },
      },
      include: ideaInclude,
    });
    this.publish(row, userId, existing.ownerUserId);
    return this.toView(row, userId);
  }

  async remove(userId: string, ideaId: string) {
    const existing = await this.requireEditor(userId, ideaId);
    await this.prisma.togetherIdea.delete({ where: { id: ideaId } });
    this.publish(existing, userId, existing.ownerUserId);
    return { removed: true };
  }

  private async requireEditor(userId: string, ideaId: string) {
    const idea = await this.prisma.togetherIdea.findUnique({ where: { id: ideaId }, include: ideaInclude });
    if (!idea) throw new NotFoundException('Idea not found');
    if (idea.ownerUserId !== userId && idea.person.accountUserId !== userId) throw new ForbiddenException('Cannot edit this idea');
    return idea;
  }

  private toView(row: any, userId: string): TogetherIdea {
    const counterpart = row.ownerUserId === userId ? row.person : row.owner.person;
    return {
      id: row.id,
      personId: counterpart?.id ?? row.personId,
      personName: counterpart?.displayName ?? '朋友',
      personAvatarUrl: counterpart?.avatarUrl ?? null,
      content: row.content,
      status: row.status,
      proposedBy: row.createdByUserId === userId ? '我' : row.createdBy.displayName,
      plannedAt: row.plannedAt?.toISOString() ?? null,
      locationText: row.locationText,
      note: row.note,
      encounterId: row.encounterId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private publish(row: any, actorUserId: string, ownerUserId = row.ownerUserId) {
    const friendUserId = row.person?.accountUserId as string | null | undefined;
    const recipients = [ownerUserId, friendUserId].filter((id): id is string => Boolean(id && id !== actorUserId));
    this.realtime.publish(recipients, { type: 'together-idea.updated', ideaId: row.id });
  }
}
