import { describe, expect, it } from 'vitest';
import { CreateEncounterSchema, CreateTogetherIdeaSchema, CreateUploadBatchSchema, UpdateTogetherIdeaSchema } from './schemas.js';

describe('shared contracts', () => {
  it('accepts a meeting with multiple participants', () => {
    const result = CreateEncounterSchema.safeParse({
      kind: 'MEETING', title: '一起吃饭', story: '原话保持不变',
      startAt: '2026-08-24T18:00:00+08:00', participantPersonIds: ['p1', 'p2'], moments: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects more than 200 files', () => {
    const files = Array.from({ length: 201 }, (_, index) => ({
      filename: `${index}.jpg`, mimeType: 'image/jpeg', bytes: 100,
    }));
    expect(CreateUploadBatchSchema.safeParse({ encounterId: 'e1', files }).success).toBe(false);
  });

  it('keeps a together idea lightweight while allowing optional plans', () => {
    expect(CreateTogetherIdeaSchema.safeParse({ personId: 'p1', content: '去吃云南菜' }).success).toBe(true);
    expect(CreateTogetherIdeaSchema.safeParse({ personId: 'p1', content: '' }).success).toBe(false);
    expect(UpdateTogetherIdeaSchema.safeParse({ status: 'PLANNING', plannedAt: null }).success).toBe(true);
  });
});
