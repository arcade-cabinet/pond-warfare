/**
 * Training System Tests
 *
 * Validates countdown timer, spawn on completion, and queue advancement.
 */

import { addComponent, addEntity, query } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { TRAIN_TIMER } from '@/constants';
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
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Create a completed player building with a training queue. */
function createTrainingBuilding(
  world: GameWorld,
  kind: EntityKind,
  x: number,
  y: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, TrainingQueue);
  addComponent(world.ecs, eid, Sprite);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;
  Sprite.width[eid] = def.spriteSize * def.spriteScale;
  Sprite.height[eid] = def.spriteSize * def.spriteScale;
  TrainingQueue.count[eid] = 0;
  TrainingQueue.timer[eid] = 0;
  trainingQueueSlots.set(eid, []);

  return eid;
}

describe('trainingSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    // Clear training queue slots between tests
    trainingQueueSlots.clear();
  });

  it('should count down timer and spawn unit when timer reaches zero', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory, 500, 500);

    // Queue one Brawler with timer about to expire
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1; // Will hit 0 after decrement

    trainingSystem(world);

    // Queue should be empty (unit was spawned)
    expect(TrainingQueue.count[armory]).toBe(0);
    // Particles should have been spawned (training complete effect)
    expect(world.particles.length).toBeGreaterThan(0);
    // Verify a Brawler was actually spawned (query for new entities)
    const units = query(world.ecs, [FactionTag, EntityTypeTag]);
    const brawlers = units.filter((eid: number) =>
      EntityTypeTag.kind[eid] === EntityKind.Brawler &&
      FactionTag.faction[eid] === Faction.Player
    );
    expect(brawlers.length).toBe(1);

  });

  it('should not train when building is incomplete (progress < 100)', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory, 500, 500);
    Building.progress[armory] = 50; // Incomplete

    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;

    trainingSystem(world);

    // Queue should be unchanged since building is incomplete
    expect(TrainingQueue.count[armory]).toBe(1);
    expect(TrainingQueue.timer[armory]).toBe(1);
  });

  it('should shift queue after training complete', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory, 500, 500);

    // Queue two units: Brawler then Sniper
    trainingQueueSlots.set(armory, [EntityKind.Brawler, EntityKind.Sniper]);
    TrainingQueue.count[armory] = 2;
    TrainingQueue.timer[armory] = 1; // About to complete

    trainingSystem(world);

    // First unit (Brawler) should have been removed, Sniper remains
    expect(TrainingQueue.count[armory]).toBe(1);
    const slots = trainingQueueSlots.get(armory) ?? [];
    expect(slots[0]).toBe(EntityKind.Sniper);
    // Timer should be reset for next unit
    expect(TrainingQueue.timer[armory]).toBe(TRAIN_TIMER);
  });
});
