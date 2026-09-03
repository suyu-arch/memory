import type { MemberRole, ReflectionVisibility } from '@prisma/client';

export const canEditEncounter = (role: MemberRole) => role === 'OWNER' || role === 'EDITOR';
export const canManageMembers = (role: MemberRole) => role === 'OWNER';
export const canReadReflection = (
  visibility: ReflectionVisibility,
  authorUserId: string,
  viewerUserId: string,
) => visibility === 'PARTICIPANTS' || authorUserId === viewerUserId;
