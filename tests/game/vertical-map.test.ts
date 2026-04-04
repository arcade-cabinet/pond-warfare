/**
 * Tests: Panel-Aware Map Generator (v3.0 — 6-Panel Map System)
 *
 * Validates:
 * - Map dimensions derived from panel grid
 * - Lodge positioned at bottom center of panel 5
 * - Resources placed within unlocked panels
 * - Enemy spawns in panels with enemy_spawn=true
 * - Terrain generation with biome painting
 * - ThornWall fill for locked panels
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';
import {
  buildVerticalTerrain,
  generateVerticalMapLayout,
  type VerticalMapLayout,
} from '@/game/vertical-map';
import { SeededRandom } from '@/utils/random';

const VP_W = 960;
const VP_H = 540;

function makeLayout(stage = 1, seed = 42): VerticalMapLayout {
  const grid = new PanelGrid(VP_W, VP_H, stage);
  return generateVerticalMapLayout(grid, new SeededRandom(seed));
}

describe('generateVerticalMapLayout (panel-based)', () => {
  it('returns world dimensions equal to 3x2 panel grid', () => {
    const layout = makeLayout(1);
    expect(layout.worldWidth).toBe(VP_W * 3);
    expect(layout.worldHeight).toBe(VP_H * 2);
    expect(layout.cols).toBeGreaterThan(0);
    expect(layout.rows).toBeGreaterThan(0);
  });

  it('places Lodge in bottom center of panel 5', () => {
    const layout = makeLayout(1);
    // Panel 5 is at row=1, col=1 → x=[VP_W, 2*VP_W], y=[VP_H, 2*VP_H]
    const p5Left = VP_W;
    const p5Right = VP_W * 2;
    const p5Top = VP_H;
    const p5Bottom = VP_H * 2;
    expect(layout.lodgeX).toBeGreaterThan(p5Left);
    expect(layout.lodgeX).toBeLessThan(p5Right);
    expect(layout.lodgeY).toBeGreaterThan(p5Top);
    expect(layout.lodgeY).toBeLessThanOrEqual(p5Bottom);
  });

  it('generates resource positions only in unlocked panels', () => {
    const layout = makeLayout(1); // only panel 5
    const p5Left = VP_W;
    const p5Right = VP_W * 2;
    const p5Top = VP_H;
    const p5Bottom = VP_H * 2;

    for (const res of layout.resourcePositions) {
      expect(res.x).toBeGreaterThanOrEqual(p5Left);
      expect(res.x).toBeLessThanOrEqual(p5Right);
      expect(res.y).toBeGreaterThanOrEqual(p5Top);
      expect(res.y).toBeLessThanOrEqual(p5Bottom);
      expect(res.panelId).toBe(5);
    }
  });

  it('generates more resources when more panels are unlocked', () => {
    const layout1 = makeLayout(1);
    const layout6 = makeLayout(6);
    expect(layout6.resourcePositions.length).toBeGreaterThan(layout1.resourcePositions.length);
  });

  it('has enemy spawn positions only in panels with enemy_spawn=true', () => {
    // Stage 1: only panel 5 unlocked, which has enemy_spawn=false
    const layout1 = makeLayout(1);
    expect(layout1.enemySpawnPositions.length).toBe(0);

    // Stage 2: panels 5+2 unlocked, panel 2 has enemy_spawn=true
    const layout2 = makeLayout(2);
    expect(layout2.enemySpawnPositions.length).toBeGreaterThan(0);
    for (const sp of layout2.enemySpawnPositions) {
      expect(sp.panelId).toBe(2);
    }
  });

  it('is deterministic with the same seed', () => {
    const a = makeLayout(3, 12345);
    const b = makeLayout(3, 12345);
    expect(a.lodgeX).toBe(b.lodgeX);
    expect(a.lodgeY).toBe(b.lodgeY);
    expect(a.resourcePositions).toEqual(b.resourcePositions);
    expect(a.enemySpawnPositions).toEqual(b.enemySpawnPositions);
  });

  it('produces different layouts with different seeds', () => {
    const a = makeLayout(3, 111);
    const b = makeLayout(3, 999);
    const aPosStr = JSON.stringify(a.resourcePositions);
    const bPosStr = JSON.stringify(b.resourcePositions);
    expect(aPosStr).not.toBe(bPosStr);
  });
});

describe('rare node spawning', () => {
  it('adds rare_node positions when hasRareResourceAccess is true', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    const layout = generateVerticalMapLayout(grid, new SeededRandom(42), {
      hasRareResourceAccess: true,
    });
    const rareNodes = layout.resourcePositions.filter((r) => r.type === 'rare_node');
    // Stage 1 has 1 active panel, 1-2 rare nodes per panel
    expect(rareNodes.length).toBeGreaterThanOrEqual(1);
    expect(rareNodes.length).toBeLessThanOrEqual(2);
  });

  it('does not add rare nodes when hasRareResourceAccess is false', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    const layout = generateVerticalMapLayout(grid, new SeededRandom(42), {
      hasRareResourceAccess: false,
    });
    const rareNodes = layout.resourcePositions.filter((r) => r.type === 'rare_node');
    expect(rareNodes.length).toBe(0);
  });

  it('does not add rare nodes by default (no options)', () => {
    const layout = makeLayout(1);
    const rareNodes = layout.resourcePositions.filter((r) => r.type === 'rare_node');
    expect(rareNodes.length).toBe(0);
  });

  it('spawns more rare nodes with more active panels', () => {
    const grid6 = new PanelGrid(VP_W, VP_H, 6);
    const layout6 = generateVerticalMapLayout(grid6, new SeededRandom(42), {
      hasRareResourceAccess: true,
    });
    const rareNodes6 = layout6.resourcePositions.filter((r) => r.type === 'rare_node');
    // 6 panels * 1-2 each = 6-12 rare nodes
    expect(rareNodes6.length).toBeGreaterThanOrEqual(6);
  });
});

describe('buildVerticalTerrain (panel-based)', () => {
  it('creates a TerrainGrid with correct dimensions', () => {
    const layout = makeLayout(1);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    expect(terrain.cols).toBe(layout.cols);
    expect(terrain.rows).toBe(layout.rows);
  });

  it('places water around fish node positions', () => {
    const layout = makeLayout(1);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));

    const fishNodes = layout.resourcePositions.filter((r) => r.type === 'fish_node');
    expect(fishNodes.length).toBeGreaterThan(0);

    const fishNode = fishNodes[0];
    const type = terrain.getAt(fishNode.x, fishNode.y);
    // Center should be water or shallows
    expect([1, 2]).toContain(type); // TerrainType.Water = 1, Shallows = 2
  });
});
