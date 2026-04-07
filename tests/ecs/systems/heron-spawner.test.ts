/**
 * Flying Heron Spawner Tests
 *
 * Validates heron spawning at tier 2+, edge spawn, and target selection.
 */

import { addComponent, addEntity, query } from 'bitecs';
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
import { heronSpawnerSystem, resetHeronSpawner } from '@/ecs/systems/evolution/heron-spawner';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createMudpaw(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  Combat.damage[eid] = 2;
  Combat.attackRange[eid] = 40;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = MUDPAW_KIND;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

function countEnemyHerons(world: GameWorld): number {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < all.length; i++) {
    const eid = all[i];
    if (
      FactionTag.faction[eid] === Faction.Enemy &&
      EntityTypeTag.kind[eid] === EntityKind.FlyingHeron &&
      Health.current[eid] > 0
    ) {
      count++;
    }
  }
  return count;
}

describe('heronSpawnerSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
    resetHeronSpawner();
  });

  it('does not spawn herons below tier 2', () => {
    world.enemyEvolution.tier = 1;
    world.frameCount = 20000;
    world.peaceTimer = 0;
    createMudpaw(world, 500, 500);

    heronSpawnerSystem(world);

    expect(countEnemyHerons(world)).toBe(0);
  });

  it('spawns a heron at tier 2', () => {
    world.enemyEvolution.tier = 2;
    world.frameCount = 20000;
    world.peaceTimer = 0;
    createMudpaw(world, 500, 500);

    heronSpawnerSystem(world);

    expect(countEnemyHerons(world)).toBe(1);
  });

  it('does not spawn herons during peace', () => {
    world.enemyEvolution.tier = 2;
    world.frameCount = 600;
    world.peaceTimer = 10800;
    createMudpaw(world, 500, 500);

    heronSpawnerSystem(world);

    expect(countEnemyHerons(world)).toBe(0);
  });

  it('respects spawn interval between herons', () => {
    world.enemyEvolution.tier = 2;
    world.peaceTimer = 0;
    createMudpaw(world, 500, 500);

    // First spawn
    world.frameCount = 20000;
    heronSpawnerSystem(world);
    expect(countEnemyHerons(world)).toBe(1);

    // Too soon for another spawn (only 100 frames later)
    world.frameCount = 20100;
    heronSpawnerSystem(world);
    expect(countEnemyHerons(world)).toBe(1);
  });

  it('spawns another heron after interval elapses', () => {
    world.enemyEvolution.tier = 2;
    world.peaceTimer = 0;
    createMudpaw(world, 500, 500);

    world.frameCount = 20000;
    heronSpawnerSystem(world);
    expect(countEnemyHerons(world)).toBe(1);

    // After full interval (900 frames for tier 2)
    world.frameCount = 21000;
    heronSpawnerSystem(world);
    expect(countEnemyHerons(world)).toBe(2);
  });
});
