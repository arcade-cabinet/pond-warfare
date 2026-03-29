/**
 * Health System Tests
 *
 * Validates healing, flash timer decay, and death handling.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addComponent, hasComponent } from 'bitecs';
import {
  Position, Health, UnitStateMachine, FactionTag, EntityTypeTag,
  Velocity, Collider, Sprite, Combat, Carrying, Dead,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { UnitState, Faction, EntityKind, ResourceType } from '@/types';
import { healthSystem } from '@/ecs/systems/health';

function createUnit(world: GameWorld, hp: number, maxHp: number, faction: Faction): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = 100;
  Position.y[eid] = 100;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  Health.flashTimer[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = EntityKind.Brawler;
  Velocity.speed[eid] = 1.8;
  Collider.radius[eid] = 16;
  Combat.damage[eid] = 6;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

describe('healthSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 300; // For healing check
  });

  it('should decay flash timer', () => {
    const eid = createUnit(world, 50, 60, Faction.Player);
    Health.flashTimer[eid] = 5;

    healthSystem(world);

    expect(Health.flashTimer[eid]).toBeLessThan(5);
  });

  it('should mark dead entities with Dead component', () => {
    const eid = createUnit(world, 0, 60, Faction.Player);

    healthSystem(world);

    expect(hasComponent(world.ecs, eid, Dead)).toBe(true);
  });

  it('should track stats when enemy unit dies', () => {
    const eid = createUnit(world, 0, 60, Faction.Enemy);

    healthSystem(world);

    expect(world.stats.unitsKilled).toBeGreaterThanOrEqual(1);
  });

  it('should heal idle player units every 300 frames', () => {
    const eid = createUnit(world, 50, 60, Faction.Player);
    UnitStateMachine.state[eid] = UnitState.Idle;

    healthSystem(world);

    expect(Health.current[eid]).toBe(51); // +1 HP
  });

  it('should not heal units in combat', () => {
    const eid = createUnit(world, 50, 60, Faction.Player);
    UnitStateMachine.state[eid] = UnitState.Attacking;

    healthSystem(world);

    expect(Health.current[eid]).toBe(50); // No healing
  });
});
