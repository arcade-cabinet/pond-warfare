import { describe, expect, it } from 'vitest';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';
import { EntityKind } from '@/types';

describe('terrain grid v2.0.0 additions', () => {
  it('OtterWarship can traverse water', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, EntityKind.OtterWarship);
    expect(mult).toBe(1.0); // Full speed on water
  });

  it('OtterWarship is slow on land', () => {
    const grid = new TerrainGrid(320, 320, 32);
    // Default is Grass
    const mult = grid.getSpeedMultiplier(16, 16, EntityKind.OtterWarship);
    expect(mult).toBe(0.33);
  });

  it('OtterWarship is full speed on shallows', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Shallows);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, EntityKind.OtterWarship);
    expect(mult).toBe(1.0);
  });

  it('OtterWarship is passable on water', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    expect(grid.isPassable(160 + 16, 160 + 16, EntityKind.OtterWarship)).toBe(true);
  });

  it('regular units still cannot traverse water', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, SAPPER_KIND);
    expect(mult).toBe(0); // Impassable
  });

  it('Swimmer still works on water at half speed', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, EntityKind.Swimmer);
    expect(mult).toBe(0.5);
  });
});
