/**
 * Enemy Training System Tests
 *
 * Validates that enemy nests queue units when resources are available,
 * respects the training queue limit, deducts resources on training,
 * respects cooldown intervals, and processes queue timers.
 *
 * NOTE: bitECS SoA components are global typed arrays, so entities from
 * parallel test files can pollute queries. We verify via resource
 * deduction and queue state rather than entity counting.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { ENEMY_TRAIN_CHECK_INTERVAL } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
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
import {
  enemyTrainingQueueProcess,
  enemyTrainingTick,
  resolveEnemyTrainingPreference,
} from '@/ecs/systems/ai/enemy-training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import type { SpecialistAssignment } from '@/game/specialist-assignment';
import { EntityKind, Faction } from '@/types';

// Mock rendering animations to prevent side-effects
vi.mock('@/rendering/animations', () => ({
  triggerSpawnPop: vi.fn(),
}));

// Mock particles to prevent side-effects
vi.mock('@/utils/particles', () => ({
  spawnDustBurst: vi.fn(),
}));

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

function tagSpecialist(world: GameWorld, eid: number, runtimeId: string): void {
  world.specialistAssignments.set(eid, {
    runtimeId,
    canonicalId: runtimeId,
    label: runtimeId,
    mode: runtimeId === 'ranger' || runtimeId === 'bombardier' ? 'dual_zone' : 'single_zone',
    operatingRadius: 0,
    centerX: 0,
    centerY: 0,
    anchorX: 0,
    anchorY: 0,
    anchorRadius: 0,
    engagementRadius: 0,
    engagementX: 0,
    engagementY: 0,
    projectionRange: 0,
  } satisfies SpecialistAssignment);
}

describe('enemyTrainingTick', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0;
    world.frameCount = ENEMY_TRAIN_CHECK_INTERVAL;
    world.enemyResources.fish = 10000;
    world.enemyResources.logs = 10000;
    trainingQueueSlots.clear();
  });

  describe('peace timer gating', () => {
    it('should not train during peace period', () => {
      world.peaceTimer = ENEMY_TRAIN_CHECK_INTERVAL + 100;
      world.frameCount = ENEMY_TRAIN_CHECK_INTERVAL;

      const nest = createEnemyNest(world, 500, 500);

      const fishBefore = world.enemyResources.fish;
      enemyTrainingTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
      expect(TrainingQueue.count[nest]).toBe(0);
    });
  });

  describe('training basics', () => {
    it('should queue unit at nest when resources are available', () => {
      const nest = createEnemyNest(world, 500, 500);

      const fishBefore = world.enemyResources.fish;
      enemyTrainingTick(world);

      expect(TrainingQueue.count[nest]).toBeGreaterThan(0);
      expect(world.enemyResources.fish).toBeLessThan(fishBefore);
    });

    it('should deduct training costs from enemy resources', () => {
      const _nest = createEnemyNest(world, 500, 500);

      const fishBefore = world.enemyResources.fish;
      const logsBefore = world.enemyResources.logs;
      enemyTrainingTick(world);

      // At least fish should be deducted (the exact amount depends on which
      // unit kind is selected by the weighted random, but it will be > 0)
      expect(world.enemyResources.fish).toBeLessThan(fishBefore);
      expect(world.enemyResources.logs).toBeLessThan(logsBefore);
    });
  });

  describe('queue limits', () => {
    it('should respect early-game training queue limit of 1', () => {
      const nest = createEnemyNest(world, 500, 500);

      // Fill the queue to 1 (early game max)
      trainingQueueSlots.set(nest, [EntityKind.Gator]);
      TrainingQueue.count[nest] = 1;

      const fishBefore = world.enemyResources.fish;
      enemyTrainingTick(world);

      // Queue should still be 1 (not exceeded)
      expect(TrainingQueue.count[nest]).toBe(1);
      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should not train when resources are insufficient', () => {
      world.enemyResources.fish = 0;
      world.enemyResources.logs = 0;

      const nest = createEnemyNest(world, 500, 500);

      enemyTrainingTick(world);

      expect(TrainingQueue.count[nest]).toBe(0);
    });
  });

  describe('cooldown intervals', () => {
    it('should not train when frameCount is not a multiple of train interval', () => {
      world.frameCount = ENEMY_TRAIN_CHECK_INTERVAL + 1;

      const nest = createEnemyNest(world, 500, 500);

      const fishBefore = world.enemyResources.fish;
      enemyTrainingTick(world);

      expect(TrainingQueue.count[nest]).toBe(0);
      expect(world.enemyResources.fish).toBe(fishBefore);
    });

    it('should train on exact interval multiples', () => {
      world.frameCount = ENEMY_TRAIN_CHECK_INTERVAL * 2;

      const nest = createEnemyNest(world, 500, 500);

      enemyTrainingTick(world);

      expect(TrainingQueue.count[nest]).toBeGreaterThan(0);
    });
  });

  describe('difficulty scaling', () => {
    it('should train on hard-adjusted interval', () => {
      world.difficulty = 'hard';
      // Hard interval = floor(ENEMY_TRAIN_CHECK_INTERVAL * 0.75)
      // With balanced personality trainSpeedMult = 1.0, the final interval is:
      const hardInterval = Math.max(
        30,
        Math.round(Math.floor(ENEMY_TRAIN_CHECK_INTERVAL * 0.75) / 1.0),
      );
      world.frameCount = hardInterval;

      const nest = createEnemyNest(world, 500, 500);

      enemyTrainingTick(world);

      expect(TrainingQueue.count[nest]).toBeGreaterThan(0);
    });
  });

  describe('no nests', () => {
    it('should do nothing when no enemy nests exist', () => {
      const fishBefore = world.enemyResources.fish;
      enemyTrainingTick(world);

      expect(world.enemyResources.fish).toBe(fishBefore);
    });
  });

  describe('counter training preference', () => {
    it('prefers melee answers against a frontline-heavy live roster', () => {
      spawnEntity(world, SAPPER_KIND, 360, 360, Faction.Player);
      spawnEntity(world, SAPPER_KIND, 390, 360, Faction.Player);
      spawnEntity(world, SAPPER_KIND, 420, 360, Faction.Player);

      expect(resolveEnemyTrainingPreference(world, 'balanced')).toBe('melee');
    });

    it('prefers ranged answers against projected specialists', () => {
      const ranger = spawnEntity(world, SAPPER_KIND, 360, 360, Faction.Player);
      const bombardier = spawnEntity(world, SAPPER_KIND, 400, 360, Faction.Player);
      tagSpecialist(world, ranger, 'ranger');
      tagSpecialist(world, bombardier, 'bombardier');

      expect(resolveEnemyTrainingPreference(world, 'balanced')).toBe('ranged');
    });

    it('preserves personality when player pressure is mixed or absent', () => {
      expect(resolveEnemyTrainingPreference(world, 'siege')).toBe('siege');

      const frontline = spawnEntity(world, MUDPAW_KIND, 360, 360, Faction.Player);
      const projected = spawnEntity(world, SAPPER_KIND, 400, 360, Faction.Player);
      tagSpecialist(world, projected, 'ranger');
      expect(frontline).toBeGreaterThan(0);

      expect(resolveEnemyTrainingPreference(world, 'balanced')).toBe('balanced');
    });
  });
});

describe('enemyTrainingQueueProcess', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0;
    world.frameCount = 0;
    world.enemyResources.fish = 10000;
    world.enemyResources.logs = 10000;
    trainingQueueSlots.clear();
  });

  it('should decrement training timer each tick', () => {
    const nest = createEnemyNest(world, 500, 500);

    trainingQueueSlots.set(nest, [EntityKind.Gator]);
    TrainingQueue.count[nest] = 1;
    TrainingQueue.timer[nest] = 10;

    enemyTrainingQueueProcess(world);

    expect(TrainingQueue.timer[nest]).toBe(9);
  });

  it('should spawn unit when timer reaches 0', () => {
    const nest = createEnemyNest(world, 500, 500);

    trainingQueueSlots.set(nest, [EntityKind.Gator]);
    TrainingQueue.count[nest] = 1;
    TrainingQueue.timer[nest] = 1; // Will reach 0 after decrement

    enemyTrainingQueueProcess(world);

    // Queue should be empty after unit spawns
    const slots = trainingQueueSlots.get(nest) ?? [];
    expect(slots.length).toBe(0);
    expect(TrainingQueue.count[nest]).toBe(0);
  });

  it('should start next timer when queue has more units', () => {
    const nest = createEnemyNest(world, 500, 500);

    trainingQueueSlots.set(nest, [EntityKind.Gator, EntityKind.Snake]);
    TrainingQueue.count[nest] = 2;
    TrainingQueue.timer[nest] = 1; // First unit spawns

    enemyTrainingQueueProcess(world);

    // Second unit should still be in queue with fresh timer
    const slots = trainingQueueSlots.get(nest) ?? [];
    expect(slots.length).toBe(1);
    expect(TrainingQueue.count[nest]).toBe(1);
    expect(TrainingQueue.timer[nest]).toBeGreaterThan(0);
  });

  it('should not process nests with empty queues', () => {
    const nest = createEnemyNest(world, 500, 500);

    trainingQueueSlots.set(nest, []);
    TrainingQueue.count[nest] = 0;
    TrainingQueue.timer[nest] = 0;

    // Should not throw or modify anything
    enemyTrainingQueueProcess(world);

    expect(TrainingQueue.count[nest]).toBe(0);
  });

  it('should not process dead nests', () => {
    const nest = createEnemyNest(world, 500, 500);
    Health.current[nest] = 0; // Dead

    trainingQueueSlots.set(nest, [EntityKind.Gator]);
    TrainingQueue.count[nest] = 1;
    TrainingQueue.timer[nest] = 1;

    enemyTrainingQueueProcess(world);

    // Queue should remain unchanged (dead building skipped)
    const slots = trainingQueueSlots.get(nest) ?? [];
    expect(slots.length).toBe(1);
  });

  it('should not process incomplete nests', () => {
    const nest = createEnemyNest(world, 500, 500);
    Building.progress[nest] = 50; // Under construction

    trainingQueueSlots.set(nest, [EntityKind.Gator]);
    TrainingQueue.count[nest] = 1;
    TrainingQueue.timer[nest] = 1;

    enemyTrainingQueueProcess(world);

    // Queue should remain unchanged (incomplete building skipped)
    const slots = trainingQueueSlots.get(nest) ?? [];
    expect(slots.length).toBe(1);
  });
});
