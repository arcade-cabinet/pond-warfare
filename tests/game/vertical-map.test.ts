/**
 * Tests: Panel-Aware Map Generator (v3.0 -- 6-Panel Map System)
 *
 * Validates:
 * - Map dimensions derived from panel grid
 * - Lodge positioned at bottom center of panel 5
 * - Resources placed within unlocked panels
 * - Enemy spawns in panels with enemy_spawn=true
 * - Terrain generation with biome painting
 * - ThornWall fill for locked panels
 * - Biome diversity: each biome produces distinct terrain distributions
 * - Primary terrain fill from biome_terrain_rules
 */

import { describe, expect, it } from 'vitest';
import { getBiomeTerrainRules } from '@/config/config-loader';
import { PanelGrid } from '@/game/panel-grid';
import {
  buildVerticalTerrain,
  generateVerticalMapLayout,
  parseTerrainType,
  type VerticalMapLayout,
} from '@/game/vertical-map';
import { type TerrainGrid, TerrainType } from '@/terrain/terrain-grid';
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
    // Panel 5 is at row=1, col=1 -> x=[VP_W, 2*VP_W], y=[VP_H, 2*VP_H]
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

describe('parseTerrainType', () => {
  it('maps known terrain name strings to TerrainType enum', () => {
    expect(parseTerrainType('grass')).toBe(TerrainType.Grass);
    expect(parseTerrainType('water')).toBe(TerrainType.Water);
    expect(parseTerrainType('shallows')).toBe(TerrainType.Shallows);
    expect(parseTerrainType('mud')).toBe(TerrainType.Mud);
    expect(parseTerrainType('rocks')).toBe(TerrainType.Rocks);
    expect(parseTerrainType('high_ground')).toBe(TerrainType.HighGround);
    expect(parseTerrainType('thorn_wall')).toBe(TerrainType.ThornWall);
  });

  it('defaults to Grass for unknown names', () => {
    expect(parseTerrainType('unknown')).toBe(TerrainType.Grass);
    expect(parseTerrainType('')).toBe(TerrainType.Grass);
  });
});

