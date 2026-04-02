import { describe, expect, it } from 'vitest';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';

describe('TerrainGrid', () => {
  const TILE = 32;
  const W = 256; // 8 tiles wide
  const H = 256; // 8 tiles tall

  it('initializes all tiles as Grass', () => {
    const grid = new TerrainGrid(W, H, TILE);
    expect(grid.cols).toBe(8);
    expect(grid.rows).toBe(8);
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        expect(grid.get(c, r)).toBe(TerrainType.Grass);
      }
    }
  });

  it('set and get work correctly', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(3, 4, TerrainType.Mud);
    expect(grid.get(3, 4)).toBe(TerrainType.Mud);
    expect(grid.get(2, 4)).toBe(TerrainType.Grass);
  });

  it('getAt maps world coordinates to tiles', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(2, 3, TerrainType.Water);
    // World position (2*32 + 16, 3*32 + 16) = center of tile (2,3)
    expect(grid.getAt(2 * TILE + 16, 3 * TILE + 16)).toBe(TerrainType.Water);
    // World position (0, 0) = tile (0,0) which is Grass
    expect(grid.getAt(0, 0)).toBe(TerrainType.Grass);
  });

  it('clamps out-of-bounds coordinates', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(7, 7, TerrainType.HighGround);
    // Out of bounds returns Grass via get()
    expect(grid.get(-1, 0)).toBe(TerrainType.Grass);
    expect(grid.get(0, -1)).toBe(TerrainType.Grass);
    expect(grid.get(100, 0)).toBe(TerrainType.Grass);
    // getAt clamps to edge tiles
    expect(grid.getAt(9999, 9999)).toBe(TerrainType.HighGround);
  });

  describe('speedMult', () => {
    const grid = new TerrainGrid(W, H, TILE);

    it('returns 1.0 for Grass', () => {
      expect(grid.speedMult(TerrainType.Grass)).toBe(1.0);
    });

    it('returns 0 for Water (impassable)', () => {
      expect(grid.speedMult(TerrainType.Water)).toBe(0);
    });

    it('returns 0.5 for Shallows', () => {
      expect(grid.speedMult(TerrainType.Shallows)).toBe(0.5);
    });

    it('returns 0.75 for Mud', () => {
      expect(grid.speedMult(TerrainType.Mud)).toBe(0.75);
    });

    it('returns 0 for Rocks (impassable)', () => {
      expect(grid.speedMult(TerrainType.Rocks)).toBe(0);
    });

    it('returns 1.0 for HighGround', () => {
      expect(grid.speedMult(TerrainType.HighGround)).toBe(1.0);
    });
  });

  describe('getSpeedMultiplier with entity kinds', () => {
    it('returns 0 for non-swimmer on water', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.set(1, 1, TerrainType.Water);
      // EntityKind.Brawler = 1 (not a swimmer)
      expect(grid.getSpeedMultiplier(1 * TILE + 5, 1 * TILE + 5, 1)).toBe(0);
    });

    it('returns 0.5 for Swimmer on water', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.set(1, 1, TerrainType.Water);
      // EntityKind.Swimmer = 28
      expect(grid.getSpeedMultiplier(1 * TILE + 5, 1 * TILE + 5, 28)).toBe(0.5);
    });

    it('returns 0.5 for Fish on water', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.set(1, 1, TerrainType.Water);
      // EntityKind.Fish = 32
      expect(grid.getSpeedMultiplier(1 * TILE + 5, 1 * TILE + 5, 32)).toBe(0.5);
    });

    it('returns normal speed for Swimmer on grass', () => {
      const grid = new TerrainGrid(W, H, TILE);
      expect(grid.getSpeedMultiplier(1 * TILE + 5, 1 * TILE + 5, 28)).toBe(1.0);
    });
  });

  describe('isPassable', () => {
    it('returns false for non-swimmer on water', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.set(0, 0, TerrainType.Water);
      expect(grid.isPassable(5, 5, 1)).toBe(false);
    });

    it('returns true for Swimmer on water', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.set(0, 0, TerrainType.Water);
      expect(grid.isPassable(5, 5, 28)).toBe(true);
    });

    it('returns false for any unit on rocks', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.set(0, 0, TerrainType.Rocks);
      expect(grid.isPassable(5, 5, 28)).toBe(false);
      expect(grid.isPassable(5, 5, 1)).toBe(false);
    });
  });

  describe('fillRect', () => {
    it('fills a rectangular region', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.fillRect(2, 2, 3, 2, TerrainType.Mud);
      expect(grid.get(2, 2)).toBe(TerrainType.Mud);
      expect(grid.get(4, 3)).toBe(TerrainType.Mud);
      expect(grid.get(1, 2)).toBe(TerrainType.Grass);
      expect(grid.get(5, 2)).toBe(TerrainType.Grass);
    });
  });

  describe('fillCircle', () => {
    it('fills a circular region', () => {
      const grid = new TerrainGrid(W, H, TILE);
      grid.fillCircle(4, 4, 2, TerrainType.HighGround);
      expect(grid.get(4, 4)).toBe(TerrainType.HighGround);
      expect(grid.get(4, 2)).toBe(TerrainType.HighGround);
      expect(grid.get(0, 0)).toBe(TerrainType.Grass);
    });
  });
});
