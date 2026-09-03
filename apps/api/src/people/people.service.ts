import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePersonInput, EncounterSummary, PersonSummary, UpdatePersonInput } from '@togetherly/contracts';
import { PrismaService } from '../common/prisma.service.js';

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreatePersonInput) {
    return this.prisma.$transaction(async (tx) => {
      const person = await tx.person.create({
        data: { createdByUserId: userId, displayName: input.displayName, avatarUrl: input.avatarUrl },
      });
      const link = await tx.friendLink.create({
        data: {
          ownerUserId: userId,
          personId: person.id,
          nickname: input.nickname,
          relationshipSince: input.relationshipSince ? new Date(input.relationshipSince) : undefined,
        },
      });
      return { ...person, nickname: link.nickname, relationshipSince: link.relationshipSince };
    });
  }

  async list(userId: string): Promise<PersonSummary[]> {
    const links = await this.prisma.friendLink.findMany({
      where: { ownerUserId: userId, person: { mergedIntoPersonId: null } },
      include: { person: true }, orderBy: { updatedAt: 'desc' },
    });
    return Promise.all(links.map(async ({ person, nickname }) => {
      const encounters = await this.findSharedEncounters(userId, person.id);
      return {
        id: person.id,
        displayName: person.displayName,
        nickname,
        avatarUrl: person.avatarUrl,
        linked: Boolean(person.accountUserId),
        encounterCount: encounters.length,
        firstEncounterAt: encounters.at(-1)?.startAt.toISOString() ?? null,
        lastEncounterAt: encounters[0]?.startAt.toISOString() ?? null,
      };
    }));
  }

  async update(userId: string, personId: string, input: UpdatePersonInput) {
    const link = await this.prisma.friendLink.findUnique({ where: { ownerUserId_personId: { ownerUserId: userId, personId } } });
    if (!link) throw new NotFoundException('Friend not found');
    return this.prisma.$transaction(async (tx) => {
      if (input.displayName !== undefined || input.avatarUrl !== undefined) await tx.person.update({
        where: { id: personId }, data: { displayName: input.displayName, avatarUrl: input.avatarUrl },
      });
      return tx.friendLink.update({
        where: { ownerUserId_personId: { ownerUserId: userId, personId } },
        data: {
          nickname: input.nickname,
          relationshipSince: input.relationshipSince ? new Date(input.relationshipSince) : input.relationshipSince,
        },
        include: { person: true },
      });
    });
  }

  async remove(userId: string, personId: string) {
    const result = await this.prisma.friendLink.deleteMany({ where: { ownerUserId: userId, personId } });
    if (!result.count) throw new NotFoundException('Friend not found');
    return { removed: true };
  }

  async get(userId: string, personId: string) {
    const link = await this.prisma.friendLink.findUnique({
      where: { ownerUserId_personId: { ownerUserId: userId, personId } }, include: { person: true },
    });
    if (!link) throw new NotFoundException('Friend not found');
    const encounters = await this.findSharedEncounters(userId, personId);
    return {
      id: link.person.id,
      displayName: link.person.displayName,
      nickname: link.nickname,
      avatarUrl: link.person.avatarUrl,
      linked: Boolean(link.person.accountUserId),
      relationshipSince: link.relationshipSince,
      encounterCount: encounters.length,
      firstEncounterAt: encounters.at(-1)?.startAt ?? null,
      lastEncounterAt: encounters[0]?.startAt ?? null,
    };
  }

  async timeline(userId: string, personId: string, cursor?: string, year?: number) {
    await this.get(userId, personId);
    const self = await this.prisma.person.findUniqueOrThrow({ where: { accountUserId: userId } });
    const start = year ? new Date(`${year}-01-01T00:00:00.000Z`) : undefined;
    const end = year ? new Date(`${year + 1}-01-01T00:00:00.000Z`) : undefined;
    const rows = await this.prisma.encounter.findMany({
      where: {
        members: { some: { userId } },
        AND: [
          { participants: { some: { personId: self.id } } },
          { participants: { some: { personId } } },
          ...(year ? [{ startAt: { gte: start, lt: end } }] : []),
        ],
      },
      include: { _count: { select: { participants: true, assets: true } }, assets: { where: { id: { not: '' } }, take: 1, orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ startAt: 'desc' }, { id: 'desc' }],
      take: 21,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const items = rows.slice(0, 20).map((row) => this.toSummary(row));
    return { items, nextCursor: rows.length > 20 ? rows[19]!.id : null };
  }

  async calendar(userId: string, personId: string, year: number) {
    const page = await this.timeline(userId, personId, undefined, year);
    const days = new Map<string, { count: number; encounterIds: string[] }>();
    for (const item of page.items) {
      const day = item.startAt.slice(0, 10);
      const current = days.get(day) ?? { count: 0, encounterIds: [] };
      current.count += 1;
      current.encounterIds.push(item.id);
      days.set(day, current);
    }
    return Array.from(days, ([date, value]) => ({ date, ...value }));
  }

  private async findSharedEncounters(userId: string, personId: string) {
    const self = await this.prisma.person.findUniqueOrThrow({ where: { accountUserId: userId } });
    return this.prisma.encounter.findMany({
      where: {
        members: { some: { userId } },
        AND: [
          { participants: { some: { personId: self.id } } },
          { participants: { some: { personId } } },
        ],
      },
      select: { startAt: true }, orderBy: { startAt: 'desc' },
    });
  }

  private toSummary(row: any): EncounterSummary {
    return {
      id: row.id, kind: row.kind, title: row.title, story: row.story,
      locationText: row.locationText, startAt: row.startAt.toISOString(),
      endAt: row.endAt?.toISOString() ?? null, version: row.version,
      coverUrl: null, participantCount: row._count.participants, photoCount: row._count.assets,
    };
  }
}
