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
import { MUDPAW_KIND, SABOTEUR_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { getPlayerTrainTimer } from '@/game/train-timer';
import { EntityKind, Faction } from '@/types';

/** Create a completed player building with a training queue. */
function createTrainingBuilding(world: GameWorld, kind: EntityKind, x: number, y: number): number {
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
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);

    // Queue one Sapper with timer about to expire
    trainingQueueSlots.set(lodge, [SAPPER_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1; // Will hit 0 after decrement

    trainingSystem(world);

    // Queue should be empty (unit was spawned)
    expect(TrainingQueue.count[lodge]).toBe(0);
    // Particles should have been spawned (training complete effect)
    expect(world.particles.length).toBeGreaterThan(0);
    // Verify a Sapper was actually spawned (query for new entities)
    const units = query(world.ecs, [FactionTag, EntityTypeTag]);
    const sappers = units.filter(
      (eid: number) =>
        EntityTypeTag.kind[eid] === SAPPER_KIND && FactionTag.faction[eid] === Faction.Player,
    );
    expect(sappers.length).toBe(1);
  });

  it('should not train when building is incomplete (progress < 100)', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);
    Building.progress[lodge] = 50; // Incomplete

    trainingQueueSlots.set(lodge, [SAPPER_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;

    trainingSystem(world);

    // Queue should be unchanged since building is incomplete
    expect(TrainingQueue.count[lodge]).toBe(1);
    expect(TrainingQueue.timer[lodge]).toBe(1);
  });

  it('should shift queue after training complete', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);

    // Queue two units: Sapper then Saboteur
    trainingQueueSlots.set(lodge, [SAPPER_KIND, SABOTEUR_KIND]);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1; // About to complete

    trainingSystem(world);

    // First unit (Sapper) should have been removed, Saboteur remains
    expect(TrainingQueue.count[lodge]).toBe(1);
    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots[0]).toBe(SABOTEUR_KIND);
    // Timer should be reset for next unit
    expect(TrainingQueue.timer[lodge]).toBe(TRAIN_TIMER);
  });

  it('resets the next queue timer using player train speed multiplier', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);
    world.playerTrainSpeedMultiplier = 1.5;

    trainingQueueSlots.set(lodge, [SAPPER_KIND, SABOTEUR_KIND]);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;

    trainingSystem(world);

    expect(TrainingQueue.count[lodge]).toBe(1);
    expect(TrainingQueue.timer[lodge]).toBe(getPlayerTrainTimer(world));
    expect(TrainingQueue.timer[lodge]).toBeLessThan(TRAIN_TIMER);
  });

  it('does not reduce Mudpaw queue timers with the player train speed multiplier', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);
    world.playerTrainSpeedMultiplier = 1.5;

    trainingQueueSlots.set(lodge, [MUDPAW_KIND, SABOTEUR_KIND]);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;

    trainingSystem(world);

    expect(TrainingQueue.count[lodge]).toBe(1);
    expect(trainingQueueSlots.get(lodge)?.[0]).toBe(SABOTEUR_KIND);
    expect(TrainingQueue.timer[lodge]).toBe(getPlayerTrainTimer(world, SABOTEUR_KIND));
    expect(getPlayerTrainTimer(world, MUDPAW_KIND)).toBe(TRAIN_TIMER);
  });
});
