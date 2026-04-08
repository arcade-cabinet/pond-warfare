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
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
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
  role: 'generalist' | 'combat' | 'support' | 'recon' | 'commander',
  units: Array<{ eid: number; task: string; kind: EntityKind; hasOverride?: boolean }>,
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
    store.buildingRoster.value = [];
    store.baseUnderAttack.value = false;
    store.baseThreatCount.value = 0;
    store.waveCountdown.value = -1;
    store.fish.value = 200;
    store.logs.value = 200;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 1;
  });

  it('returns 0 when no idle Mudpaws', () => {
    store.unitRoster.value = [
      makeGroup('generalist', [{ eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND }]),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns high score when idle Mudpaws exist', () => {
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'idle', kind: MUDPAW_KIND },
        { eid: 2, task: 'idle', kind: MUDPAW_KIND },
      ]),
    ];
    const score = evaluator.calculateDesirability(dummyOwner);
    expect(score).toBeGreaterThan(0.7);
    expect(score).toBeLessThanOrEqual(1.0);
  });

  it('backs off idle-gather desirability when a proactive tower window is ready', () => {
    storeV3.progressionLevel.value = 6;
    store.fish.value = 240;
    store.logs.value = 280;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [{ eid: 1, task: 'idle', kind: MUDPAW_KIND }]),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.44);
  });

  it('retasks active Mudpaws for the first tower budget even when none are idle', () => {
    storeV3.progressionLevel.value = 6;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-rocks', kind: MUDPAW_KIND },
        { eid: 2, task: 'gathering-fish', kind: MUDPAW_KIND },
      ]),
    ];
    store.fish.value = 80;
    store.logs.value = 70;
    store.rocks.value = 0;

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.89);
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
    store.baseThreatCount.value = 0;
    storeV3.progressionLevel.value = 1;
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

  it('requests a proactive tower after a completed armory on stage 6', () => {
    storeV3.progressionLevel.value = 6;
    store.fish.value = 240;
    store.logs.value = 280;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.79);
  });

  it('prioritizes an affordable proactive tower over generic defend pressure when the savings window is safe', () => {
    storeV3.progressionLevel.value = 6;
    store.waveCountdown.value = 24;
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 2;
    store.fish.value = 260;
    store.logs.value = 320;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND },
        { eid: 2, task: 'gathering-logs', kind: MUDPAW_KIND },
      ]),
      makeGroup('combat', Array.from({ length: 3 }, (_, i) => ({
        eid: i + 20,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.91);
  });

  it('keeps the first stage-six tower ahead of a pop-cap burrow', () => {
    storeV3.progressionLevel.value = 6;
    store.waveCountdown.value = 24;
    store.fish.value = 260;
    store.logs.value = 320;
    store.food.value = 7;
    store.maxFood.value = 8;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.91);
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
    store.baseThreatCount.value = 0;
    storeV3.progressionLevel.value = 1;
  });

  it('returns 0 when idle Mudpaws exist (Gather goal takes priority)', () => {
    store.unitRoster.value = [
      makeGroup('generalist', [{ eid: 1, task: 'idle', kind: MUDPAW_KIND }]),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns high score when no Mudpaws are fielded yet', () => {
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
      makeGroup('generalist', Array.from({ length: 4 }, (_, i) => ({
        eid: i + 1,
        task: 'gathering-fish',
        kind: MUDPAW_KIND,
      }))),
      makeGroup('combat', Array.from({ length: 3 }, (_, i) => ({
        eid: i + 20,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.42);
  });

  it('opens stage-6 combat training once the first Mudpaw is online', () => {
    storeV3.progressionLevel.value = 6;
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND },
      ]),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.75);
  });

  it('keeps stage-6 Mudpaw training active until the first proactive tower has two gatherers', () => {
    storeV3.progressionLevel.value = 6;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND },
      ]),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.8);
  });

  it('starts saving for the first proactive tower once stage 6 has two Mudpaws and a combat floor', () => {
    storeV3.progressionLevel.value = 6;
    store.waveCountdown.value = 24;
    store.fish.value = 40;
    store.logs.value = 60;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND },
        { eid: 2, task: 'gathering-logs', kind: MUDPAW_KIND },
      ]),
      makeGroup('combat', Array.from({ length: 3 }, (_, i) => ({
        eid: i + 20,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.18);
  });

  it('backs off training to preserve a near-complete proactive tower budget', () => {
    storeV3.progressionLevel.value = 6;
    store.waveCountdown.value = 24;
    store.fish.value = 170;
    store.logs.value = 210;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-logs', kind: MUDPAW_KIND },
        { eid: 2, task: 'gathering-fish', kind: MUDPAW_KIND },
      ]),
      makeGroup('combat', Array.from({ length: 4 }, (_, i) => ({
        eid: i + 20,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.18);
  });

  it('treats two combat units as enough to start saving for the first proactive tower', () => {
    storeV3.progressionLevel.value = 6;
    store.waveCountdown.value = 24;
    store.fish.value = 170;
    store.logs.value = 210;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [
        { eid: 1, task: 'gathering-logs', kind: MUDPAW_KIND },
        { eid: 2, task: 'gathering-fish', kind: MUDPAW_KIND },
      ]),
      makeGroup('combat', Array.from({ length: 2 }, (_, i) => ({
        eid: i + 20,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.18);
  });

  it('keeps stage-6 combat training active under light single-enemy pressure', () => {
    storeV3.progressionLevel.value = 6;
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 1;
      store.unitRoster.value = [
      makeGroup('generalist', [{ eid: 1, task: 'gathering-fish', kind: MUDPAW_KIND }]),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.75);
  });
});

describe('DefendEvaluator', () => {
  const evaluator = new DefendEvaluator();

  it('returns 0.95 under severe base pressure', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 3;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.95);
  });

  it('backs off defend under light pressure so training can continue', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 1;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 980, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: SAPPER_KIND }]),
    ];
    storeV3.progressionLevel.value = 6;

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.72);
  });

  it('yields light pressure once a healthy attack reserve exists', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 1;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.unitRoster.value = [
      makeGroup('combat', Array.from({ length: 5 }, (_, i) => ({
        eid: i + 1,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];
    storeV3.progressionLevel.value = 6;

    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0.54);
  });

  it('returns 0 when base is safe', () => {
    store.baseUnderAttack.value = false;
    store.baseThreatCount.value = 0;
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });
});

