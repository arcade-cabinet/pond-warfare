/**
 * BuildingRow Tests
 *
 * Tests that a building row renders its name, HP, training progress,
 * and conditionally shows the [+ Train] button for production buildings.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntityKind } from '@/types';
import { BuildingRow } from '@/ui/panel/BuildingRow';
import type { RosterBuilding } from '@/ui/roster-types';

function makeBuilding(overrides: Partial<RosterBuilding>): RosterBuilding {
  return {
    eid: 1,
    kind: EntityKind.Lodge,
    hp: 200,
    maxHp: 200,
    queueItems: [],
    queueProgress: 0,
    canTrain: [],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('BuildingRow', () => {
  it('renders building name and HP', () => {
    const building = makeBuilding({ kind: EntityKind.Lodge, hp: 150, maxHp: 200 });
    render(h(BuildingRow, { building, onSelect: vi.fn(), onTrain: vi.fn() }));

    const nameBtn = document.querySelector('[data-testid="building-name-btn"]');
    expect(nameBtn?.textContent).toBe('Lodge');

    const hpText = document.querySelector('.font-numbers');
    expect(hpText?.textContent).toContain('150/200');
  });

  it('shows training progress when building is training', () => {
    const building = makeBuilding({
      kind: EntityKind.Armory,
      queueItems: ['Brawler', 'Sniper'],
      queueProgress: 55,
      canTrain: [EntityKind.Brawler, EntityKind.Sniper],
    });
    render(h(BuildingRow, { building, onSelect: vi.fn(), onTrain: vi.fn() }));

    const queueManager = document.querySelector('[data-testid="queue-manager"]');
    expect(queueManager).toBeTruthy();
    const items = document.querySelectorAll('[data-testid="queue-item"]');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Brawler');
    expect(items[0].textContent).toContain('55%');
  });

  it('shows [+ Train] button only for production buildings', () => {
    const production = makeBuilding({
      kind: EntityKind.Armory,
      canTrain: [EntityKind.Brawler],
    });
    render(h(BuildingRow, { building: production, onSelect: vi.fn(), onTrain: vi.fn() }));
    expect(document.querySelector('[data-testid="train-btn"]')).toBeTruthy();

    cleanup();

    const defensive = makeBuilding({ kind: EntityKind.Tower, canTrain: [] });
    render(h(BuildingRow, { building: defensive, onSelect: vi.fn(), onTrain: vi.fn() }));
    expect(document.querySelector('[data-testid="train-btn"]')).toBeNull();
  });

  it('calls onSelect when building name is clicked', () => {
    const onSelect = vi.fn();
    const building = makeBuilding({ eid: 42, kind: EntityKind.Lodge });
    render(h(BuildingRow, { building, onSelect, onTrain: vi.fn() }));

    const nameBtn = document.querySelector('[data-testid="building-name-btn"]') as HTMLElement;
    nameBtn?.click();
    expect(onSelect).toHaveBeenCalledWith(42);
  });
});
