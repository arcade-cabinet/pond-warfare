import { describe, expect, it } from 'vitest';
import { getBonusNodeSpawnPosition } from '@/ecs/systems/match-event-runner';
import { createTestWorld } from '../../helpers/world-factory';

describe('match event determinism', () => {
  it('derives bonus node positions from the seeded world RNG', () => {
    const firstWorld = createTestWorld({ stage: 1, seed: 356 });
    const secondWorld = createTestWorld({ stage: 1, seed: 356 });

    const firstRun = Array.from({ length: 3 }, () =>
      getBonusNodeSpawnPosition(firstWorld, firstWorld.worldWidth, firstWorld.worldHeight),
    );
    const secondRun = Array.from({ length: 3 }, () =>
      getBonusNodeSpawnPosition(secondWorld, secondWorld.worldWidth, secondWorld.worldHeight),
    );

    expect(firstRun).toEqual(secondRun);
    for (const point of firstRun) {
      expect(point.x).toBeGreaterThanOrEqual(firstWorld.worldWidth * 0.2);
      expect(point.x).toBeLessThanOrEqual(firstWorld.worldWidth * 0.8);
      expect(point.y).toBeGreaterThanOrEqual(firstWorld.worldHeight * 0.3);
      expect(point.y).toBeLessThanOrEqual(firstWorld.worldHeight * 0.7);
    }
  });
});
