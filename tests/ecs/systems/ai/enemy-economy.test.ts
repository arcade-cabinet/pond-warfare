/**
 * Enemy Economy System Tests
 *
 * Validates gatherer spawning from nests and resource limits.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_GATHERER_COST,
  ENEMY_GATHERER_SPAWN_INTERVAL,
  ENEMY_MAX_GATHERERS_PER_NEST,
} from '@/constants';
import {
  Building,
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { enemyEconomyTick } from '@/ecs/systems/ai/enemy-economy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType } from '@/types';

/** Create a completed enemy nest. */
function createEnemyNest(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);

  const def = ENTITY_DEFS[EntityKind.PredatorNest];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.PredatorNest;
  Building.progress[eid] = 100;

  return eid;
}

/** Create a resource node. */
function createResourceNode(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  addComponent(world.ecs, eid, Health);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Resource.resourceType[eid] = ResourceType.Clams;
  Resource.amount[eid] = 1000;
  Health.current[eid] = 1;
  Health.max[eid] = 1;

  return eid;
}

/** Create an existing enemy gatherer near a nest. */
function createEnemyGatherer(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

describe('enemyEconomyTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Ensure peace timer has passed
    world.peaceTimer = 0;
    // Set frame count to match the spawn interval
    world.frameCount = ENEMY_GATHERER_SPAWN_INTERVAL;
    // Give the enemy enough resources
    world.enemyResources.clams = 10000;
    world.enemyResources.twigs = 10000;
  });

  it('should spawn gatherer from nest when resources available', () => {
    createEnemyNest(world, 500, 500);
    createResourceNode(world, 600, 500);

    const clamsBefore = world.enemyResources.clams;
    enemyEconomyTick(world);

    // Resources should have been deducted
    expect(world.enemyResources.clams).toBe(clamsBefore - ENEMY_GATHERER_COST);
  });

  it('should not spawn when at max gatherers per nest', () => {
    const nestX = 500;
    const nestY = 500;
    createEnemyNest(world, nestX, nestY);
    createResourceNode(world, 600, 500);

    // Create max gatherers near the nest
    for (let i = 0; i < ENEMY_MAX_GATHERERS_PER_NEST; i++) {
      createEnemyGatherer(world, nestX + i * 10, nestY);
    }

    const clamsBefore = world.enemyResources.clams;
    enemyEconomyTick(world);

    // Resources should be unchanged (no new gatherer spawned)
    expect(world.enemyResources.clams).toBe(clamsBefore);
  });
});
