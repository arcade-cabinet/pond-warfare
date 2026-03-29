/**
 * World Tests
 *
 * Validates that createGameWorld returns a valid initial game state.
 */

import { describe, expect, it } from 'vitest';
import { STARTING_CLAMS, STARTING_TWIGS } from '@/constants';
import { createGameWorld } from '@/ecs/world';

describe('createGameWorld', () => {
  it('should return a world with correct initial resources', () => {
    const world = createGameWorld();

    expect(world.resources.clams).toBe(STARTING_CLAMS);
    expect(world.resources.twigs).toBe(STARTING_TWIGS);
  });

  it('should start in playing state with no selection', () => {
    const world = createGameWorld();

    expect(world.state).toBe('playing');
    expect(world.selection).toEqual([]);
    expect(world.frameCount).toBe(0);
  });

  it('should have all auto-behaviors disabled by default', () => {
    const world = createGameWorld();

    expect(world.autoBehaviors.gather).toBe(false);
    expect(world.autoBehaviors.defend).toBe(false);
    expect(world.autoBehaviors.attack).toBe(false);
    expect(world.autoBehaviors.scout).toBe(false);
  });
});
