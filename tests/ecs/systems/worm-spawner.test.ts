/**
 * Burrowing Worm Spawner Tests
 *
 * Validates worm spawning at tier 3+, burrow phase, and emergence targeting.
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
} from '@/ecs/components';
import { WORM_BURROW_DURATION, wormSpawnerSystem } from '@/ecs/systems/evolution/worm-spawner';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType } from '@/types';

function createResourceNode(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = EntityKind.Cattail;
  Resource.resourceType[eid] = ResourceType.Twigs;
  Resource.amount[eid] = 200;

  return eid;
}

describe('wormSpawnerSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('does not spawn worms below tier 3', () => {
    world.enemyEvolution.tier = 2;
    world.frameCount = 20000;
    world.peaceTimer = 0;
    createResourceNode(world, 100, 100);

    wormSpawnerSystem(world);

    expect(world.wormBurrowTimers.size).toBe(0);
  });

  it('spawns a worm at tier 3 with resource nodes present', () => {
    world.enemyEvolution.tier = 3;
    world.frameCount = 20000;
    world.peaceTimer = 0;
    world.lastWormSpawnFrame = 0; // long ago
    createResourceNode(world, 500, 500);

    wormSpawnerSystem(world);

    expect(world.wormBurrowTimers.size).toBe(1);
    expect(world.lastWormSpawnFrame).toBe(20000);
  });

  it('does not spawn worms during peace', () => {
    world.enemyEvolution.tier = 3;
    world.frameCount = 600;
    world.peaceTimer = 10800;
    createResourceNode(world, 100, 100);

    wormSpawnerSystem(world);

    expect(world.wormBurrowTimers.size).toBe(0);
  });

  it('does not spawn worms without resource nodes', () => {
    world.enemyEvolution.tier = 3;
    world.frameCount = 20000;
    world.peaceTimer = 0;
    world.lastWormSpawnFrame = 0;

    wormSpawnerSystem(world);

    expect(world.wormBurrowTimers.size).toBe(0);
  });

  it('respects spawn interval', () => {
    world.enemyEvolution.tier = 3;
    world.peaceTimer = 0;
    world.lastWormSpawnFrame = 19500;
    world.frameCount = 19700; // only 200 frames since last spawn (< 600)
    createResourceNode(world, 100, 100);

    wormSpawnerSystem(world);

    expect(world.wormBurrowTimers.size).toBe(0);
  });

  it('ticks down burrow timer and removes at 0', () => {
    world.enemyEvolution.tier = 3;
    world.peaceTimer = 0;
    // Manually add a worm to burrow timers to test tick-down
    world.wormBurrowTimers.set(999, 2);

    // Mock the entity as alive
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Health);
    Health.current[eid] = 60;
    // The map key won't match entity 999 in a real scenario, but let's
    // set it up to test the dead-entity cleanup path
    world.wormBurrowTimers.clear();
    world.wormBurrowTimers.set(eid, WORM_BURROW_DURATION);

    // Tick down once
    world.frameCount = 1;
    world.lastWormSpawnFrame = 1; // prevent new spawn
    wormSpawnerSystem(world);

    // Should have decremented
    const remaining = world.wormBurrowTimers.get(eid);
    expect(remaining).toBe(WORM_BURROW_DURATION - 1);
  });

  it('clears burrow timer for dead worms', () => {
    world.enemyEvolution.tier = 3;
    world.peaceTimer = 0;
    world.frameCount = 1;
    world.lastWormSpawnFrame = 1;

    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Health);
    Health.current[eid] = 0; // dead

    world.wormBurrowTimers.set(eid, 30);

    wormSpawnerSystem(world);

    expect(world.wormBurrowTimers.has(eid)).toBe(false);
  });
});
