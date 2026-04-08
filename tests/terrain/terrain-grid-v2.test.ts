import { describe, expect, it } from 'vitest';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';
import { EntityKind } from '@/types';

describe('terrain grid v2.0.0 additions', () => {
  it('Fish can traverse water', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, EntityKind.Fish);
    expect(mult).toBe(0.5);
  });

  it('Fish uses normal speed on land', () => {
    const grid = new TerrainGrid(320, 320, 32);
    const mult = grid.getSpeedMultiplier(16, 16, EntityKind.Fish);
    expect(mult).toBe(1.0);
  });

  it('Fish is full speed on shallows', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Shallows);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, EntityKind.Fish);
    expect(mult).toBe(0.5);
  });

  it('Fish is passable on water', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    expect(grid.isPassable(160 + 16, 160 + 16, EntityKind.Fish)).toBe(true);
  });

  it('regular units still cannot traverse water', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, SAPPER_KIND);
    expect(mult).toBe(0); // Impassable
  });

  it('Flying heron ignores water entirely', () => {
    const grid = new TerrainGrid(320, 320, 32);
    grid.set(5, 5, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(160 + 16, 160 + 16, EntityKind.FlyingHeron);
    expect(mult).toBe(1.0);
  });
});
