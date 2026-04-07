// @vitest-environment jsdom
/**
 * Tests: Radial Entity Roles (extracted from radial-menu-options)
 *
 * Validates entityKindToRole mapping works from both:
 * - Direct import from radial-entity-roles.ts
 * - Re-export from radial-menu-options.ts (backward compat)
 */

import { describe, expect, it } from 'vitest';
import { EntityKind } from '@/types';
import { entityKindToRole } from '@/ui/radial-entity-roles';
import { entityKindToRole as reExported } from '@/ui/radial-menu-options';

describe('entityKindToRole (direct import)', () => {
  it('maps Mudpaw chassis to generalist', () => {
    expect(entityKindToRole(EntityKind.Gatherer)).toBe('generalist');
  });

  it('maps Sapper to combat', () => {
    expect(entityKindToRole(EntityKind.Sapper)).toBe('combat');
  });

  it('maps Medic chassis to heal', () => {
    expect(entityKindToRole(EntityKind.Healer)).toBe('heal');
  });

  it('maps Lookout chassis to scout', () => {
    expect(entityKindToRole(EntityKind.Scout)).toBe('scout');
  });

  it('maps Shaman to heal', () => {
    expect(entityKindToRole(EntityKind.Shaman)).toBe('heal');
  });

  it('maps Commander to combat', () => {
    expect(entityKindToRole(EntityKind.Commander)).toBe('combat');
  });

  it('maps Saboteur to combat', () => {
    expect(entityKindToRole(EntityKind.Saboteur)).toBe('combat');
  });

  it('maps unknown kinds to combat (default)', () => {
    expect(entityKindToRole(999)).toBe('combat');
  });
});

describe('entityKindToRole (re-export backward compat)', () => {
  it('re-exported function is the same as direct import', () => {
    expect(reExported).toBe(entityKindToRole);
  });

  it('maps correctly via re-export', () => {
    expect(reExported(EntityKind.Gatherer)).toBe('generalist');
    expect(reExported(EntityKind.Healer)).toBe('heal');
    expect(reExported(EntityKind.Scout)).toBe('scout');
    expect(reExported(EntityKind.Sapper)).toBe('combat');
  });
});
