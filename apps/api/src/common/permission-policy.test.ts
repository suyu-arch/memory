import { describe, expect, it } from 'vitest';
import { canEditEncounter, canManageMembers, canReadReflection } from './permission-policy.js';

describe('encounter permission policy', () => {
  it('keeps membership management owner-only', () => {
    expect(canManageMembers('OWNER')).toBe(true);
    expect(canManageMembers('EDITOR')).toBe(false);
    expect(canManageMembers('VIEWER')).toBe(false);
  });

  it('lets editors edit but viewers only read', () => {
    expect(canEditEncounter('EDITOR')).toBe(true);
    expect(canEditEncounter('VIEWER')).toBe(false);
  });

  it('never reveals a private reflection to another member or owner', () => {
    expect(canReadReflection('PRIVATE', 'author', 'owner')).toBe(false);
    expect(canReadReflection('PRIVATE', 'author', 'author')).toBe(true);
    expect(canReadReflection('PARTICIPANTS', 'author', 'viewer')).toBe(true);
  });
});
