/**
 * Tests: Vertical Map Generator (v3.0 — US5)
 *
 * Validates:
 * - Map dimensions correct per progression level
 * - Lodge positioned at bottom center
 * - Resources in middle zone
 * - Enemy spawns at top
 * - Map size scales with progression
 * - Terrain generation
 */

import { describe, expect, it } from 'vitest';
import {
  buildVerticalTerrain,
  generateVerticalMapLayout,
  type VerticalMapLayout,
} from '@/game/vertical-map';
import { SeededRandom } from '@/utils/random';

function makeLayout(level: number, seed = 42): VerticalMapLayout {
  return generateVerticalMapLayout(level, new SeededRandom(seed));
}

describe('generateVerticalMapLayout', () => {
  it('returns correct dimensions for level 0 (smallest map)', () => {
    const layout = makeLayout(0);
    // terrain.json: level 0-10 -> 800x1200
    expect(layout.worldWidth).toBe(800);
    expect(layout.worldHeight).toBe(1200);
    expect(layout.cols).toBeGreaterThan(0);
    expect(layout.rows).toBeGreaterThan(0);
  });

  it('returns larger map for mid-level progression', () => {
    const layout = makeLayout(20);
    // terrain.json: level 11-30 -> 1000x1600
    expect(layout.worldWidth).toBe(1000);
    expect(layout.worldHeight).toBe(1600);
  });

  it('returns largest map for high-level progression', () => {
    const layout = makeLayout(50);
    // terrain.json: level 31-999 -> 1200x2000
    expect(layout.worldWidth).toBe(1200);
    expect(layout.worldHeight).toBe(2000);
  });

  it('places Lodge at bottom center of map', () => {
    const layout = makeLayout(0);
    // Lodge should be at horizontal center
    expect(layout.lodgeX).toBe(layout.worldWidth / 2);
    // Lodge should be in bottom zone (bottom 15%)
    const bottomZoneStart = layout.worldHeight * 0.85;
    expect(layout.lodgeY).toBeGreaterThan(bottomZoneStart);
    expect(layout.lodgeY).toBeLessThanOrEqual(layout.worldHeight);
  });

  it('places resource nodes in the middle zone', () => {
    const layout = makeLayout(0);
    const middleStart = layout.worldHeight * 0.15;
    const middleEnd = layout.worldHeight * 0.7;

    for (const res of layout.resourcePositions) {
      expect(res.y).toBeGreaterThanOrEqual(middleStart);
      expect(res.y).toBeLessThanOrEqual(middleEnd);
      expect(res.x).toBeGreaterThan(0);
      expect(res.x).toBeLessThan(layout.worldWidth);
    }
  });

  it('spawns correct number of resource nodes per level', () => {
    // Level 0: 6 resource nodes (from terrain.json)
    const layout0 = makeLayout(0);
    expect(layout0.resourcePositions).toHaveLength(6);

    // Level 20: 10 resource nodes
    const layout20 = makeLayout(20);
    expect(layout20.resourcePositions).toHaveLength(10);

    // Level 50: 15 resource nodes
    const layout50 = makeLayout(50);
    expect(layout50.resourcePositions).toHaveLength(15);
  });

  it('distributes resource types evenly (fish, rock, tree)', () => {
    const layout = makeLayout(0);
    const types = layout.resourcePositions.map((r) => r.type);
    expect(types.filter((t) => t === 'fish_node').length).toBeGreaterThan(0);
    expect(types.filter((t) => t === 'rock_deposit').length).toBeGreaterThan(0);
    expect(types.filter((t) => t === 'tree_cluster').length).toBeGreaterThan(0);
  });

  it('places enemy spawns in the top zone', () => {
    const layout = makeLayout(0);
    const topZone = layout.worldHeight * 0.2;

    expect(layout.enemySpawnPositions.length).toBeGreaterThan(0);
    for (const sp of layout.enemySpawnPositions) {
      expect(sp.y).toBeLessThan(topZone);
    }
  });

  it('adds side enemy spawns for higher progression', () => {
    const layoutLow = makeLayout(0);
    const layoutHigh = makeLayout(50);

    // High-level maps have left/right spawn directions
    expect(layoutHigh.enemySpawnPositions.length).toBeGreaterThan(
      layoutLow.enemySpawnPositions.length,
    );
    expect(layoutHigh.spawnDirections).toContain('left');
    expect(layoutHigh.spawnDirections).toContain('right');
  });

  it('is deterministic with the same seed', () => {
    const a = makeLayout(10, 12345);
    const b = makeLayout(10, 12345);
    expect(a.lodgeX).toBe(b.lodgeX);
    expect(a.lodgeY).toBe(b.lodgeY);
    expect(a.resourcePositions).toEqual(b.resourcePositions);
    expect(a.enemySpawnPositions).toEqual(b.enemySpawnPositions);
  });

  it('produces different layouts with different seeds', () => {
    const a = makeLayout(10, 111);
    const b = makeLayout(10, 999);
    // Resource positions should differ
    const aPosStr = JSON.stringify(a.resourcePositions);
    const bPosStr = JSON.stringify(b.resourcePositions);
    expect(aPosStr).not.toBe(bPosStr);
  });
});

describe('buildVerticalTerrain', () => {
  it('creates a TerrainGrid with correct dimensions', () => {
    const layout = makeLayout(0);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));

    expect(terrain.cols).toBe(layout.cols);
    expect(terrain.rows).toBe(layout.rows);
  });

  it('places water around fish node positions', () => {
    const layout = makeLayout(0);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));

    const fishNodes = layout.resourcePositions.filter((r) => r.type === 'fish_node');
    expect(fishNodes.length).toBeGreaterThan(0);

    // At least one fish node should have water nearby
    const fishNode = fishNodes[0];
    const type = terrain.getAt(fishNode.x, fishNode.y);
    // Center should be water or shallows
    expect([1, 2]).toContain(type); // TerrainType.Water = 1, Shallows = 2
  });

  it('places rocks around rock deposit positions', () => {
    const layout = makeLayout(0);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));

    const rockNodes = layout.resourcePositions.filter((r) => r.type === 'rock_deposit');
    expect(rockNodes.length).toBeGreaterThan(0);

    // Rock node center should be rocks terrain
    const rockNode = rockNodes[0];
    const type = terrain.getAt(rockNode.x, rockNode.y);
    expect(type).toBe(4); // TerrainType.Rocks = 4
  });
});
