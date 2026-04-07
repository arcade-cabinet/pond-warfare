/**
 * Gathering System Tests
 *
 * Validates resource gathering, timer countdown, and resource depletion.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Resource,
  Sprite,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import type { SpecialistAssignment } from '@/game/specialist-assignment';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createGatherer(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, TaskOverride);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;
  Combat.damage[eid] = 2;
  Combat.attackRange[eid] = 40;
  TaskOverride.active[eid] = 0;
  TaskOverride.task[eid] = 0;
  TaskOverride.targetEntity[eid] = -1;
  TaskOverride.resourceKind[eid] = 0;

  return eid;
}

function createResource(world: GameWorld, x: number, y: number, kind: EntityKind): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Resource.resourceType[eid] = kind === EntityKind.Cattail ? ResourceType.Logs : ResourceType.Fish;
  Resource.amount[eid] = 1000;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = kind;
  Collider.radius[eid] = 16;

  return eid;
}

describe('gatheringSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('should count down gather timer', () => {
    const gatherer = createGatherer(world, 100, 100);
    const resource = createResource(world, 100, 100, EntityKind.Cattail);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 10;

    gatheringSystem(world);

    expect(UnitStateMachine.gatherTimer[gatherer]).toBeLessThan(10);
  });

  it('should go idle if target resource is depleted', () => {
    const gatherer = createGatherer(world, 100, 100);
    const resource = createResource(world, 100, 100, EntityKind.Cattail);

    Resource.amount[resource] = 0;

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 5;

    gatheringSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('should pick up resource when timer hits zero', () => {
    const gatherer = createGatherer(world, 100, 100);
    const resource = createResource(world, 100, 100, EntityKind.Cattail);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 1; // About to finish

    gatheringSystem(world);

    expect(Carrying.resourceType[gatherer]).toBe(ResourceType.Logs);
  });

  it('retargets a gather override to another same-type node when the first is depleted', () => {
    const gatherer = createGatherer(world, 100, 100);
    const depleted = createResource(world, 100, 100, EntityKind.Cattail);
    const backup = createResource(world, 500, 100, EntityKind.Cattail);

    Resource.amount[depleted] = 0;
    Resource.amount[backup] = 1000;

    TaskOverride.active[gatherer] = 1;
    TaskOverride.task[gatherer] = UnitState.GatherMove;
    TaskOverride.targetEntity[gatherer] = depleted;
    TaskOverride.resourceKind[gatherer] = EntityKind.Cattail;
    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = depleted;
    UnitStateMachine.gatherTimer[gatherer] = 5;

    gatheringSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(backup);
    expect(TaskOverride.targetEntity[gatherer]).toBe(backup);
  });

  it('keeps specialist gather overrides inside the assigned area', () => {
    const gatherer = createGatherer(world, 100, 100);
    const depleted = createResource(world, 100, 100, EntityKind.Cattail);
    const outside = createResource(world, 500, 100, EntityKind.Cattail);
    const inside = createResource(world, 180, 160, EntityKind.Cattail);

    world.specialistAssignments.set(gatherer, {
      runtimeId: 'logger',
      canonicalId: 'logger',
      label: 'Logger',
      mode: 'single_zone',
      operatingRadius: 120,
      centerX: 180,
      centerY: 180,
      anchorX: 180,
      anchorY: 180,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 180,
      engagementY: 180,
      projectionRange: 0,
    } satisfies SpecialistAssignment);

    Resource.amount[depleted] = 0;
    TaskOverride.active[gatherer] = 1;
    TaskOverride.task[gatherer] = UnitState.GatherMove;
    TaskOverride.targetEntity[gatherer] = depleted;
    TaskOverride.resourceKind[gatherer] = EntityKind.Cattail;
    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = depleted;
    UnitStateMachine.gatherTimer[gatherer] = 5;

    gatheringSystem(world);

    expect(outside).toBeGreaterThanOrEqual(0);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(inside);
  });
});
