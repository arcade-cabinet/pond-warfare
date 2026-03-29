/**
 * AI System Tests
 *
 * Validates enemy AI economy (gatherer spawning) and the composed aiSystem entry point.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENEMY_GATHERER_COST, ENEMY_GATHERER_SPAWN_INTERVAL } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Sprite,
  TrainingQueue,
} from '@/ecs/components';
import { enemyEconomyTick } from '@/ecs/systems/ai/enemy-economy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType } from '@/types';

function createEnemyNest(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, TrainingQueue);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 500;
  Health.max[eid] = 500;
  Building.progress[eid] = 100;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.PredatorNest;

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
  Resource.resourceType[eid] = ResourceType.Clams;
  Resource.amount[eid] = 1000;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = EntityKind.Clambed;

  return eid;
}

describe('enemyEconomyTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Past peace timer and on spawn interval
    world.peaceTimer = 0;
    world.frameCount = ENEMY_GATHERER_SPAWN_INTERVAL;
  });

  it('should not spawn gatherers during peace timer', () => {
    world.peaceTimer = 99999;
    world.enemyResources.clams = 1000;
    createEnemyNest(world, 500, 500);
    createResource(world, 520, 500);

    enemyEconomyTick(world);

    // No clams should be spent
    expect(world.enemyResources.clams).toBe(1000);
  });

  it('should not spawn gatherers when enemy lacks resources', () => {
    world.enemyResources.clams = ENEMY_GATHERER_COST - 1;
    createEnemyNest(world, 500, 500);
    createResource(world, 520, 500);

    const startClams = world.enemyResources.clams;
    enemyEconomyTick(world);

    expect(world.enemyResources.clams).toBe(startClams);
  });

  it('should only run on the spawn interval frame', () => {
    world.frameCount = ENEMY_GATHERER_SPAWN_INTERVAL + 1; // Not on interval
    world.enemyResources.clams = 1000;
    createEnemyNest(world, 500, 500);
    createResource(world, 520, 500);

    enemyEconomyTick(world);

    expect(world.enemyResources.clams).toBe(1000);
  });
});
