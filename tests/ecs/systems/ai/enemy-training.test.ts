/**
 * Enemy Training System Tests
 *
 * Validates that enemy nests queue units when resources are available
 * and respects the training queue limit.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { ENEMY_TRAIN_CHECK_INTERVAL } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
} from '@/ecs/components';
import { enemyTrainingTick } from '@/ecs/systems/ai/enemy-training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Create a completed enemy nest with training queue support. */
function createEnemyNest(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, TrainingQueue);
  addComponent(world.ecs, eid, Sprite);

  const def = ENTITY_DEFS[EntityKind.PredatorNest];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.PredatorNest;
  Building.progress[eid] = 100;
  Sprite.width[eid] = def.spriteSize * def.spriteScale;
  Sprite.height[eid] = def.spriteSize * def.spriteScale;
  TrainingQueue.count[eid] = 0;
  TrainingQueue.timer[eid] = 0;
  trainingQueueSlots.set(eid, []);

  return eid;
}

describe('enemyTrainingTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0;
    // Set frame to training check interval
    world.frameCount = ENEMY_TRAIN_CHECK_INTERVAL;
    // Give enemy plenty of resources
    world.enemyResources.clams = 10000;
    world.enemyResources.twigs = 10000;
    // Clear any leftover queue slots
    trainingQueueSlots.clear();
  });

  it('should queue unit at nest when resources are available', () => {
    const nest = createEnemyNest(world, 500, 500);

    const clamsBefore = world.enemyResources.clams;
    enemyTrainingTick(world);

    // A unit should have been queued
    expect(TrainingQueue.count[nest]).toBeGreaterThan(0);
    // Resources should have been deducted
    expect(world.enemyResources.clams).toBeLessThan(clamsBefore);
  });

  it('should respect training queue limit', () => {
    const nest = createEnemyNest(world, 500, 500);

    // Before mid-game (frame < ENEMY_MID_GAME_FRAME), max queue is 1
    // Fill the queue to 1
    trainingQueueSlots.set(nest, [EntityKind.Gator]);
    TrainingQueue.count[nest] = 1;

    const clamsBefore = world.enemyResources.clams;
    enemyTrainingTick(world);

    // Queue should still be 1 (not exceeded) in early game
    expect(TrainingQueue.count[nest]).toBe(1);
    // Resources should not have been deducted
    expect(world.enemyResources.clams).toBe(clamsBefore);
  });
});
