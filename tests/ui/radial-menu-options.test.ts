// @vitest-environment jsdom
/**
 * Tests: Radial Menu Options (v3.0 — US9)
 *
 * Validates:
 * - Lodge radial shows all training options
 * - Unit radial shows role-specific actions
 * - Each option has required fields (id, label, icon, tooltip, color)
 * - entityKindToRole maps correctly
 * - Options filter based on unit role
 */

import { describe, expect, it } from 'vitest';
import { EntityKind } from '@/types';
import { entityKindToRole, getRadialOptions, type RadialOption } from '@/ui/radial-menu-options';

function assertValidOption(opt: RadialOption): void {
  expect(opt.id).toBeTruthy();
  expect(opt.label).toBeTruthy();
  expect(opt.icon).toBeTruthy();
  expect(opt.tooltip).toBeTruthy();
  expect(opt.color).toBeTruthy();
}

describe('getRadialOptions — Lodge mode', () => {
  const options = getRadialOptions('lodge', null);

  it('returns all canonical Lodge options', () => {
    expect(options).toHaveLength(6);
  });

  it('includes training options for the canonical manual roster', () => {
    const ids = options.map((o) => o.id);
    expect(ids).toContain('train_mudpaw');
    expect(ids).toContain('train_medic');
    expect(ids).toContain('train_sapper');
    expect(ids).toContain('train_saboteur');
  });

  it('includes fortify and repair', () => {
    const ids = options.map((o) => o.id);
    expect(ids).toContain('fortify');
    expect(ids).toContain('repair');
  });

  it('all options have valid fields', () => {
    for (const opt of options) {
      assertValidOption(opt);
    }
  });
});

describe('getRadialOptions — Unit mode (gather)', () => {
  const options = getRadialOptions('unit', 'gather');

  it('returns gather-specific options', () => {
    const ids = options.map((o) => o.id);
    expect(ids).toContain('cmd_gather');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_patrol');
    expect(ids).toContain('cmd_return');
  });

  it('does NOT include attack or heal commands', () => {
    const ids = options.map((o) => o.id);
    expect(ids).not.toContain('cmd_attack');
    expect(ids).not.toContain('cmd_heal');
  });

  it('all options have valid fields', () => {
    for (const opt of options) {
      assertValidOption(opt);
    }
  });
});

describe('getRadialOptions — Unit mode (combat)', () => {
  const options = getRadialOptions('unit', 'combat');

  it('returns combat-specific options', () => {
    const ids = options.map((o) => o.id);
    expect(ids).toContain('cmd_attack');
    expect(ids).toContain('cmd_amove');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_stance');
  });

  it('does NOT include gather or heal commands', () => {
    const ids = options.map((o) => o.id);
    expect(ids).not.toContain('cmd_gather');
    expect(ids).not.toContain('cmd_heal');
  });
});

describe('getRadialOptions — Unit mode (heal)', () => {
  const options = getRadialOptions('unit', 'heal');

  it('returns heal-specific options', () => {
    const ids = options.map((o) => o.id);
    expect(ids).toContain('cmd_heal');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_return');
  });

  it('does NOT include attack or gather commands', () => {
    const ids = options.map((o) => o.id);
    expect(ids).not.toContain('cmd_attack');
    expect(ids).not.toContain('cmd_gather');
  });
});

describe('getRadialOptions — Unit mode (scout)', () => {
  const options = getRadialOptions('unit', 'scout');

  it('returns scout-specific options', () => {
    const ids = options.map((o) => o.id);
    expect(ids).toContain('cmd_scout');
    expect(ids).toContain('cmd_hold');
    expect(ids).toContain('cmd_patrol');
  });
});

describe('getRadialOptions — unknown role', () => {
  it('returns generic options for unknown role', () => {
    const options = getRadialOptions('unit', 'unknown_role');
    const ids = options.map((o) => o.id);
    expect(ids).toContain('cmd_move');
    expect(ids).toContain('cmd_hold');
  });
});

describe('entityKindToRole', () => {
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

  it('maps unknown kinds to combat (default)', () => {
    expect(entityKindToRole(999)).toBe('combat');
  });
});
