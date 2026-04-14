/**
 * Health System Tests
 *
 * Validates healing, flash timer decay, and death handling.
 */

import { addComponent, addEntity, entityExists } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { healthSystem } from '@/ecs/systems/health';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { Faction, ResourceType, UnitState } from '@/types';

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
  EntityTypeTag.kind[eid] = SAPPER_KIND;
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

  it('should remove dead entities', () => {
    const eid = createUnit(world, 0, 60, Faction.Player);

    healthSystem(world);

    // Entity should be removed from the world
    expect(entityExists(world.ecs, eid)).toBe(false);
  });

  it('should track stats when enemy unit dies', () => {
    const _eid = createUnit(world, 0, 60, Faction.Enemy);

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
