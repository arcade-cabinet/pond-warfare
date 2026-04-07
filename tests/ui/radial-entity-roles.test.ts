// @vitest-environment jsdom
/**
 * Tests: Radial Entity Roles (extracted from radial-menu-options)
 *
 * Validates entityKindToRole mapping works from both:
 * - Direct import from radial-entity-roles.ts
 * - Re-export from radial-menu-options.ts (backward compat)
 */

import { describe, expect, it } from 'vitest';
import { entityKindToRole } from '@/ui/radial-entity-roles';
import { entityKindToRole as reExported } from '@/ui/radial-menu-options';

describe('entityKindToRole (direct import)', () => {
  it('maps Gatherer (0) to generalist', () => {
    expect(entityKindToRole(0)).toBe('generalist');
  });

  it('maps Brawler (1) to combat', () => {
    expect(entityKindToRole(1)).toBe('combat');
  });

  it('maps Healer (12) to heal', () => {
    expect(entityKindToRole(12)).toBe('heal');
  });

  it('maps Scout (16) to scout', () => {
    expect(entityKindToRole(16)).toBe('scout');
  });

  it('maps Shaman (35) to heal', () => {
    expect(entityKindToRole(35)).toBe('heal');
  });

  it('maps Commander (30) to combat', () => {
    expect(entityKindToRole(30)).toBe('combat');
  });

  it('maps Sapper (44) to combat', () => {
    expect(entityKindToRole(44)).toBe('combat');
  });

  it('maps Saboteur (45) to combat', () => {
    expect(entityKindToRole(45)).toBe('combat');
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
    expect(reExported(0)).toBe('generalist');
    expect(reExported(12)).toBe('heal');
    expect(reExported(16)).toBe('scout');
    expect(reExported(1)).toBe('combat');
  });
});