describe('biome terrain diversity', () => {
  /** Count terrain types within a panel region of the grid. */
  function countTerrainTypes(
    terrain: TerrainGrid,
    startCol: number,
    startRow: number,
    endCol: number,
    endRow: number,
  ): Map<TerrainType, number> {
    const counts = new Map<TerrainType, number>();
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const t = terrain.get(c, r);
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return counts;
  }

  /** Get terrain type counts for a specific panel. */
  function getPanelTerrainCounts(
    layout: VerticalMapLayout,
    terrain: TerrainGrid,
    panelId: 1 | 2 | 3 | 4 | 5 | 6,
  ): Map<TerrainType, number> {
    const bounds = layout.panelGrid.getPanelBounds(panelId);
    const startCol = terrain.worldToCol(bounds.x);
    const startRow = terrain.worldToRow(bounds.y);
    const endCol = terrain.worldToCol(bounds.x + bounds.width - 1);
    const endRow = terrain.worldToRow(bounds.y + bounds.height - 1);
    return countTerrainTypes(terrain, startCol, startRow, endCol, endRow);
  }

  it('all 6 biomes have terrain rules in config', () => {
    const rules = getBiomeTerrainRules();
    const expectedBiomes = [
      'grassland_clearing',
      'muddy_forest',
      'rocky_marsh',
      'flooded_swamp',
      'stone_quarry',
      'dense_thicket',
    ];
    for (const biome of expectedBiomes) {
      expect(rules[biome]).toBeDefined();
    }
  });

  it('each biome has a primary terrain type defined', () => {
    const rules = getBiomeTerrainRules();
    for (const [_biome, rule] of Object.entries(rules)) {
      expect(rule.primary).toBeTruthy();
      expect(parseTerrainType(rule.primary)).toBeDefined();
    }
  });

  it('flooded_swamp has shallows as primary, not grass', () => {
    const rules = getBiomeTerrainRules();
    expect(rules.flooded_swamp.primary).toBe('shallows');
  });

  it('flooded_swamp panel is predominantly shallows/water (not grass)', () => {
    // Stage 4 unlocks panels [5, 2, 1, 3] -- panel 3 is flooded_swamp
    const layout = makeLayout(4, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    const counts = getPanelTerrainCounts(layout, terrain, 3);

    const grass = counts.get(TerrainType.Grass) ?? 0;
    const shallows = counts.get(TerrainType.Shallows) ?? 0;
    const water = counts.get(TerrainType.Water) ?? 0;
    const mud = counts.get(TerrainType.Mud) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Shallows + water + mud should dominate; grass should be minimal
    const wetTiles = shallows + water + mud;
    expect(wetTiles).toBeGreaterThan(total * 0.4);
    // Grass should be far less than half the panel
    expect(grass).toBeLessThan(total * 0.5);
  });

  it('grassland_clearing panel has no rocks or high ground from biome rules', () => {
    // Panel 5 is grassland_clearing, always unlocked at stage 1.
    // Grassland biome rules have no rock_coverage, no high_ground_coverage,
    // and no tree_density. Fish resource painting adds water but not rocks.
    const layout = makeLayout(1, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    const counts = getPanelTerrainCounts(layout, terrain, 5);

    const rocks = counts.get(TerrainType.Rocks) ?? 0;
    const highGround = counts.get(TerrainType.HighGround) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Grassland has no rock_coverage, no high_ground_coverage, no tree_density
    expect(rocks).toBe(0);
    expect(highGround).toBe(0);
    // Mud should be very low (mud_coverage=0.05)
    const mud = counts.get(TerrainType.Mud) ?? 0;
    expect(mud).toBeLessThan(total * 0.1);
  });

  it('rocky_marsh panel has significant rock and high ground', () => {
    // Panel 1 is rocky_marsh, unlocked at stage 3
    const layout = makeLayout(3, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    const counts = getPanelTerrainCounts(layout, terrain, 1);

    const rocks = counts.get(TerrainType.Rocks) ?? 0;
    const highGround = counts.get(TerrainType.HighGround) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Rocky marsh should have meaningful rock + high ground presence
    expect(rocks + highGround).toBeGreaterThan(total * 0.05);
  });

  it('muddy_forest panel has significant mud', () => {
    // Panel 2 is muddy_forest, unlocked at stage 2
    const layout = makeLayout(2, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    const counts = getPanelTerrainCounts(layout, terrain, 2);

    const mud = counts.get(TerrainType.Mud) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Muddy forest should have noticeable mud presence
    expect(mud).toBeGreaterThan(total * 0.02);
  });

  it('stone_quarry panel has significant rocks', () => {
    // Panel 4 is stone_quarry, unlocked at stage 5
    const layout = makeLayout(5, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    const counts = getPanelTerrainCounts(layout, terrain, 4);

    const rocks = counts.get(TerrainType.Rocks) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Stone quarry should have the highest rock concentration
    expect(rocks).toBeGreaterThan(total * 0.03);
  });

  it('dense_thicket panel has significant high ground from trees', () => {
    // Panel 6 is dense_thicket, unlocked at stage 6 (full grid).
    const layout = makeLayout(6, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));
    const counts = getPanelTerrainCounts(layout, terrain, 6);

    const highGround = counts.get(TerrainType.HighGround) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Dense thicket has tree_density=0.35 which paints HighGround
    expect(highGround).toBeGreaterThan(total * 0.02);
  });

  it('different biomes produce distinct terrain distributions', () => {
    // Full map with all panels unlocked
    const layout = makeLayout(6, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));

    // Collect terrain type ratios for each panel
    const panelRatios: Map<number, Map<TerrainType, number>> = new Map();
    for (const panelId of [1, 2, 3, 4, 5, 6] as const) {
      const counts = getPanelTerrainCounts(layout, terrain, panelId);
      const total = [...counts.values()].reduce((a, b) => a + b, 0);
      const ratios = new Map<TerrainType, number>();
      for (const [t, c] of counts) {
        ratios.set(t, c / total);
      }
      panelRatios.set(panelId, ratios);
    }

    // Panel 3 (flooded_swamp) should have more water than panel 5 (grassland)
    const p3water =
      (panelRatios.get(3)?.get(TerrainType.Shallows) ?? 0) +
      (panelRatios.get(3)?.get(TerrainType.Water) ?? 0);
    const p5water =
      (panelRatios.get(5)?.get(TerrainType.Shallows) ?? 0) +
      (panelRatios.get(5)?.get(TerrainType.Water) ?? 0);
    expect(p3water).toBeGreaterThan(p5water);

    // Panel 4 (stone_quarry) should have more rocks than panel 2 (muddy_forest)
    const p4rocks = panelRatios.get(4)?.get(TerrainType.Rocks) ?? 0;
    const p2rocks = panelRatios.get(2)?.get(TerrainType.Rocks) ?? 0;
    expect(p4rocks).toBeGreaterThan(p2rocks);

    // Panel 2 (muddy_forest) should have more mud than panel 5 (grassland)
    const p2mud = panelRatios.get(2)?.get(TerrainType.Mud) ?? 0;
    const p5mud = panelRatios.get(5)?.get(TerrainType.Mud) ?? 0;
    expect(p2mud).toBeGreaterThan(p5mud);
  });

  it('locked panels are filled with ThornWall, not biome terrain', () => {
    // Stage 1 only unlocks panel 5, so panels 1-4,6 should be ThornWall
    const layout = makeLayout(1, 42);
    const terrain = buildVerticalTerrain(layout, new SeededRandom(42));

    // Check panel 1 (locked at stage 1)
    const counts = getPanelTerrainCounts(layout, terrain, 1);
    const thornWall = counts.get(TerrainType.ThornWall) ?? 0;
    const total = [...counts.values()].reduce((a, b) => a + b, 0);

    // Locked panel should be entirely ThornWall
    expect(thornWall).toBe(total);
  });
});
