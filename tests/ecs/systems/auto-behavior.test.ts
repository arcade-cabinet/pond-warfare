/**
 * Auto-Behavior System Tests
 *
 * Validates that idle player units are automatically assigned tasks when
 * auto-behavior toggles are enabled.
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
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { autoBehaviorSystem } from '@/ecs/systems/auto-behavior';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createPlayerUnit(world: GameWorld, kind: EntityKind, x = 100, y = 100): number {
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
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;
  UnitStateMachine.state[eid] = UnitState.Idle;

  return eid;
}

function createResource(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Resource.resourceType[eid] = ResourceType.Twigs;
  Resource.amount[eid] = 1000;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = EntityKind.Cattail;

  return eid;
}

describe('autoBehaviorSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 60; // Must be a multiple of 60
  });

  it('should do nothing when all toggles are off', () => {
    const gatherer = createPlayerUnit(world, EntityKind.Gatherer);
    createResource(world, 120, 100);

    autoBehaviorSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('should send idle gatherers to nearest resource when auto-gather is on', () => {
    world.autoBehaviors.gather = true;
    const gatherer = createPlayerUnit(world, EntityKind.Gatherer);
    createResource(world, 120, 100);

    autoBehaviorSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
  });

  it('should not auto-gather non-gatherer units', () => {
    world.autoBehaviors.gather = true;
    const brawler = createPlayerUnit(world, EntityKind.Brawler);
    createResource(world, 120, 100);

    autoBehaviorSystem(world);

    expect(UnitStateMachine.state[brawler]).toBe(UnitState.Idle);
  });
});
