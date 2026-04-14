/**
 * Governor Viability Integration Tests
 *
 * Validates that the Yuka governor brain picks the right goal
 * based on game state scenarios end-to-end.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEntity } from 'yuka';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import {
  BuildEvaluator,
  DefendEvaluator,
  GatherEvaluator,
  TrainEvaluator,
} from '@/governor/evaluators';
import { EntityKind } from '@/types';
import type { RosterBuilding, RosterGroup } from '@/ui/roster-types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';

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
  role: 'generalist' | 'combat',
  units: Array<{ eid: number; task: string; kind: EntityKind }>,
): RosterGroup {
  return {
    role,
    idleCount: units.filter((u) => u.task === 'idle').length,
    automationEnabled: false,
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
    store.baseThreatCount.value = 0;
    storeV3.progressionLevel.value = 1;
  });

  it('with idle Mudpaws, GatherEvaluator scores highest', () => {
    // 4 total Mudpaws (2 idle, 2 busy) — enough that TrainEvaluator
    // will focus on assignment rather than more early generalists.
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'idle', kind: MUDPAW_KIND },
        { eid: 2, task: 'idle', kind: MUDPAW_KIND },
        { eid: 3, task: 'gathering-fish', kind: MUDPAW_KIND },
        { eid: 4, task: 'gathering-logs', kind: MUDPAW_KIND },
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
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND },
        { eid: 2, task: 'gathering-fish', kind: MUDPAW_KIND },
        { eid: 3, task: 'gathering-logs', kind: MUDPAW_KIND },
        { eid: 4, task: 'gathering-logs', kind: MUDPAW_KIND },
      ]),
    ];
    store.fish.value = 200;

    const gather = new GatherEvaluator().calculateDesirability(owner);
    const build = new BuildEvaluator().calculateDesirability(owner);

    expect(gather).toBe(0); // no idle Mudpaws
    expect(build).toBe(0.85); // no armory -> 0.85
    expect(build).toBeGreaterThan(gather);
  });

  it('under attack, DefendEvaluator scores highest', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 3;
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: SAPPER_KIND }]),
      makeGroup('generalist', [{ eid: 2, task: 'idle', kind: MUDPAW_KIND }]),
    ];
    store.buildingRoster.value = [makeBuilding(10, EntityKind.Lodge)];

    const defend = new DefendEvaluator().calculateDesirability(owner);
    const gather = new GatherEvaluator().calculateDesirability(owner);
    const build = new BuildEvaluator().calculateDesirability(owner);

    expect(defend).toBe(0.95);
    expect(defend).toBeGreaterThan(gather);
    expect(defend).toBeGreaterThan(build);
  });

  it('light single-enemy pressure still leaves TrainEvaluator above DefendEvaluator', () => {
    storeV3.progressionLevel.value = 6;
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 1;
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: SAPPER_KIND }]),
      makeGroup('generalist', [{ eid: 2, task: 'gathering-fish', kind: MUDPAW_KIND }]),
    ];
    store.buildingRoster.value = [
      {
        eid: 10,
        kind: EntityKind.Lodge,
        hp: 980,
        maxHp: 1000,
        queueItems: [],
        queueProgress: 0,
        canTrain: [],
      },
    ];

    const defend = new DefendEvaluator().calculateDesirability(owner);
    const train = new TrainEvaluator().calculateDesirability(owner);

    expect(defend).toBe(0.76);
    expect(train).toBe(0.8);
    expect(train).toBeGreaterThan(defend);
  });
});
