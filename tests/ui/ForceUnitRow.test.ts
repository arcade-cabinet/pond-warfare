/**
 * ForceUnitRow Tests
 *
 * Validates the unit row renders name and task, HP bar color changes
 * by percentage, and tapping the name calls onSelect.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntityKind } from '@/types';
import type { RosterUnit } from '@/ui/roster-types';

vi.mock('@/config/entity-defs', () => ({
  entityKindName: (kind: number) => {
    const names: Record<number, string> = {
      0: 'Gatherer',
      1: 'Brawler',
      12: 'Healer',
    };
    return names[kind] ?? 'Unit';
  },
  ENTITY_DEFS: {
    1: {
      hp: 60,
      speed: 1.8,
      damage: 6,
      attackRange: 40,
      isBuilding: false,
      isResource: false,
      spriteSize: 16,
      spriteScale: 2.5,
    },
  },
}));

vi.mock('@/ui/tooltip-helpers', () => ({
  showTooltip: vi.fn(),
  hideTooltip: vi.fn(),
}));

vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

const clearTaskOverrideMock = vi.fn();
vi.mock('@/game/resource-finder', () => ({
  clearTaskOverride: (...args: unknown[]) => clearTaskOverrideMock(...args),
}));

afterEach(() => {
  cleanup();
});

function makeUnit(overrides?: Partial<RosterUnit>): RosterUnit {
  return {
    eid: 42,
    kind: EntityKind.Brawler,
    task: 'patrolling',
    targetName: '',
    hp: 80,
    maxHp: 100,
    hasOverride: false,
    ...overrides,
  };
}

const { ForceUnitRow } = await import('@/ui/panel/ForceUnitRow');

describe('ForceUnitRow', () => {
  it('renders unit kind name and current task pill', () => {
    const unit = makeUnit({ kind: EntityKind.Brawler, task: 'patrolling' });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    const nameBtn = document.querySelector('[data-testid="unit-name-btn"]');
    expect(nameBtn).toBeTruthy();
    expect(nameBtn?.textContent).toContain('Brawler');
    const pill = document.querySelector('[data-testid="task-pill"]');
    expect(pill).toBeTruthy();
    expect(pill?.textContent).toContain('Patrol');
  });

  it('HP bar is green when HP > 50%', () => {
    const unit = makeUnit({ hp: 80, maxHp: 100 });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    const bar = document.querySelector('[data-testid="hp-bar"]') as HTMLElement;
    expect(bar).toBeTruthy();
    expect(bar.style.background).toContain('pw-success');
  });

  it('HP bar is yellow when HP between 25% and 50%', () => {
    const unit = makeUnit({ hp: 30, maxHp: 100 });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    const bar = document.querySelector('[data-testid="hp-bar"]') as HTMLElement;
    expect(bar.style.background).toContain('pw-warning');
  });

  it('HP bar is red when HP <= 25%', () => {
    const unit = makeUnit({ hp: 20, maxHp: 100 });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    const bar = document.querySelector('[data-testid="hp-bar"]') as HTMLElement;
    expect(bar.style.background).toContain('pw-enemy-light');
  });

  it('tapping name calls onSelect with the entity ID', () => {
    const onSelect = vi.fn();
    const unit = makeUnit({ eid: 99 });
    render(h(ForceUnitRow, { unit, onSelect, onTaskChange: vi.fn() }));
    const nameBtn = document.querySelector('[data-testid="unit-name-btn"]') as HTMLElement;
    nameBtn.click();
    expect(onSelect).toHaveBeenCalledWith(99);
  });

  it('unpin button renders only when hasOverride is true', () => {
    const unit = makeUnit({ hasOverride: false });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    expect(document.querySelector('[data-testid="unpin-btn"]')).toBeNull();

    cleanup();

    const overridden = makeUnit({ hasOverride: true });
    render(h(ForceUnitRow, { unit: overridden, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    expect(document.querySelector('[data-testid="unpin-btn"]')).toBeTruthy();
  });

  it('unpin button does not render for non-overridden unit', () => {
    const unit = makeUnit({ hasOverride: false });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    expect(document.querySelector('[data-testid="unpin-btn"]')).toBeNull();
  });

  it('tapping unpin calls clearTaskOverride with the entity ID', () => {
    clearTaskOverrideMock.mockClear();
    const unit = makeUnit({ eid: 77, hasOverride: true });
    render(h(ForceUnitRow, { unit, onSelect: vi.fn(), onTaskChange: vi.fn() }));
    const btn = document.querySelector('[data-testid="unpin-btn"]') as HTMLElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(clearTaskOverrideMock).toHaveBeenCalledWith(77);
  });
});
