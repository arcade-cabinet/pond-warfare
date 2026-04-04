/**
 * Tests: PanelGrid (v3.0 — 6-Panel Map System)
 *
 * Validates:
 * - Grid dimensions computed from viewport
 * - Unlock progression through stages 1-6
 * - Lodge position in panel 5
 * - World-to-panel coordinate mapping
 * - Unlocked bounds calculation
 * - ThornWall terrain impassability
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';

const VP_W = 960;
const VP_H = 540;

describe('PanelGrid dimensions', () => {
  it('computes correct dimensions from 960x540 viewport', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    expect(grid.panelWidth).toBe(960);
    expect(grid.panelHeight).toBe(540);
    const world = grid.getWorldDimensions();
    expect(world.width).toBe(2880);
    expect(world.height).toBe(1080);
  });

  it('computes correct dimensions from mobile viewport (667x375 landscape)', () => {
    const grid = new PanelGrid(667, 375, 1);
    expect(grid.panelWidth).toBe(667);
    expect(grid.panelHeight).toBe(375);
    const world = grid.getWorldDimensions();
    expect(world.width).toBe(667 * 3);
    expect(world.height).toBe(375 * 2);
  });
});

describe('PanelGrid unlock progression', () => {
  it('panel 5 is always unlocked at stage 1', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    expect(grid.isPanelUnlocked(5)).toBe(true);
    expect(grid.getActivePanels()).toEqual([5]);
  });

  it('stage 2 unlocks panels 5 and 2', () => {
    const grid = new PanelGrid(VP_W, VP_H, 2);
    expect(grid.isPanelUnlocked(5)).toBe(true);
    expect(grid.isPanelUnlocked(2)).toBe(true);
    expect(grid.getActivePanels()).toEqual([2, 5]);
  });

  it('stage 3 unlocks 3 panels (deterministic default picks panel 1)', () => {
    const grid = new PanelGrid(VP_W, VP_H, 3);
    const active = grid.getActivePanels();
    expect(active).toHaveLength(3);
    expect(active).toContain(5);
    expect(active).toContain(2);
    // Deterministic default picks first of [1,3] = panel 1
    expect(active).toContain(1);
  });

  it('stage 3 with RNG coin flip picks panel 3 instead of 1', () => {
    const grid = new PanelGrid(VP_W, VP_H, 3);
    grid.computeUnlockedPanelsWithRng(3, true, false);
    const active = grid.getActivePanels();
    expect(active).toHaveLength(3);
    expect(active).toContain(3);
    expect(active).not.toContain(1);
  });

  it('stage 6 unlocks all 6 panels', () => {
    const grid = new PanelGrid(VP_W, VP_H, 6);
    expect(grid.getActivePanels()).toHaveLength(6);
    for (const id of [1, 2, 3, 4, 5, 6] as const) {
      expect(grid.isPanelUnlocked(id)).toBe(true);
    }
  });
});

describe('PanelGrid Lodge position', () => {
  it('getLodgePosition returns center-bottom of panel 5', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    const lodge = grid.getLodgePosition();
    // Panel 5: row=1, col=1 → x starts at 960, y starts at 540
    const expectedX = VP_W + VP_W / 2; // 1440
    const expectedY = VP_H + VP_H * 0.9; // 540 + 486 = 1026
    expect(lodge.x).toBe(expectedX);
    expect(lodge.y).toBe(expectedY);
  });
});

describe('PanelGrid worldToPanel', () => {
  it('maps coordinates inside panel 5 to panel 5', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    // Panel 5 center: (960 + 480, 540 + 270)
    expect(grid.worldToPanel(1440, 810)).toBe(5);
  });

  it('maps coordinates in top-left corner to panel 1', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    expect(grid.worldToPanel(100, 100)).toBe(1);
  });

  it('maps coordinates in panel 6 area', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    // Panel 6: row=1, col=2 → x=[1920, 2880], y=[540, 1080]
    expect(grid.worldToPanel(2000, 600)).toBe(6);
  });

  it('returns null for out-of-bounds coordinates', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    expect(grid.worldToPanel(-10, 100)).toBeNull();
    expect(grid.worldToPanel(100, -10)).toBeNull();
    expect(grid.worldToPanel(3000, 100)).toBeNull();
    expect(grid.worldToPanel(100, 1200)).toBeNull();
  });
});

describe('PanelGrid getUnlockedBounds', () => {
  it('returns tight bounds around panel 5 at stage 1', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    const bounds = grid.getUnlockedBounds();
    expect(bounds.minX).toBe(VP_W); // Panel 5 starts at col 1
    expect(bounds.minY).toBe(VP_H); // Panel 5 starts at row 1
    expect(bounds.maxX).toBe(VP_W * 2);
    expect(bounds.maxY).toBe(VP_H * 2);
  });

  it('returns bounds covering panels 2 and 5 at stage 2', () => {
    const grid = new PanelGrid(VP_W, VP_H, 2);
    const bounds = grid.getUnlockedBounds();
    // Panel 2 is row=0, col=1; Panel 5 is row=1, col=1
    expect(bounds.minX).toBe(VP_W);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(VP_W * 2);
    expect(bounds.maxY).toBe(VP_H * 2);
  });

  it('returns full world bounds at stage 6', () => {
    const grid = new PanelGrid(VP_W, VP_H, 6);
    const bounds = grid.getUnlockedBounds();
    expect(bounds.minX).toBe(0);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxX).toBe(VP_W * 3);
    expect(bounds.maxY).toBe(VP_H * 2);
  });
});

describe('PanelGrid isPanelUnlocked', () => {
  it('returns false for locked panels at stage 1', () => {
    const grid = new PanelGrid(VP_W, VP_H, 1);
    expect(grid.isPanelUnlocked(1)).toBe(false);
    expect(grid.isPanelUnlocked(2)).toBe(false);
    expect(grid.isPanelUnlocked(3)).toBe(false);
    expect(grid.isPanelUnlocked(4)).toBe(false);
    expect(grid.isPanelUnlocked(6)).toBe(false);
  });
});

describe('ThornWall terrain', () => {
  it('ThornWall has speed multiplier 0 (impassable)', () => {
    const terrain = new TerrainGrid(100, 100, 10);
    expect(terrain.speedMult(TerrainType.ThornWall)).toBe(0);
  });

  it('ThornWall blocks even flying units', () => {
    const terrain = new TerrainGrid(100, 100, 10);
    terrain.set(5, 5, TerrainType.ThornWall);
    const flyingHeron = 37;
    const worldX = 55; // tile col 5
    const worldY = 55; // tile row 5
    expect(terrain.getSpeedMultiplier(worldX, worldY, flyingHeron)).toBe(0);
    expect(terrain.isPassable(worldX, worldY, flyingHeron)).toBe(false);
  });

  it('ThornWall blocks all regular unit types', () => {
    const terrain = new TerrainGrid(100, 100, 10);
    terrain.set(5, 5, TerrainType.ThornWall);
    const worldX = 55;
    const worldY = 55;
    // Regular unit (kind 0), swimmer (28), diver (33)
    for (const kind of [0, 28, 33, 40]) {
      expect(terrain.getSpeedMultiplier(worldX, worldY, kind)).toBe(0);
      expect(terrain.isPassable(worldX, worldY, kind)).toBe(false);
    }
  });
});
