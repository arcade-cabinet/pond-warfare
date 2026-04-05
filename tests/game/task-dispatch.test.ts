/**
 * Task Dispatch Tests
 *
 * Validates that dispatchTaskOverride correctly sets ECS component state
 * and that clearTaskOverride resets overrides for the auto-behavior pool.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Resource,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { clearTaskOverride, dispatchTaskOverride } from '@/game/task-dispatch';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createPlayerUnit(world: GameWorld, kind: EntityKind, x = 100, y = 100): number {
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
  Velocity.speed[eid] = 2.0;
  UnitStateMachine.state[eid] = UnitState.Idle;

  return eid;
}

function createResource(
  world: GameWorld,
  kind: EntityKind,
  resType: ResourceType,
  x: number,
  y: number,
): number {
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

function createEnemy(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 50;
  Health.max[eid] = 50;
  FactionTag.faction[eid] = Faction.Enemy;

  return eid;
}

describe('dispatchTaskOverride', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('idle clears override and stops the unit', () => {
    const eid = createPlayerUnit(world, EntityKind.Gatherer);
    // First set an override
    TaskOverride.active[eid] = 1;
    TaskOverride.task[eid] = UnitState.GatherMove;
    UnitStateMachine.state[eid] = UnitState.GatherMove;

    dispatchTaskOverride(world, eid, 'idle');

    expect(TaskOverride.active[eid]).toBe(0);
    expect(TaskOverride.task[eid]).toBe(0);
    expect(TaskOverride.targetEntity[eid]).toBe(0);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.Idle);
  });

  it('gathering-fish sets GatherMove and finds nearest clambed', () => {
    const eid = createPlayerUnit(world, EntityKind.Gatherer, 100, 100);
    const farClam = createResource(world, EntityKind.Clambed, ResourceType.Fish, 500, 500);
    const nearClam = createResource(world, EntityKind.Clambed, ResourceType.Fish, 120, 110);

    dispatchTaskOverride(world, eid, 'gathering-fish');

    expect(TaskOverride.active[eid]).toBe(1);
    expect(TaskOverride.task[eid]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[eid]).toBe(nearClam);
    expect(TaskOverride.targetEntity[eid]).toBe(nearClam);
    // farClam should not be selected
    expect(UnitStateMachine.targetEntity[eid]).not.toBe(farClam);
  });

  it('gathering-logs targets Cattail resources', () => {
    const eid = createPlayerUnit(world, EntityKind.Gatherer, 100, 100);
    // Create a clambed (wrong type) and a cattail (right type)
    createResource(world, EntityKind.Clambed, ResourceType.Fish, 110, 100);
    const cattail = createResource(world, EntityKind.Cattail, ResourceType.Logs, 200, 200);

    dispatchTaskOverride(world, eid, 'gathering-logs');

    expect(UnitStateMachine.targetEntity[eid]).toBe(cattail);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.GatherMove);
  });

  it('attacking sets AttackMove and finds nearest enemy', () => {
    const eid = createPlayerUnit(world, EntityKind.Brawler, 100, 100);
    const enemy = createEnemy(world, 200, 200);

    dispatchTaskOverride(world, eid, 'attacking');

    expect(TaskOverride.active[eid]).toBe(1);
    expect(TaskOverride.task[eid]).toBe(UnitState.AttackMove);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.AttackMove);
    expect(UnitStateMachine.targetEntity[eid]).toBe(enemy);
  });

  it('patrolling sets AttackMovePatrol with override', () => {
    const eid = createPlayerUnit(world, EntityKind.Brawler);

    dispatchTaskOverride(world, eid, 'patrolling');

    expect(TaskOverride.active[eid]).toBe(1);
    expect(TaskOverride.task[eid]).toBe(UnitState.AttackMovePatrol);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.AttackMovePatrol);
  });
});

describe('clearTaskOverride', () => {
  it('zeros all TaskOverride fields', () => {
    const world = createGameWorld();
    const eid = createPlayerUnit(world, EntityKind.Gatherer);
    TaskOverride.active[eid] = 1;
    TaskOverride.task[eid] = UnitState.GatherMove;
    TaskOverride.targetEntity[eid] = 42;

    clearTaskOverride(eid);

    expect(TaskOverride.active[eid]).toBe(0);
    expect(TaskOverride.task[eid]).toBe(0);
    expect(TaskOverride.targetEntity[eid]).toBe(0);
  });
});

describe('TaskOverride integration with auto-behavior', () => {
  it('override prevents auto-behavior from reassigning the unit', () => {
    const world = createGameWorld();
    world.frameCount = 60;
    world.autoBehaviors.gatherer = true;

    const eid = createPlayerUnit(world, EntityKind.Gatherer);
    addComponent(world.ecs, eid, TaskOverride);

    // Create a resource that auto-gather would normally target
    createResource(world, EntityKind.Cattail, ResourceType.Logs, 120, 100);
    // Create an enemy so attacking dispatch finds a valid target
    createEnemy(world, 300, 300);

    // Dispatch a manual "attacking" task override
    dispatchTaskOverride(world, eid, 'attacking');
    expect(UnitStateMachine.state[eid]).toBe(UnitState.AttackMove);

    // Auto-behavior system removed in v3.0 — TaskOverride still prevents
    // any future auto-behavior from overriding manual commands
    expect(TaskOverride.active[eid]).toBe(1);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.AttackMove);
  });
});
