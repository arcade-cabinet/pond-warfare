/**
 * Cleanup System Tests
 *
 * Validates that expired particles and corpses are removed from the world.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { COMPAT_SAPPER_CHASSIS_SPRITE_ID, MUDPAW_SPRITE_ID } from '@/game/live-unit-kinds';

describe('cleanupSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('should remove expired particles', () => {
    // Add a particle with 1 frame of life remaining
    world.particles.push({
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      life: 1,
      color: '#fff',
      size: 2,
    });

    // Add a particle with more life
    world.particles.push({
      x: 200,
      y: 200,
      vx: 0,
      vy: 0,
      life: 10,
      color: '#fff',
      size: 2,
    });

    cleanupSystem(world);

    // The expired particle should have been removed; the other remains
    expect(world.particles.length).toBe(1);
    // The surviving particle should have had its life decremented
    expect(world.particles[0].life).toBe(9);
  });

  it('should remove expired corpses', () => {
    // Add a corpse with 1 frame of life remaining
    world.corpses.push({
      id: 1,
      x: 100,
      y: 100,
      spriteId: MUDPAW_SPRITE_ID,
      life: 1,
      maxLife: 120,
    });

    // Add a corpse with more life
    world.corpses.push({
      id: 2,
      x: 200,
      y: 200,
      spriteId: COMPAT_SAPPER_CHASSIS_SPRITE_ID,
      life: 50,
      maxLife: 120,
    });

    cleanupSystem(world);

    // The expired corpse should have been removed
    expect(world.corpses.length).toBe(1);
    expect(world.corpses[0].life).toBe(49);
  });
});
