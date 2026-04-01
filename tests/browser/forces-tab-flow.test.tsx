/** Forces Tab Flow -- full E2E: roster, selection, task change, unpin, auto-toggle, idle style. */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityKind } from '@/types';
import type { RosterGroup } from '@/ui/roster-types';
import * as store from '@/ui/store';

// --- Mocks ---

vi.mock('@/config/entity-defs', () => ({
  entityKindName: (kind: number) => {
    const names: Record<number, string> = {
      [0]: 'Gatherer', [1]: 'Brawler', [12]: 'Healer', [16]: 'Scout',
    };
    return names[kind] ?? 'Unit';
  },
}));

vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

const mockSelectEntity = vi.fn();
vi.mock('@/game/panel-actions', () => ({ selectEntity: (...a: unknown[]) => mockSelectEntity(...a) }));

const mockDispatchTaskOverride = vi.fn();
vi.mock('@/game/task-dispatch', () => ({
  dispatchTaskOverride: (...a: unknown[]) => mockDispatchTaskOverride(...a),
}));

const mockClearTaskOverride = vi.fn();
vi.mock('@/game/resource-finder', () => ({
  clearTaskOverride: (...a: unknown[]) => mockClearTaskOverride(...a),
}));

vi.mock('@/ui/game-actions', () => ({
  toggleAutoBehavior: vi.fn(),
}));

vi.mock('@/game', () => ({ game: { world: {}, smoothPanTo: vi.fn(), syncUIStore: vi.fn() } }));

function makeGroup(
  role: RosterGroup['role'],
  units: Array<{ kind: EntityKind; task: string; idle?: boolean; hasOverride?: boolean }>,
  autoEnabled = false,
): RosterGroup {
  return {
    role,
    units: units.map((u, i) => ({
      eid: 200 + i,
      kind: u.kind,
      task: (u.idle ? 'idle' : u.task) as any,
      targetName: '',
      hp: 80,
      maxHp: 100,
      hasOverride: u.hasOverride ?? false,
    })),
    idleCount: units.filter((u) => u.idle).length,
    autoEnabled,
  };
}

const { ForcesTab } = await import('@/ui/panel/ForcesTab');
const { AutoToggle } = await import('@/ui/components/AutoToggle');

beforeEach(() => {
  store.unitRoster.value = [];
  store.autoGathererEnabled.value = false;
  store.autoCombatEnabled.value = false;
  store.autoHealerEnabled.value = false;
  store.autoScoutEnabled.value = false;
  mockSelectEntity.mockClear();
  mockDispatchTaskOverride.mockClear();
  mockClearTaskOverride.mockClear();
});

afterEach(() => cleanup());

describe('Forces Tab flow', () => {
  it('renders groups with correct unit counts', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { kind: EntityKind.Gatherer, task: 'idle', idle: true },
        { kind: EntityKind.Gatherer, task: 'gathering-clams' },
      ]),
      makeGroup('combat', [{ kind: EntityKind.Brawler, task: 'patrolling' }]),
    ];
    render(h(ForcesTab, {}));
    expect(document.querySelectorAll('[data-testid="forces-group"]').length).toBe(2);
    expect(document.querySelectorAll('[data-testid="force-unit-row"]').length).toBe(3);
  });

  it('clicking unit name calls selectEntity with correct eid', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [{ kind: EntityKind.Gatherer, task: 'gathering-clams' }]),
    ];
    render(h(ForcesTab, {}));
    const btn = document.querySelector('[data-testid="unit-name-btn"]') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(mockSelectEntity).toHaveBeenCalledWith(200);
  });

  it('opening task picker and selecting a task calls dispatchTaskOverride', async () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [{ kind: EntityKind.Gatherer, task: 'idle', idle: true }]),
    ];
    render(h(ForcesTab, {}));
    const pill = document.querySelector('[data-testid="task-pill"]') as HTMLButtonElement;
    fireEvent.click(pill);
    const options = document.querySelectorAll('[data-testid="task-dropdown"] button');
    expect(options.length).toBeGreaterThan(1);
    // Pick "Gather Clams" (second option for Gatherer: idle, gathering-clams, ...)
    fireEvent.click(options[1]);
    expect(mockDispatchTaskOverride).toHaveBeenCalledWith(expect.anything(), 200, 'gathering-clams');
  });

  it('unpin button renders for override units and calls clearTaskOverride', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { kind: EntityKind.Gatherer, task: 'gathering-clams', hasOverride: true },
      ]),
    ];
    render(h(ForcesTab, {}));
    const unpin = document.querySelector('[data-testid="unpin-btn"]') as HTMLButtonElement;
    expect(unpin).toBeTruthy();
    fireEvent.click(unpin);
    expect(mockClearTaskOverride).toHaveBeenCalledWith(200);
  });

  it('AutoToggle component fires onToggle callback when clicked', () => {
    const onToggle = vi.fn();
    render(h(AutoToggle, {
      label: 'Auto',
      enabled: false,
      color: 'var(--pw-warning)',
      onToggle,
    }));
    const btn = document.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain('Auto');
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalled();
  });

  it('idle units have distinct amber background styling', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { kind: EntityKind.Gatherer, task: 'idle', idle: true },
        { kind: EntityKind.Gatherer, task: 'gathering-clams' },
      ]),
    ];
    render(h(ForcesTab, {}));
    const rows = document.querySelectorAll('[data-testid="force-unit-row"]');
    const idleRow = rows[0] as HTMLElement;
    const busyRow = rows[1] as HTMLElement;
    expect(idleRow.style.background).toContain('pw-warning');
    expect(busyRow.style.background).toBe('transparent');
  });

  it('shows empty state when no units exist', () => {
    store.unitRoster.value = [];
    render(h(ForcesTab, {}));
    const empty = document.querySelector('[data-testid="no-units"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('No units');
  });
});
