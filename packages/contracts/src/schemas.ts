import { z } from 'zod';

export const EncounterKindSchema = z.enum(['PERSONAL', 'MEETING']);
export const MemberRoleSchema = z.enum(['OWNER', 'EDITOR', 'VIEWER']);
export const ReflectionVisibilitySchema = z.enum(['PRIVATE', 'PARTICIPANTS']);
export const AssetStateSchema = z.enum(['PENDING', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED']);
export const ScrapbookTemplateSchema = z.enum(['MAGAZINE', 'WOOD', 'FILM', 'COLLAGE']);
export const DecorationLevelSchema = z.enum(['RESTRAINED', 'BALANCED', 'RICH']);

const dateTime = z.string().datetime({ offset: true });

export const CreatePersonSchema = z.object({
  displayName: z.string().trim().min(1).max(80),
  nickname: z.string().trim().max(80).optional(),
  avatarUrl: z.string().url().optional(),
  relationshipSince: dateTime.optional(),
});
export const UpdatePersonSchema = CreatePersonSchema.partial();

export const CreateMomentSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().max(5000).default(''),
  locationText: z.string().trim().max(240).optional(),
  startAt: dateTime.optional(),
  sortOrder: z.number().int().min(0),
});
export const UpdateMomentSchema = CreateMomentSchema.partial();
export const UpdateMemberSchema = z.object({ role: z.enum(['EDITOR', 'VIEWER']) });

export const CreateEncounterSchema = z.object({
  kind: EncounterKindSchema,
  title: z.string().trim().min(1).max(120),
  story: z.string().max(30_000).default(''),
  locationText: z.string().trim().max(240).optional(),
  startAt: dateTime,
  endAt: dateTime.optional(),
  participantPersonIds: z.array(z.string().min(1)).max(50).default([]),
  moments: z.array(CreateMomentSchema).max(100).default([]),
});

export const UpdateEncounterSchema = CreateEncounterSchema.partial().extend({
  version: z.number().int().positive(),
});

export const CreateReflectionSchema = z.object({
  visibility: ReflectionVisibilitySchema,
  body: z.string().trim().min(1).max(30_000),
});

export const CreateCommentSchema = z.object({ body: z.string().trim().min(1).max(5000) });

export const UploadFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/heic', 'image/heif', 'image/png', 'image/webp']),
  bytes: z.number().int().positive().max(30 * 1024 * 1024),
  takenAt: dateTime.optional(),
});

export const CreateUploadBatchSchema = z.object({
  encounterId: z.string().min(1),
  files: z.array(UploadFileSchema).min(1).max(200),
});

export const GenerateScrapbookSchema = z.object({
  template: ScrapbookTemplateSchema,
  decorationLevel: DecorationLevelSchema,
  allowCloudVision: z.boolean().default(false),
});

export const CreateInvitationSchema = z.object({
  email: z.string().email(),
  encounterId: z.string().optional(),
  personId: z.string().optional(),
  role: MemberRoleSchema.default('EDITOR'),
}).refine((value) => value.encounterId || value.personId, 'encounterId or personId is required');

export type CreatePersonInput = z.infer<typeof CreatePersonSchema>;
export type UpdatePersonInput = z.infer<typeof UpdatePersonSchema>;
export type CreateMomentInput = z.infer<typeof CreateMomentSchema>;
export type UpdateMomentInput = z.infer<typeof UpdateMomentSchema>;
export type CreateEncounterInput = z.infer<typeof CreateEncounterSchema>;
export type UpdateEncounterInput = z.infer<typeof UpdateEncounterSchema>;
export type CreateReflectionInput = z.infer<typeof CreateReflectionSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type CreateUploadBatchInput = z.infer<typeof CreateUploadBatchSchema>;
export type GenerateScrapbookInput = z.infer<typeof GenerateScrapbookSchema>;
export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;
