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

function rosterUnit(eid: number, kind: EntityKind, task: string): RosterUnit {
  return { eid, kind, task: task as 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride: false };
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
    store.fish.value = 200;
    store.logs.value = 0;
    store.rocks.value = 0;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid1]).toBe(nearFish);
    expect(UnitStateMachine.targetEntity[eid1]).not.toBe(farLogs);
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

  it('leans on Mudpaws earlier on higher-pressure stages', async () => {
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
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
    expect(trainingQueueSlots.get(lodgeEid)?.[0]).toBe(MUDPAW_KIND);
  });
});
