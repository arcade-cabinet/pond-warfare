/**
 * World Tests
 *
 * Validates that createGameWorld returns a valid initial game state.
 */

import { describe, expect, it } from 'vitest';
import { STARTING_FISH, STARTING_LOGS } from '@/constants';
import { trainingQueueSlots } from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';

describe('createGameWorld', () => {
  it('should return a world with correct initial resources', () => {
    const world = createGameWorld();

    expect(world.resources.fish).toBe(STARTING_FISH);
    expect(world.resources.logs).toBe(STARTING_LOGS);
  });

  it('should start in playing state with no selection', () => {
    const world = createGameWorld();

    expect(world.state).toBe('playing');
    expect(world.selection).toEqual([]);
    expect(world.frameCount).toBe(0);
  });

  it('should have all auto-behaviors disabled by default', () => {
    const world = createGameWorld();

    expect(world.autoBehaviors.generalist).toBe(false);
    expect(world.autoBehaviors.combat).toBe(false);
    expect(world.autoBehaviors.support).toBe(false);
    expect(world.autoBehaviors.recon).toBe(false);
  });

  it('should clear transient training queues for a fresh world', () => {
    trainingQueueSlots.set(7, [MUDPAW_KIND]);

    createGameWorld();

    expect(trainingQueueSlots.size).toBe(0);
  });
});
