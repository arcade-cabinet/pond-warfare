/**
 * Building System Tests
 *
 * Validates construction progress and completion.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import {
  Position, Health, UnitStateMachine, FactionTag, EntityTypeTag,
  Velocity, Collider, Sprite, Building, IsBuilding, Carrying, Combat,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { UnitState, Faction, EntityKind, ResourceType } from '@/types';
import { buildingSystem } from '@/ecs/systems/building';

function createBuilder(world: GameWorld): number {
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

  Position.x[eid] = 100;
  Position.y[eid] = 100;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

function createBuilding(world: GameWorld, hp: number, maxHp: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = 100;
  Position.y[eid] = 100;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  Building.progress[eid] = (hp / maxHp) * 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Burrow;
  Collider.radius[eid] = 38;

  return eid;
}

describe('buildingSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('should increase building HP when builder timer completes', () => {
    const builder = createBuilder(world);
    const building = createBuilding(world, 10, 300);

    UnitStateMachine.state[builder] = UnitState.Building;
    UnitStateMachine.targetEntity[builder] = building;
    UnitStateMachine.gatherTimer[builder] = 1;

    const startHp = Health.current[building];
    buildingSystem(world);

    expect(Health.current[building]).toBeGreaterThan(startHp);
  });

  it('should go idle when building is complete', () => {
    const builder = createBuilder(world);
    const building = createBuilding(world, 299, 300);

    UnitStateMachine.state[builder] = UnitState.Building;
    UnitStateMachine.targetEntity[builder] = building;
    UnitStateMachine.gatherTimer[builder] = 1;

    buildingSystem(world);

    // Building should be complete
    expect(Health.current[building]).toBe(300);
    expect(Building.progress[building]).toBe(100);
    expect(UnitStateMachine.state[builder]).toBe(UnitState.Idle);
  });
});