describe('AttackEvaluator', () => {
  const evaluator = new AttackEvaluator();

  beforeEach(() => {
    store.baseUnderAttack.value = false;
    store.baseThreatCount.value = 0;
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.waveCountdown.value = -1;
    store.fish.value = 500;
  });

  it('returns 0 when army too small', () => {
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: SAPPER_KIND }]),
    ];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns high score with large army', () => {
    const units = Array.from({ length: 8 }, (_, i) => ({
      eid: i + 1,
      task: 'idle',
      kind: SAPPER_KIND,
    }));
    store.unitRoster.value = [makeGroup('combat', units)];
    expect(evaluator.calculateDesirability(dummyOwner)).toBeGreaterThan(0.6);
  });

  it('returns 0 when combat units exist but none are reassignable for attack', () => {
    const units = Array.from({ length: 6 }, (_, i) => ({
      eid: i + 1,
      task: 'moving',
      kind: SAPPER_KIND,
    }));
    store.unitRoster.value = [makeGroup('combat', units)];
    expect(evaluator.calculateDesirability(dummyOwner)).toBe(0);
  });

  it('returns 0 when a new wave is imminent or the lodge is damaged', () => {
    const units = Array.from({ length: 8 }, (_, i) => ({
      eid: i + 1,
      task: 'idle',
      kind: SAPPER_KIND,
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

  it('opens a light-pressure skirmish window when reserve army exists', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 1;
    store.waveCountdown.value = 24;
    store.fish.value = 180;
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.unitRoster.value = [
      makeGroup('combat', Array.from({ length: 4 }, (_, i) => ({
        eid: i + 1,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
    ];

    expect(evaluator.calculateDesirability(dummyOwner)).toBeGreaterThan(0.7);
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
        kind: SAPPER_KIND,
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
    store.baseThreatCount.value = 0;
  });

  it('picks defend when base under attack', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 3;
    store.unitRoster.value = [
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: SAPPER_KIND }]),
    ];
    governor.brain.arbitrate();
    expect(governor.brain.subgoals.length).toBe(1);
  });

  it('can pick attack through light pressure when the army reserve is healthy', () => {
    store.baseUnderAttack.value = true;
    store.baseThreatCount.value = 1;
    store.waveCountdown.value = 24;
    store.fish.value = 180;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    storeV3.progressionLevel.value = 6;
    store.unitRoster.value = [
      makeGroup('combat', Array.from({ length: 4 }, (_, i) => ({
        eid: i + 1,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
      makeGroup('generalist', [{ eid: 20, task: 'gathering-fish', kind: MUDPAW_KIND }]),
    ];

    governor.brain.arbitrate();
    expect(governor.brain.subgoals).toHaveLength(1);
    expect(governor.brain.subgoals[0]?.constructor.name).toBe('AttackGoal');
  });

  it('prefers attack over idle-gather assignment when a safe opening window is already live', () => {
    store.baseUnderAttack.value = false;
    store.baseThreatCount.value = 0;
    store.waveCountdown.value = 24;
    store.fish.value = 180;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    storeV3.progressionLevel.value = 6;
    store.unitRoster.value = [
      makeGroup('combat', Array.from({ length: 3 }, (_, i) => ({
        eid: i + 1,
        task: 'idle',
        kind: SAPPER_KIND,
      }))),
      makeGroup('generalist', [{ eid: 20, task: 'idle', kind: MUDPAW_KIND }]),
    ];

    governor.brain.arbitrate();
    expect(governor.brain.subgoals).toHaveLength(1);
    expect(governor.brain.subgoals[0]?.constructor.name).toBe('AttackGoal');
  });

  it('prefers a proactive tower build over idle gathering once the window is ready', () => {
    store.baseUnderAttack.value = false;
    store.baseThreatCount.value = 0;
    store.waveCountdown.value = 24;
    store.fish.value = 240;
    store.logs.value = 280;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;
    store.buildingRoster.value = [
      makeBuilding(1, EntityKind.Lodge),
      makeBuilding(2, EntityKind.Armory),
    ];
    store.unitRoster.value = [
      makeGroup('generalist', [{ eid: 20, task: 'idle', kind: MUDPAW_KIND }]),
      makeGroup('combat', [{ eid: 1, task: 'idle', kind: SAPPER_KIND }]),
    ];

    governor.brain.arbitrate();
    expect(governor.brain.subgoals).toHaveLength(1);
    expect(governor.brain.subgoals[0]?.constructor.name).toBe('BuildGoal');
  });

  it('does not tick when disabled', () => {
    governor.enabled = false;
    store.unitRoster.value = [
      makeGroup('generalist', [{ eid: 1, task: 'idle', kind: MUDPAW_KIND }]),
    ];
    governor.tick();
    expect(governor.brain.subgoals.length).toBe(0);
  });
});
