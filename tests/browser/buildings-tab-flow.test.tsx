/** Buildings Tab Flow -- roster rendering, selection, train, cancel, progress. */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityKind } from '@/types';
import type { RosterBuilding } from '@/ui/roster-types';
import * as store from '@/ui/store';

const selectBuildingMock = vi.fn();
const trainMock = vi.fn();
const cancelTrainMock = vi.fn();

vi.mock('@/config/entity-defs', () => ({
  entityKindName: (kind: number) => {
    const names: Record<number, string> = {
      [5]: 'Lodge',
      [7]: 'Armory',
      [8]: 'Tower',
      [18]: 'Wall',
      [1]: 'Brawler',
      [2]: 'Sniper',
    };
    return names[kind] ?? 'Building';
  },
  ENTITY_DEFS: {
    [1]: { clamCost: 50, twigCost: 20, foodCost: 1 },
    [2]: { clamCost: 80, twigCost: 30, foodCost: 1 },
  },
}));

vi.mock('@/game/panel-actions', () => ({
  selectBuilding: (...args: unknown[]) => selectBuildingMock(...args),
}));

vi.mock('@/input/selection', () => ({
  train: (...args: unknown[]) => trainMock(...args),
  cancelTrain: (...args: unknown[]) => cancelTrainMock(...args),
}));

vi.mock('@/game', () => ({
  game: { world: {}, syncUIStore: vi.fn() },
}));

vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

function makeBuilding(
  overrides: Partial<RosterBuilding> & { eid: number; kind: EntityKind },
): RosterBuilding {
  return {
    hp: 200,
    maxHp: 200,
    queueItems: [],
    queueProgress: 0,
    canTrain: [],
    ...overrides,
  };
}

const { BuildingsTab } = await import('@/ui/panel/BuildingsTab');
const { BuildingRow } = await import('@/ui/panel/BuildingRow');

beforeEach(() => {
  store.buildingRoster.value = [];
  selectBuildingMock.mockClear();
  trainMock.mockClear();
  cancelTrainMock.mockClear();
});

afterEach(() => cleanup());

describe('Buildings Tab flow', () => {
  it('renders buildings sorted — Lodge first, then production, then defensive', () => {
    store.buildingRoster.value = [
      makeBuilding({ eid: 3, kind: EntityKind.Wall }),
      makeBuilding({ eid: 1, kind: EntityKind.Armory }),
      makeBuilding({ eid: 2, kind: EntityKind.Lodge }),
    ];
    render(h(BuildingsTab, {}));

    const names = Array.from(
      document.querySelectorAll('[data-testid="building-name-btn"]'),
    ).map((el) => el.textContent?.trim());
    expect(names).toEqual(['Lodge', 'Armory', 'Wall']);
  });

  it('clicking building name calls selectBuilding', () => {
    store.buildingRoster.value = [
      makeBuilding({ eid: 42, kind: EntityKind.Lodge }),
    ];
    render(h(BuildingsTab, {}));

    const btn = document.querySelector('[data-testid="building-name-btn"]') as HTMLElement;
    btn.click();
    expect(selectBuildingMock).toHaveBeenCalledWith(42);
  });

  it('train flow: click +Train, pick unit, dispatches train', () => {
    store.buildingRoster.value = [
      makeBuilding({
        eid: 10,
        kind: EntityKind.Armory,
        canTrain: [EntityKind.Brawler, EntityKind.Sniper],
      }),
    ];
    render(h(BuildingsTab, {}));

    const trainBtn = document.querySelector('[data-testid="train-btn"]') as HTMLElement;
    expect(trainBtn).toBeTruthy();
    fireEvent.click(trainBtn);

    const picker = document.querySelector('[data-testid="train-picker"]');
    expect(picker).toBeTruthy();

    const options = document.querySelectorAll('[data-testid="train-option"]');
    expect(options.length).toBe(2);
    fireEvent.click(options[0]); // pick Brawler

    expect(trainMock).toHaveBeenCalledWith(expect.anything(), 10, EntityKind.Brawler, 50, 20, 1);
  });

  it('queue cancel: click X dispatches cancelTrain with correct index', () => {
    const onCancelTrain = vi.fn();
    const building = makeBuilding({
      eid: 55,
      kind: EntityKind.Armory,
      queueItems: ['Brawler', 'Sniper'],
      queueProgress: 40,
      canTrain: [EntityKind.Brawler],
    });
    render(h(BuildingRow, { building, onSelect: vi.fn(), onTrain: vi.fn(), onCancelTrain }));

    const cancelBtns = document.querySelectorAll('[data-testid="queue-cancel-btn"]');
    expect(cancelBtns.length).toBe(2);
    fireEvent.click(cancelBtns[1]);
    expect(onCancelTrain).toHaveBeenCalledWith(55, 1);
  });

  it('active training item shows progress percentage', () => {
    store.buildingRoster.value = [
      makeBuilding({
        eid: 20,
        kind: EntityKind.Armory,
        queueItems: ['Brawler'],
        queueProgress: 75,
        canTrain: [EntityKind.Brawler],
      }),
    ];
    render(h(BuildingsTab, {}));

    const item = document.querySelector('[data-testid="queue-item"]');
    expect(item).toBeTruthy();
    expect(item?.textContent).toContain('75%');
    expect(item?.textContent).toContain('Training: Brawler');
  });

  it('shows empty state when roster is empty', () => {
    store.buildingRoster.value = [];
    render(h(BuildingsTab, {}));

    const empty = document.querySelector('[data-testid="buildings-empty"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('No buildings');
    expect(document.querySelector('[data-testid="buildings-tab"]')).toBeNull();
  });
});
