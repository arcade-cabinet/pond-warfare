/**
 * Gathering System Tests
 *
 * Validates resource gathering, timer countdown, and resource depletion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import {
  Position, Health, UnitStateMachine, FactionTag, EntityTypeTag,
  Velocity, Collider, Sprite, Carrying, Resource, IsResource, Combat,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { UnitState, Faction, EntityKind, ResourceType } from '@/types';
import { gatheringSystem } from '@/ecs/systems/gathering';

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
  Resource.resourceType[eid] = kind === EntityKind.Cattail ? ResourceType.Twigs : ResourceType.Clams;
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

    expect(Carrying.resourceType[gatherer]).toBe(ResourceType.Twigs);
  });
});
