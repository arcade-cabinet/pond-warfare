/**
 * Governor Tests — Evaluator scoring and brain arbitration.
 *
 * Validates that evaluators return correct desirability scores based on
 * store signals, and that the brain picks the highest-scoring goal.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GameEntity } from 'yuka';
import {
  AttackEvaluator,
  BuildEvaluator,
  DefendEvaluator,
  GatherEvaluator,
  TrainEvaluator,
} from '@/governor/evaluators';
import { Governor } from '@/governor/governor';
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

/** Dummy owner for evaluator calls (evaluators read from store, not owner). */
const dummyOwner = new GameEntity();

function makeGroup(
  role: 'gatherer' | 'combat' | 'support' | 'scout' | 'commander',
  units: Array<{ eid: number; task: string; kind: EntityKind; hasOverride?: boolean }>,
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
      hasOverride: u.hasOverride ?? false,
    })),
  };
}

function makeBuilding(eid: number, kind: EntityKind): RosterBuilding {
  return { eid, kind, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] };
}

describe('GatherEvaluator', () => {
  const evaluator = new GatherEvaluator();

  beforeEach(() => {
    store.unitRoster.value = [];
  });

  it('returns 0 when no idle gatherers', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [{ eid: 1, task: 'gathering-fish', kind: EntityKind.Gatherer }]),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns high score when idle gatherers exist', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { eid: 1, task: 'idle', kind: EntityKind.Gatherer },
        { eid: 2, task: 'idle', kind: EntityKind.Gatherer },
      ]),
    ];
    const score = evaluator.calculateDesirability(dummyOwner);
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThanOrEqual(1.0);
  });
});

describe('BuildEvaluator', () => {
  const evaluator = new BuildEvaluator();

  beforeEach(() => {
    store.buildingRoster.value = [];
    store.fish.value = 500;
    store.logs.value = 500;
    store.food.value = 2;
    store.maxFood.value = 8;
    store.baseUnderAttack.value = false;
  });

  it('returns high score when no armory exists', () => {
    store.buildingRoster.value = [makeBuilding(1, EntityKind.Lodge)];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.85);
  });

  it('returns 0 when all buildings present and not at pop cap', () => {
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });
});

describe('TrainEvaluator', () => {
  const evaluator = new TrainEvaluator();

  beforeEach(() => {
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.fish.value = 200;
    store.food.value = 2;
    store.maxFood.value = 8;
    store.waveCountdown.value = -1;
    storeV3.progressionLevel.value = 1;
  });

  it('returns 0 when idle gatherers exist (Gather goal takes priority)', () => {
    store.unitRoster.value = [
      makeGroup('gatherer', [{ eid: 1, task: 'idle', kind: EntityKind.Gatherer }]),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns high score when no gatherers at all', () => {
    store.unitRoster.value = [];
    store.fish.value = 50;
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.8);
  });

  it('returns 0 at population cap', () => {
    store.food.value = 8;
    store.maxFood.value = 8;
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('backs off training when a healthy early attack window is already open', () => {
    store.waveCountdown.value = 24;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.unitRoster.value = [
      makeGroup('gatherer', Array.from({ length: 4 }, (_, i) => ({
        eid: i + 1,
        task: 'gathering-fish',
        kind: EntityKind.Gatherer,
      }))),
      makeGroup('combat', Array.from({ length: 3 }, (_, i) => ({
        eid: i + 20,
        task: 'idle',
        kind: EntityKind.Brawler,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.42);
  });

  it('opens stage-6 combat training once the first gatherer is online', () => {
    storeV3.progressionLevel.value = 6;
    store.unitRoster.value = [
      makeGroup('gatherer', [
        { eid: 1, task: 'gathering-fish', kind: EntityKind.Gatherer },
      ]),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.75);
  });
});

describe('DefendEvaluator', () => {
  const evaluator = new DefendEvaluator();

  it('returns 0.95 when base under attack', () => {
    store.baseUnderAttack.value = true;
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.95);
  });

  it('returns 0 when base is safe', () => {
    store.baseUnderAttack.value = false;
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });
});

describe('AttackEvaluator', () => {
  const evaluator = new AttackEvaluator();

  beforeEach(() => {
    store.baseUnderAttack.value = false;
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.waveCountdown.value = -1;
    store.fish.value = 500;
  });

  it('returns 0 when army too small', () => {
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: EntityKind.Brawler }]),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns high score with large army', () => {
    const units = Array.from({ length: 8 }, (_, i) => ({
      eid: i + 1,
      task: 'idle',
      kind: EntityKind.Brawler,
    }));
    store.unitRoster.value = [makeGroup('combat', units)];
    expect(evaluator.calculateDesirability(dummyOwner)).toBeGreaterThan(0.6);
  });

  it('returns 0 when combat units exist but none are reassignable for attack', () => {
    const units = Array.from({ length: 6 }, (_, i) => ({
      eid: i + 1,
      task: 'moving',
      kind: EntityKind.Brawler,
    }));
    store.unitRoster.value = [makeGroup('combat', units)];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns 0 when a new wave is imminent or the lodge is damaged', () => {
    const units = Array.from({ length: 8 }, (_, i) => ({
      eid: i + 1,
      task: 'idle',
      kind: EntityKind.Brawler,
    }));
    store.unitRoster.value = [makeGroup('combat', units)];
    store.waveCountdown.value = 8;
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);

    store.waveCountdown.value = -1;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 700, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('opens an earlier attack window with 3 ready units when the lodge is healthy and the next wave is far away', () => {
    store.waveCountdown.value = 24;
    store.fish.value = 180;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.unitRoster.value = [
      makeGroup('combat', Array.from({ length: 3 }, (_, i) => ({
        eid: i + 1,
        task: 'idle',
        kind: EntityKind.Brawler,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBeGreaterThan(0.7);
  });
});

describe('Governor brain arbitration', () => {
  let governor: Governor;

  beforeEach(() => {
    governor = new Governor();
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.fish.value = 500;
    store.logs.value = 500;
    store.food.value = 2;
    store.maxFood.value = 8;
    store.baseUnderAttack.value = false;
  });

  it('picks defend when base under attack', () => {
    store.baseUnderAttack.value = true;
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: EntityKind.Brawler }]),
    ];
    governor.brain.arbitrate();
    expect(governor.brain.subgoals.length).toBe(1);
  });

  it('does not tick when disabled', () => {
    governor.enabled = false;
    store.unitRoster.value = [
      makeGroup('gatherer', [{ eid: 1, task: 'idle', kind: EntityKind.Gatherer }]),
    ];
    governor.tick();
    expect(governor.brain.subgoals.length).toBe(0);
  });
});
