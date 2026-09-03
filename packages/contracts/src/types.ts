import type { z } from 'zod';
import type {
  AssetStateSchema,
  DecorationLevelSchema,
  EncounterKindSchema,
  MemberRoleSchema,
  ReflectionVisibilitySchema,
  ScrapbookTemplateSchema,
} from './schemas.js';

export type EncounterKind = z.infer<typeof EncounterKindSchema>;
export type MemberRole = z.infer<typeof MemberRoleSchema>;
export type ReflectionVisibility = z.infer<typeof ReflectionVisibilitySchema>;
export type AssetState = z.infer<typeof AssetStateSchema>;
export type ScrapbookTemplate = z.infer<typeof ScrapbookTemplateSchema>;
export type DecorationLevel = z.infer<typeof DecorationLevelSchema>;
export type TogetherIdeaStatus = 'IDEA' | 'PLANNING' | 'DONE';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PersonSummary {
  id: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  linked: boolean;
  encounterCount: number;
  firstEncounterAt: string | null;
  lastEncounterAt: string | null;
}

export interface EncounterSummary {
  id: string;
  kind: EncounterKind;
  title: string;
  story: string;
  locationText: string | null;
  startAt: string;
  endAt: string | null;
  version: number;
  coverUrl: string | null;
  participantCount: number;
  photoCount: number;
  photoUrls?: string[];
  participantNames?: string[];
}

export interface TogetherIdea {
  id: string;
  personId: string;
  personName: string;
  personAvatarUrl: string | null;
  content: string;
  status: TogetherIdeaStatus;
  proposedBy: string;
  plannedAt: string | null;
  locationText: string | null;
  note: string | null;
  encounterId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ScrapbookBlock =
  | { id: string; type: 'photo'; assetId: string; span: 1 | 2; rotation: number; caption?: string }
  | { id: string; type: 'text'; text: string; variant: 'story' | 'date' | 'location' }
  | { id: string; type: 'sticker'; token: string };

export interface ScrapbookPage {
  id: string;
  background: string;
  columns: 1 | 2;
  blocks: ScrapbookBlock[];
}

export interface ScrapbookDocument {
  version: 1;
  template: ScrapbookTemplate;
  decorationLevel: DecorationLevel;
  sourceText: string;
  pages: ScrapbookPage[];
}

export interface PhotoAnalysis {
  sha256: string;
  perceptualHash: string;
  width: number;
  height: number;
  sharpness: number;
  exposure: number;
  takenAt: string | null;
  sceneGroup: number;
  recommended: boolean;
}
