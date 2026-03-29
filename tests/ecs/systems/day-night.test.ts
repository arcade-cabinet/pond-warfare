/**
 * Day-Night Cycle System Tests
 *
 * Validates time advancement, wrapping, and ambient darkness calculation.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { dayNightSystem } from '@/ecs/systems/day-night';
import { createGameWorld, type GameWorld } from '@/ecs/world';

describe('dayNightSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should advance timeOfDay by 0.05 each tick', () => {
    const start = world.timeOfDay;
    dayNightSystem(world);
    expect(world.timeOfDay).toBeCloseTo(start + 0.05);
  });

  it('should wrap timeOfDay back to 0 at 24*60 (1440)', () => {
    world.timeOfDay = 24 * 60 - 0.01; // Just before midnight
    dayNightSystem(world);
    expect(world.timeOfDay).toBe(0);
  });

  it('should compute ambientDarkness between 0 and 1', () => {
    // Midday (low darkness)
    world.timeOfDay = 12 * 60;
    dayNightSystem(world);
    expect(world.ambientDarkness).toBeGreaterThanOrEqual(0);
    expect(world.ambientDarkness).toBeLessThanOrEqual(1);
  });
});
