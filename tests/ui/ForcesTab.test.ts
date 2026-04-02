/**
 * ForcesTab Tests
 *
 * Validates the Forces tab renders groups from the unitRoster signal,
 * highlights idle units, and shows a placeholder when roster is empty.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityKind } from '@/types';
import type { RosterGroup } from '@/ui/roster-types';
import * as store from '@/ui/store';

// Mock entity-defs so we don't pull in the full config tree
vi.mock('@/config/entity-defs', () => ({
  entityKindName: (kind: number) => {
    const names: Record<number, string> = {
      0: 'Gatherer',
      1: 'Brawler',
      12: 'Healer',
      16: 'Scout',
      30: 'Commander',
    };
    return names[kind] ?? 'Unit';
  },
  ENTITY_DEFS: {},
}));

vi.mock('@/ui/tooltip-helpers', () => ({
  showTooltip: vi.fn(),
  hideTooltip: vi.fn(),
}));

vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

function makeGroup(
  role: RosterGroup['role'],
  units: Array<{ kind: EntityKind; task: string; idle?: boolean; hp?: number }>,
): RosterGroup {
  return {
    role,
    units: units.map((u, i) => ({
      eid: 100 + i,
      kind: u.kind,
      task: (u.idle ? 'idle' : u.task) as any,
      targetName: '',
      hp: u.hp ?? 80,
      maxHp: 100,
      hasOverride: false,
    })),
    idleCount: units.filter((u) => u.idle).length,
    autoEnabled: false,
  };
}

beforeEach(() => {
  store.unitRoster.value = [];
  store.autoGathererEnabled.value = false;
  store.autoCombatEnabled.value = false;
  store.autoHealerEnabled.value = false;
  store.autoScoutEnabled.value = false;
});

afterEach(() => {
  cleanup();
});

// Lazy import after mocks are in place
const { ForcesTab } = await import('@/ui/panel/ForcesTab');

describe('ForcesTab', () => {
  it('shows "No units" message when roster is empty', () => {
    store.unitRoster.value = [];
    render(h(ForcesTab, {}));
    const el = document.querySelector('[data-testid="no-units"]');
    expect(el).toBeTruthy();
    expect(el?.textContent).toContain('No units');
  });

  it('renders a group for each roster entry', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [{ kind: EntityKind.Gatherer, task: 'gathering-clams' }]),
      makeGroup('combat', [{ kind: EntityKind.Brawler, task: 'patrolling' }]),
    ];
    render(h(ForcesTab, {}));
    const groups = document.querySelectorAll('[data-testid="forces-group"]');
    expect(groups.length).toBe(2);
  });

  it('does not show "No units" when groups exist', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [{ kind: EntityKind.Gatherer, task: 'idle', idle: true }]),
    ];
    render(h(ForcesTab, {}));
    expect(document.querySelector('[data-testid="no-units"]')).toBeNull();
  });

  it('highlights idle units with warning background', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { kind: EntityKind.Gatherer, task: 'idle', idle: true },
        { kind: EntityKind.Gatherer, task: 'gathering-clams' },
      ]),
    ];
    render(h(ForcesTab, {}));
    const rows = document.querySelectorAll('[data-testid="force-unit-row"]');
    expect(rows.length).toBe(2);
    // The idle row should have the warning background tint
    const idleRow = rows[0] as HTMLElement;
    expect(idleRow.style.background).toContain('pw-warning');
  });

  it('shows idle badge on group header', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { kind: EntityKind.Gatherer, task: 'idle', idle: true },
        { kind: EntityKind.Gatherer, task: 'gathering-clams' },
      ]),
    ];
    render(h(ForcesTab, {}));
    const badge = document.querySelector('[data-testid="idle-badge"]');
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toContain('1 idle');
  });
});
