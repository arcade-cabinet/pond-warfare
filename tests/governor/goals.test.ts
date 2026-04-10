/**
 * Goal Execution Tests
 *
 * Validates that gather and train goals interact with the game through the
 * same APIs the UI uses.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Goal } from 'yuka';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  TaskOverride,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND, SAPPER_KIND, SABOTEUR_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';
import type { RosterBuilding, RosterGroup, RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';

let world: GameWorld;

vi.mock('@/game', () => ({
  game: {
    get world() {
      return world;
    },
    syncUIStore: vi.fn(),
  },
}));

function createUnit(kind: EntityKind, x = 100, y = 100): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, TaskOverride);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = UnitState.Idle;
  TaskOverride.active[eid] = 0;
  TaskOverride.task[eid] = 0;
  TaskOverride.targetEntity[eid] = 0;
  return eid;
}

function createResource(kind: EntityKind, resType: ResourceType, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, EntityTypeTag);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Resource.resourceType[eid] = resType;
  Resource.amount[eid] = 500;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

function rosterUnit(
  eid: number,
  kind: EntityKind,
  task: string,
  hp: number = 30,
  maxHp: number = 30,
): RosterUnit {
  return { eid, kind, task: task as 'idle', targetName: '', hp, maxHp, hasOverride: false };
}

function rosterGroup(role: RosterGroup['role'], units: RosterUnit[]): RosterGroup {
  return {
    role,
    idleCount: units.filter((u) => u.task === 'idle').length,
    automationEnabled: false,
    units,
  };
}

describe('GatherGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.baseUnderAttack.value = false;
    store.fish.value = 0;
    store.logs.value = 0;
    store.rocks.value = 0;
    store.food.value = 0;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 1;
  });

  it('assigns idle Mudpaws to resource tasks', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');
    const { dispatchTaskOverride } = await import('@/game/task-dispatch');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    createResource(EntityKind.Clambed, ResourceType.Fish, 120, 110);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.fish.value = 100;
    store.logs.value = 200;
    store.rocks.value = 0;

    const goal = new GatherGoal();
    goal.activate();
    expect(goal.status).toBe(Goal.STATUS.COMPLETED);

    dispatchTaskOverride(world, eid1, 'gathering-fish');
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(TaskOverride.active[eid1]).toBe(1);
  });

  it('falls back to an available resource when the lowest-stockpiled one is absent', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const fishNode = createResource(EntityKind.Clambed, ResourceType.Fish, 120, 110);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.fish.value = 100;
    store.logs.value = 0;
    store.rocks.value = 0;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(fishNode);
    expect(TaskOverride.active[eid1]).toBe(1);
  });

  it('prefers a nearby available resource over a distant low-stockpile target', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const farLogs = createResource(EntityKind.Cattail, ResourceType.Logs, 1200, 1200);
    const nearFish = createResource(EntityKind.Clambed, ResourceType.Fish, 150, 120);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
      { eid: 100, kind: EntityKind.Armory, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.fish.value = 200;
    store.logs.value = 0;
    store.rocks.value = 0;
    storeV3.progressionLevel.value = 1;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(nearFish);
    expect(UnitStateMachine.targetEntity[eid1]).not.toBe(farLogs);
  });

  it('accepts a longer march when logs are the next armory bottleneck', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const farLogs = createResource(EntityKind.Cattail, ResourceType.Logs, 1200, 1200);
    createResource(EntityKind.Clambed, ResourceType.Fish, 150, 120);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.fish.value = 200;
    store.logs.value = 0;
    store.rocks.value = 0;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(farLogs);
  });

  it('accepts a farther low-stockpile node when gather radius is upgraded', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const farLogs = createResource(EntityKind.Cattail, ResourceType.Logs, 560, 100);
    const nearFish = createResource(EntityKind.Clambed, ResourceType.Fish, 150, 120);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
      { eid: 100, kind: EntityKind.Armory, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.fish.value = 200;
    store.logs.value = 0;
    store.rocks.value = 0;
    world.playerGatherRadiusMultiplier = 1.1;
    storeV3.currentRunPurchasedNodeIds.value = ['economy_gather_radius_t0'];

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(farLogs);
    expect(UnitStateMachine.targetEntity[eid1]).not.toBe(nearFish);
  });

  it('focuses logs when the missing armory is still log-gated', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const logNode = createResource(EntityKind.Cattail, ResourceType.Logs, 130, 110);
    createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.fish.value = 220;
    store.logs.value = 40;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(logNode);
  });

  it('keeps both Mudpaws on logs when the missing armory is much more log-gated than fish-gated', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const eid2 = createUnit(MUDPAW_KIND, 115, 105);
    const logNodeA = createResource(EntityKind.Cattail, ResourceType.Logs, 130, 110);
    const logNodeB = createResource(EntityKind.Cattail, ResourceType.Logs, 145, 125);
    createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);

    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(eid1, MUDPAW_KIND, 'idle'),
        rosterUnit(eid2, MUDPAW_KIND, 'idle'),
      ]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.fish.value = 120;
    store.logs.value = 30;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect([logNodeA, logNodeB]).toContain(UnitStateMachine.targetEntity[eid1]);
    expect([logNodeA, logNodeB]).toContain(UnitStateMachine.targetEntity[eid2]);
  });

  it('keeps multiple idle Mudpaws on logs when the first tower is still log-gated', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const eid2 = createUnit(MUDPAW_KIND, 115, 105);
    const logNodeA = createResource(EntityKind.Cattail, ResourceType.Logs, 130, 110);
    const logNodeB = createResource(EntityKind.Cattail, ResourceType.Logs, 145, 125);
    createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);

    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(eid1, MUDPAW_KIND, 'idle'),
        rosterUnit(eid2, MUDPAW_KIND, 'idle'),
      ]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
      { eid: 100, kind: EntityKind.Armory, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.baseUnderAttack.value = false;
    store.fish.value = 260;
    store.logs.value = 80;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.state[eid2]).toBe(UnitState.GatherMove);
    expect([logNodeA, logNodeB]).toContain(UnitStateMachine.targetEntity[eid1]);
    expect([logNodeA, logNodeB]).toContain(UnitStateMachine.targetEntity[eid2]);
  });

  it('splits idle Mudpaws across fish and logs when the first tower needs both budgets', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const eid2 = createUnit(MUDPAW_KIND, 115, 105);
    const fishNode = createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);
    const logNode = createResource(EntityKind.Cattail, ResourceType.Logs, 145, 125);

    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(eid1, MUDPAW_KIND, 'idle'),
        rosterUnit(eid2, MUDPAW_KIND, 'idle'),
      ]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
      { eid: 100, kind: EntityKind.Armory, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.baseUnderAttack.value = false;
    store.fish.value = 80;
    store.logs.value = 70;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.state[eid2]).toBe(UnitState.GatherMove);
    expect([fishNode, logNode]).toContain(UnitStateMachine.targetEntity[eid1]);
    expect([fishNode, logNode]).toContain(UnitStateMachine.targetEntity[eid2]);
    expect(UnitStateMachine.targetEntity[eid1]).not.toBe(UnitStateMachine.targetEntity[eid2]);
  });

  it('keeps extra idle Mudpaws on fish or logs instead of rocks during a dual-short tower budget', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const eid2 = createUnit(MUDPAW_KIND, 115, 105);
    const eid3 = createUnit(MUDPAW_KIND, 130, 110);
    const fishNode = createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);
    const logNode = createResource(EntityKind.Cattail, ResourceType.Logs, 145, 125);
    const rockNode = createResource(EntityKind.PearlBed, ResourceType.Rocks, 160, 140);

    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(eid1, MUDPAW_KIND, 'idle'),
        rosterUnit(eid2, MUDPAW_KIND, 'idle'),
        rosterUnit(eid3, MUDPAW_KIND, 'idle'),
      ]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
      { eid: 100, kind: EntityKind.Armory, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.baseUnderAttack.value = false;
    store.fish.value = 40;
    store.logs.value = 80;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    const targets = [
      UnitStateMachine.targetEntity[eid1],
      UnitStateMachine.targetEntity[eid2],
      UnitStateMachine.targetEntity[eid3],
    ];

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(targets).toContain(fishNode);
    expect(targets).toContain(logNode);
    expect(targets).not.toContain(rockNode);
    expect(targets.filter((target) => target === fishNode)).toHaveLength(2);
  });

  it('retasks already-gathering Mudpaws away from rocks for the first tower budget', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const eid2 = createUnit(MUDPAW_KIND, 115, 105);
    const fishNode = createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);
    const logNode = createResource(EntityKind.Cattail, ResourceType.Logs, 145, 125);
    const rockNode = createResource(EntityKind.PearlBed, ResourceType.Rocks, 160, 140);

    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(eid1, MUDPAW_KIND, 'gathering-rocks'),
        rosterUnit(eid2, MUDPAW_KIND, 'gathering-fish'),
      ]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
      { eid: 100, kind: EntityKind.Armory, hp: 500, maxHp: 500, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.baseUnderAttack.value = false;
    store.fish.value = 80;
    store.logs.value = 70;
    store.rocks.value = 0;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;

    const goal = new GatherGoal();
    goal.activate();

    const targets = [UnitStateMachine.targetEntity[eid1], UnitStateMachine.targetEntity[eid2]];

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(targets).toContain(fishNode);
    expect(targets).toContain(logNode);
    expect(targets).not.toContain(rockNode);
  });

  it('focuses logs for the first wall budget on stage six before pressure lands', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(MUDPAW_KIND, 100, 100);
    const logNode = createResource(EntityKind.Cattail, ResourceType.Logs, 130, 110);
    createResource(EntityKind.Clambed, ResourceType.Fish, 120, 115);

    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(eid1, MUDPAW_KIND, 'idle')]),
    ];
    store.buildingRoster.value = [
      { eid: 99, kind: EntityKind.Lodge, hp: 1000, maxHp: 1000, queueItems: [], queueProgress: 0, canTrain: [] },
    ];
    store.fish.value = 120;
    store.logs.value = 0;
    store.rocks.value = 0;
    storeV3.progressionLevel.value = 6;
    storeV3.currentRunPurchasedNodeIds.value = ['defense_wall_hp_t0'];

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(logNode);
  });

  it('completes immediately with no idle Mudpaws', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    store.unitRoster.value = [];
    const goal = new GatherGoal();
    goal.activate();
    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
  });
});

describe('TrainGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    world.resources = { fish: 500, logs: 500, rocks: 0, food: 2, maxFood: 8 };
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.fish.value = 500;
    store.logs.value = 500;
    storeV3.progressionLevel.value = 1;
    storeV3.currentRunPurchasedNodeIds.value = [];
  });

  it('queues a Mudpaw at the Lodge when few Mudpaws exist', async () => {
    const { TrainGoal } = await import('@/governor/goals/train-goal');

    const lodgeEid = addEntity(world.ecs);
    addComponent(world.ecs, lodgeEid, TrainingQueue);
    addComponent(world.ecs, lodgeEid, FactionTag);
    addComponent(world.ecs, lodgeEid, IsBuilding);
    FactionTag.faction[lodgeEid] = Faction.Player;
    TrainingQueue.count[lodgeEid] = 0;

    store.buildingRoster.value = [
      {
        eid: lodgeEid,
        kind: EntityKind.Lodge,
        hp: 1500,
        maxHp: 1500,
        queueItems: [],
        queueProgress: 0,
        canTrain: [MUDPAW_KIND],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(1, MUDPAW_KIND, 'gathering-fish')]),
    ];
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
  });

  it('switches to Sappers on higher-pressure stages once the Mudpaw floor is met', async () => {
    const { TrainGoal } = await import('@/governor/goals/train-goal');

    const lodgeEid = addEntity(world.ecs);
    addComponent(world.ecs, lodgeEid, TrainingQueue);
    addComponent(world.ecs, lodgeEid, FactionTag);
    addComponent(world.ecs, lodgeEid, IsBuilding);
    FactionTag.faction[lodgeEid] = Faction.Player;
    TrainingQueue.count[lodgeEid] = 0;

    storeV3.progressionLevel.value = 6;
    store.buildingRoster.value = [
      {
        eid: lodgeEid,
        kind: EntityKind.Lodge,
        hp: 1500,
        maxHp: 1500,
        queueItems: [],
        queueProgress: 0,
        canTrain: [MUDPAW_KIND, EntityKind.Medic, SAPPER_KIND, SABOTEUR_KIND],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(1, MUDPAW_KIND, 'gathering-fish'),
        rosterUnit(2, MUDPAW_KIND, 'gathering-fish'),
      ]),
    ];
    world.resources.fish = 40;
    world.resources.rocks = 20;
    store.fish.value = 40;
    store.rocks.value = 20;
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
    expect(trainingQueueSlots.get(lodgeEid)?.[0]).toBe(SAPPER_KIND);
  });

  it('queues a Medic when heal-power upgrades meet a wounded stage-six army', async () => {
    const { TrainGoal } = await import('@/governor/goals/train-goal');

    const lodgeEid = addEntity(world.ecs);
    addComponent(world.ecs, lodgeEid, TrainingQueue);
    addComponent(world.ecs, lodgeEid, FactionTag);
    addComponent(world.ecs, lodgeEid, IsBuilding);
    FactionTag.faction[lodgeEid] = Faction.Player;
    TrainingQueue.count[lodgeEid] = 0;

    storeV3.progressionLevel.value = 6;
    storeV3.currentRunPurchasedNodeIds.value = ['utility_heal_power_t0'];
    store.buildingRoster.value = [
      {
        eid: lodgeEid,
        kind: EntityKind.Lodge,
        hp: 1500,
        maxHp: 1500,
        queueItems: [],
        queueProgress: 0,
        canTrain: [MUDPAW_KIND, EntityKind.Medic, SAPPER_KIND, SABOTEUR_KIND],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(1, MUDPAW_KIND, 'gathering-fish'),
        rosterUnit(2, MUDPAW_KIND, 'gathering-logs'),
      ]),
      rosterGroup('combat', [
        rosterUnit(10, SAPPER_KIND, 'attacking', 18, 30),
        rosterUnit(11, SAPPER_KIND, 'defending', 22, 30),
        rosterUnit(12, SAPPER_KIND, 'idle', 30, 30),
      ]),
    ];
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
    expect(trainingQueueSlots.get(lodgeEid)?.[0]).toBe(EntityKind.Medic);
  });

  it('queues a Medic earlier under stage-six pressure when heal-power upgrades are active', async () => {
    const { TrainGoal } = await import('@/governor/goals/train-goal');

    const lodgeEid = addEntity(world.ecs);
    addComponent(world.ecs, lodgeEid, TrainingQueue);
    addComponent(world.ecs, lodgeEid, FactionTag);
    addComponent(world.ecs, lodgeEid, IsBuilding);
    FactionTag.faction[lodgeEid] = Faction.Player;
    TrainingQueue.count[lodgeEid] = 0;

    storeV3.progressionLevel.value = 6;
    storeV3.currentRunPurchasedNodeIds.value = ['utility_heal_power_t0'];
    store.baseThreatCount.value = 2;
    store.waveCountdown.value = 24;
    store.buildingRoster.value = [
      {
        eid: lodgeEid,
        kind: EntityKind.Lodge,
        hp: 1500,
        maxHp: 1500,
        queueItems: [],
        queueProgress: 0,
        canTrain: [MUDPAW_KIND, EntityKind.Medic, SAPPER_KIND, SABOTEUR_KIND],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(1, MUDPAW_KIND, 'gathering-fish'),
        rosterUnit(2, MUDPAW_KIND, 'gathering-logs'),
      ]),
      rosterGroup('combat', [
        rosterUnit(10, SAPPER_KIND, 'defending', 30, 30),
        rosterUnit(11, SAPPER_KIND, 'attacking', 30, 30),
        rosterUnit(12, SAPPER_KIND, 'idle', 30, 30),
        rosterUnit(13, SABOTEUR_KIND, 'attacking', 30, 30),
      ]),
    ];
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
    expect(trainingQueueSlots.get(lodgeEid)?.[0]).toBe(EntityKind.Medic);
  });

  it('skips filler training when train-speed upgrades are active and stage-six fish reserves are low', async () => {
    const { TrainGoal } = await import('@/governor/goals/train-goal');

    const lodgeEid = addEntity(world.ecs);
    addComponent(world.ecs, lodgeEid, TrainingQueue);
    addComponent(world.ecs, lodgeEid, FactionTag);
    addComponent(world.ecs, lodgeEid, IsBuilding);
    FactionTag.faction[lodgeEid] = Faction.Player;
    TrainingQueue.count[lodgeEid] = 0;

    storeV3.progressionLevel.value = 6;
    storeV3.currentRunPurchasedNodeIds.value = ['utility_train_speed_t0'];
    store.buildingRoster.value = [
      {
        eid: lodgeEid,
        kind: EntityKind.Lodge,
        hp: 1500,
        maxHp: 1500,
        queueItems: [],
        queueProgress: 0,
        canTrain: [MUDPAW_KIND, EntityKind.Medic, SAPPER_KIND, SABOTEUR_KIND],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      rosterGroup('generalist', [
        rosterUnit(1, MUDPAW_KIND, 'gathering-fish'),
        rosterUnit(2, MUDPAW_KIND, 'gathering-logs'),
      ]),
      rosterGroup('combat', [
        rosterUnit(10, SAPPER_KIND, 'idle'),
        rosterUnit(11, SAPPER_KIND, 'idle'),
        rosterUnit(12, SAPPER_KIND, 'idle'),
        rosterUnit(13, SAPPER_KIND, 'idle'),
        rosterUnit(14, SABOTEUR_KIND, 'idle'),
      ]),
    ];
    world.resources.fish = 80;
    store.fish.value = 80;
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.FAILED);
    expect(TrainingQueue.count[lodgeEid]).toBe(0);
  });

});
