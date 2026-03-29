/**
 * Evolution System Tests
 *
 * Validates enemy evolution tier progression, timing, and unit unlocking.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';

describe('evolutionSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should not evolve during peace period', () => {
    // frameCount is before peaceTimer, so still in peace
    world.peaceTimer = 10800;
    world.frameCount = 600; // multiple of 600 so the check runs
    const initialTier = world.enemyEvolution.tier;

    evolutionSystem(world);

    expect(world.enemyEvolution.tier).toBe(initialTier);
    expect(world.enemyEvolution.unlockedUnits).toEqual([EntityKind.Gator, EntityKind.Snake]);
  });

  it('should evolve to tier 1 after 5 minutes post-peace', () => {
    world.peaceTimer = 0; // peace already ended at frame 0
    // 5 minutes = 5 * 3600 = 18000 frames after peace
    world.frameCount = 18000;
    world.enemyEvolution.tier = 0;

    evolutionSystem(world);

    expect(world.enemyEvolution.tier).toBe(1);
    expect(world.enemyEvolution.unlockedUnits).toContain(EntityKind.ArmoredGator);
  });

  it('should not evolve before the threshold is reached', () => {
    world.peaceTimer = 0;
    // Just under 5 minutes: 4.9 minutes = 4.9 * 3600 = 17640 frames
    // Round to nearest 600 multiple below 18000
    world.frameCount = 17400; // 4.833 minutes, below 5 min threshold
    world.enemyEvolution.tier = 0;

    evolutionSystem(world);

    expect(world.enemyEvolution.tier).toBe(0);
    expect(world.enemyEvolution.unlockedUnits).toEqual([EntityKind.Gator, EntityKind.Snake]);
  });

  it('should advance tiers sequentially with correct units', () => {
    world.peaceTimer = 0;

    // Tier 0 -> 1 at 5 min (18000 frames)
    world.frameCount = 18000;
    world.enemyEvolution.tier = 0;
    evolutionSystem(world);
    expect(world.enemyEvolution.tier).toBe(1);
    expect(world.enemyEvolution.unlockedUnits).toContain(EntityKind.ArmoredGator);

    // Tier 1 -> 2 at 10 min (36000 frames)
    world.frameCount = 36000;
    evolutionSystem(world);
    expect(world.enemyEvolution.tier).toBe(2);
    expect(world.enemyEvolution.unlockedUnits).toContain(EntityKind.VenomSnake);

    // Tier 2 -> 3 at 15 min (54000 frames)
    world.frameCount = 54000;
    evolutionSystem(world);
    expect(world.enemyEvolution.tier).toBe(3);
    expect(world.enemyEvolution.unlockedUnits).toContain(EntityKind.SwampDrake);
  });

  it('should record lastEvolutionFrame on tier-up', () => {
    world.peaceTimer = 0;
    world.frameCount = 18000;
    world.enemyEvolution.tier = 0;

    evolutionSystem(world);

    expect(world.enemyEvolution.lastEvolutionFrame).toBe(18000);
  });
});
