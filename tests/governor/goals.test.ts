/**
 * Goal Execution Tests
 *
 * Validates that individual goals correctly interact with the game
 * through the same APIs the UI uses (dispatchTaskOverride, train, purchaseTech).
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
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';
import type { RosterBuilding, RosterGroup, RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';

// Provide a real game.world so goals can dispatch to ECS
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

function rosterGroup(role: 'gatherer' | 'combat', units: RosterUnit[]): RosterGroup {
  return {
    role,
    idleCount: units.filter((u) => u.task === 'idle').length,
    autoEnabled: false,
    units,
  };
}

describe('GatherGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
  });

  it('assigns idle gatherers to resource tasks', async () => {
    const { GatherGoal } = await import('@/governor/goals/gather-goal');

    const eid1 = createUnit(EntityKind.Gatherer, 100, 100);
    createResource(EntityKind.Clambed, ResourceType.Clams, 120, 110);

    store.unitRoster.value = [
      rosterGroup('gatherer', [rosterUnit(eid1, EntityKind.Gatherer, 'idle')]),
    ];
    store.clams.value = 100;
    store.twigs.value = 200;
    store.pearls.value = 0;

    const goal = new GatherGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    // Unit should have been assigned a gathering task
    expect(UnitStateMachine.state[eid1]).toBe(UnitState.GatherMove);
    expect(TaskOverride.active[eid1]).toBe(1);
  });

  it('completes immediately with no idle gatherers', async () => {
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
    world.resources = { clams: 500, twigs: 500, pearls: 0, food: 2, maxFood: 8 };
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.clams.value = 500;
    store.twigs.value = 500;
  });

  it('queues a gatherer at lodge when few gatherers exist', async () => {
    const { TrainGoal } = await import('@/governor/goals/train-goal');

    // Create a lodge with training queue
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
        canTrain: [EntityKind.Gatherer],
      } satisfies RosterBuilding,
    ];
    // Only 1 gatherer → gathererCount() = 1 < 4 → pickUnit returns Gatherer
    store.unitRoster.value = [
      rosterGroup('gatherer', [rosterUnit(1, EntityKind.Gatherer, 'gathering-clams')]),
    ];
    store.food.value = 2;
    store.maxFood.value = 8;

    const goal = new TrainGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
  });
});

describe('ResearchGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    world.resources = { clams: 500, twigs: 500, pearls: 0, food: 2, maxFood: 8 };
    world.commanderModifiers = { ...world.commanderModifiers, passiveResearchSpeed: 0 };
  });

  it('purchases the first affordable tech', async () => {
    const { ResearchGoal } = await import('@/governor/goals/research-goal');

    // tidalHarvest costs 100c 75t — should be affordable
    expect(world.tech.tidalHarvest).toBe(false);

    const goal = new ResearchGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(world.tech.tidalHarvest).toBe(true);
  });

  it('fails when nothing is affordable', async () => {
    const { ResearchGoal } = await import('@/governor/goals/research-goal');

    world.resources.clams = 0;
    world.resources.twigs = 0;

    const goal = new ResearchGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.FAILED);
  });
});
