/**
 * Governor Viability Integration Tests
 *
 * Validates that the Yuka governor brain picks the right goal
 * based on game state scenarios end-to-end.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEntity } from 'yuka';
import {
  BuildEvaluator,
  DefendEvaluator,
  GatherEvaluator,
  TrainEvaluator,
} from '@/governor/evaluators';
import { EntityKind } from '@/types';
import type { RosterBuilding, RosterGroup } from '@/ui/roster-types';
import * as store from '@/ui/store';

vi.mock('@/game', () => ({
  game: {
    world: {
      tech: {} as Record<string, boolean>,
      resources: { fish: 500, twigs: 500, pearls: 0, food: 2, maxFood: 8 },
      commanderModifiers: { passiveResearchSpeed: 0 },
    },
    syncUIStore: vi.fn(),
  },
}));

const owner = new GameEntity();

function makeGroup(
  role: 'gatherer' | 'combat',
  units: Array<{ eid: number; task: string; kind: EntityKind }>,
): RosterGroup {
  return {
    role,
    idleCount: units.filter((u) => u.task === 'idle').length,
    autoEnabled: false,
    units: units.map((u) => ({
      eid: u.eid,
      kind: u.kind,
      task: u.task as 'idle',
      targetName: '',
      hp: 30,
      maxHp: 30,
      hasOverride: false,
    })),
  };
}

function makeBuilding(eid: number, kind: EntityKind): RosterBuilding {
  return { eid, kind, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] };
}

describe('Governor viability decisions', () => {
  beforeEach(() => {
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.fish.value = 500;
    store.logs.value = 500;
    store.food.value = 2;
    store.maxFood.value = 8;
    store.baseUnderAttack.value = false;
  });

  it('with idle gatherers, GatherEvaluator scores highest', () => {
    // 4 total gatherers (2 idle, 2 busy) — enough that TrainEvaluator
    // won't prioritize gatherer production (it checks gatherers < 4).
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { eid: 1, task: 'idle', kind: EntityKind.Gatherer },
        { eid: 2, task: 'idle', kind: EntityKind.Gatherer },
        { eid: 3, task: 'gathering-fish', kind: EntityKind.Gatherer },
        { eid: 4, task: 'gathering-logs', kind: EntityKind.Gatherer },
      ]),
    ];
    store.buildingRoster.value = [
      makeBuilding(10, EntityKind.Lodge),
      makeBuilding(11, EntityKind.Armory),
    ];

    const gather = new GatherEvaluator().calculateDesirability(owner);
    const build = new BuildEvaluator().calculateDesirability(owner);
    const train = new TrainEvaluator().calculateDesirability(owner);

    expect(gather).toBeGreaterThan(build);
    expect(gather).toBeGreaterThan(train);
  });

  it('with no armory and enough resources, BuildEvaluator scores highest', () => {
    store.buildingRoster.value = [makeBuilding(10, EntityKind.Lodge)];
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { eid: 1, task: 'gathering-fish', kind: EntityKind.Gatherer },
        { eid: 2, task: 'gathering-fish', kind: EntityKind.Gatherer },
        { eid: 3, task: 'gathering-logs', kind: EntityKind.Gatherer },
        { eid: 4, task: 'gathering-logs', kind: EntityKind.Gatherer },
      ]),
    ];
    store.fish.value = 200;

    const gather = new GatherEvaluator().calculateDesirability(owner);
    const build = new BuildEvaluator().calculateDesirability(owner);

    expect(gather).toBe(0); // no idle gatherers
    expect(build).toBe(0.85); // no armory -> 0.85
    expect(build).toBeGreaterThan(gather);
  });

  it('under attack, DefendEvaluator scores highest', () => {
    store.baseUnderAttack.value = true;
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: EntityKind.Brawler }]),
      makeGroup('gatherer', [{ eid: 2, task: 'idle', kind: EntityKind.Gatherer }]),
    ];
    store.buildingRoster.value = [makeBuilding(10, EntityKind.Lodge)];

    const defend = new DefendEvaluator().calculateDesirability(owner);
    const gather = new GatherEvaluator().calculateDesirability(owner);
    const build = new BuildEvaluator().calculateDesirability(owner);

    expect(defend).toBe(0.95);
    expect(defend).toBeGreaterThan(gather);
    expect(defend).toBeGreaterThan(build);
  });
});
