/**
 * Terrain Tile Blending Tests
 *
 * Validates that the biome tinting system blends colors at tile
 * boundaries instead of showing hard grid edges.
 */

import { describe, expect, it } from 'vitest';
import { applyBiomeTint, applyTintEntry, lerpRGB } from '@/rendering/background-biome';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';

describe('lerpRGB', () => {
  it('should return first color at t=0', () => {
    const a = { r: 100, g: 50, b: 0 };
    const b = { r: 200, g: 100, b: 50 };
    const result = lerpRGB(a, b, 0);
    expect(result).toEqual({ r: 100, g: 50, b: 0 });
  });

  it('should return second color at t=1', () => {
    const a = { r: 100, g: 50, b: 0 };
    const b = { r: 200, g: 100, b: 50 };
    const result = lerpRGB(a, b, 1);
    expect(result).toEqual({ r: 200, g: 100, b: 50 });
  });

  it('should return midpoint at t=0.5', () => {
    const a = { r: 0, g: 0, b: 0 };
    const b = { r: 200, g: 100, b: 50 };
    const result = lerpRGB(a, b, 0.5);
    expect(result).toEqual({ r: 100, g: 50, b: 25 });
  });
});

describe('applyTintEntry', () => {
  it('should blend base with tint at given strength', () => {
    const base = { r: 100, g: 100, b: 100 };
    const entry = { color: { r: 0, g: 0, b: 0 }, strength: 0.5 };
    const result = applyTintEntry(base, entry);
    expect(result).toEqual({ r: 50, g: 50, b: 50 });
  });

  it('should not change base at strength 0', () => {
    const base = { r: 100, g: 80, b: 60 };
    const entry = { color: { r: 0, g: 255, b: 0 }, strength: 0 };
    const result = applyTintEntry(base, entry);
    expect(result).toEqual({ r: 100, g: 80, b: 60 });
  });

  it('should replace with tint at strength 1', () => {
    const base = { r: 100, g: 80, b: 60 };
    const entry = { color: { r: 50, g: 70, b: 30 }, strength: 1 };
    const result = applyTintEntry(base, entry);
    expect(result).toEqual({ r: 50, g: 70, b: 30 });
  });

  it('should clamp to 0-255', () => {
    const base = { r: 250, g: 250, b: 250 };
    const entry = { color: { r: 255, g: 255, b: 255 }, strength: 0.5 };
    const result = applyTintEntry(base, entry);
    expect(result.r).toBeLessThanOrEqual(255);
    expect(result.g).toBeLessThanOrEqual(255);
    expect(result.b).toBeLessThanOrEqual(255);
  });
});

describe('applyBiomeTint tile-edge blending', () => {
  it('should apply pure water tint at tile center without blending', () => {
    const grid = new TerrainGrid(128, 128, 32);
    // Fill tile (0,0) with water, tile (1,0) with grass (default)
    grid.set(0, 0, TerrainType.Water);
    grid.set(1, 0, TerrainType.Grass);

    const base = { r: 100, g: 100, b: 100 };

    // At tile center (16, 16) -- well inside tile
    const centerColor = applyBiomeTint(base, grid, 16, 16);
    // Should be a solid water tint, not blended
    expect(centerColor).toBeDefined();
    expect(centerColor.r).toBeLessThan(100); // Water tint is dark blue
    expect(centerColor.b).toBeGreaterThan(centerColor.r); // Water is blue-shifted
  });

  it('should blend at tile boundary', () => {
    const grid = new TerrainGrid(128, 128, 32);
    grid.set(0, 0, TerrainType.Water);
    grid.set(1, 0, TerrainType.Mud);

    const base = { r: 100, g: 100, b: 100 };

    // At pixel (31, 16) -- right edge of tile 0, near boundary with tile 1
    const edgeColor = applyBiomeTint(base, grid, 31, 16);
    // At pixel (16, 16) -- center of tile 0 (pure water)
    const waterCenter = applyBiomeTint(base, grid, 16, 16);
    // At pixel (48, 16) -- center of tile 1 (pure mud)
    const mudCenter = applyBiomeTint(base, grid, 48, 16);

    // Edge color should be between the two tile centers
    // (not exactly equal to either pure tint)
    expect(edgeColor).toBeDefined();
    // It should be a blend -- not exactly the water color
    const isExactWater =
      edgeColor.r === waterCenter.r &&
      edgeColor.g === waterCenter.g &&
      edgeColor.b === waterCenter.b;
    const isExactMud =
      edgeColor.r === mudCenter.r && edgeColor.g === mudCenter.g && edgeColor.b === mudCenter.b;
    // At tile edge, color should be blended (not exactly one or the other)
    expect(isExactWater || isExactMud).toBe(false);
  });

  it('should return ThornWall color for ThornWall tiles', () => {
    const grid = new TerrainGrid(128, 128, 32);
    grid.set(0, 0, TerrainType.ThornWall);

    const base = { r: 200, g: 200, b: 200 };
    const result = applyBiomeTint(base, grid, 16, 16);

    // ThornWall produces dark green, not the bright base color
    expect(result.r).toBeLessThan(60);
    expect(result.g).toBeGreaterThan(result.r); // Green-shifted
    expect(result.b).toBeLessThan(result.g);
  });

  it('should return base for grass tiles without panel grid', () => {
    const grid = new TerrainGrid(128, 128, 32);
    // Default is all grass

    const base = { r: 150, g: 120, b: 90 };
    // At tile center (well inside the tile, no blending zone)
    const result = applyBiomeTint(base, grid, 16, 16);
    expect(result).toEqual(base);
  });

  it('should handle uniform terrain without visible blending artifacts', () => {
    const grid = new TerrainGrid(128, 128, 32);
    // All tiles are mud
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        grid.set(c, r, TerrainType.Mud);
      }
    }

    const base = { r: 100, g: 100, b: 100 };
    // At a tile center and at a tile edge, colors should be the same
    // because all neighbors have the same terrain type
    const center = applyBiomeTint(base, grid, 48, 48);
    const edge = applyBiomeTint(base, grid, 32, 48);

    expect(center.r).toBe(edge.r);
    expect(center.g).toBe(edge.g);
    expect(center.b).toBe(edge.b);
  });
});
