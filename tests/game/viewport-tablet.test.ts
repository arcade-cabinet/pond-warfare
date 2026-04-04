/**
 * Tests: Tablet Viewport (T45)
 *
 * Validates PanelGrid at 1194x834 (iPad Air landscape):
 * - Panel dimensions match viewport
 * - computeMinZoom returns valid bounds for tablet
 * - World dimensions scale correctly
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';
import { computeMinZoom, PANEL_MAX_ZOOM } from '@/rendering/camera';

const TABLET_W = 1194;
const TABLET_H = 834;

describe('PanelGrid at iPad Air landscape (1194x834)', () => {
  it('panel dimensions match viewport', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 1);
    expect(grid.panelWidth).toBe(1194);
    expect(grid.panelHeight).toBe(834);
  });

  it('world dimensions are 3x panels wide, 2x panels tall', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 1);
    const dims = grid.getWorldDimensions();
    expect(dims.width).toBe(1194 * 3);
    expect(dims.height).toBe(834 * 2);
  });

  it('computeMinZoom returns 1.0 for single panel (stage 1)', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 1);
    const minZ = computeMinZoom(grid);
    expect(minZ).toBeCloseTo(1.0);
  });

  it('computeMinZoom returns 0.5 for two vertical panels (stage 2)', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 2);
    const minZ = computeMinZoom(grid);
    // regionH = 2 * 834 = 1668, zoomY = 834/1668 = 0.5
    // regionW = 1 * 1194 = 1194, zoomX = 1194/1194 = 1.0
    // min(1.0, 0.5) = 0.5
    expect(minZ).toBeCloseTo(0.5);
  });

  it('computeMinZoom fits all 6 panels at stage 6', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 6);
    const minZ = computeMinZoom(grid);
    // regionW = 3 * 1194 = 3582, zoomX = 1194/3582 = 1/3
    // regionH = 2 * 834 = 1668, zoomY = 834/1668 = 0.5
    // min(1/3, 0.5) = 1/3
    expect(minZ).toBeCloseTo(1 / 3);
  });

  it('zoom range is valid (min < max) at all stages', () => {
    for (let stage = 1; stage <= 6; stage++) {
      const grid = new PanelGrid(TABLET_W, TABLET_H, stage);
      const minZ = computeMinZoom(grid);
      expect(minZ).toBeLessThanOrEqual(PANEL_MAX_ZOOM);
      expect(minZ).toBeGreaterThan(0);
    }
  });

  it('Lodge position within panel 5 bounds', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 1);
    const lodge = grid.getLodgePosition();
    const bounds = grid.getPanelBounds(5);

    expect(lodge.x).toBeGreaterThanOrEqual(bounds.x);
    expect(lodge.x).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(lodge.y).toBeGreaterThanOrEqual(bounds.y);
    expect(lodge.y).toBeLessThanOrEqual(bounds.y + bounds.height);
  });

  it('unlocked bounds at stage 1 match panel 5 exactly', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 1);
    const bounds = grid.getUnlockedBounds();
    const panel5 = grid.getPanelBounds(5);

    expect(bounds.minX).toBe(panel5.x);
    expect(bounds.minY).toBe(panel5.y);
    expect(bounds.maxX).toBe(panel5.x + panel5.width);
    expect(bounds.maxY).toBe(panel5.y + panel5.height);
  });

  it('panel aspect ratio is preserved (wider than mobile)', () => {
    const mobileGrid = new PanelGrid(667, 375, 1);
    const tabletGrid = new PanelGrid(TABLET_W, TABLET_H, 1);

    // Tablet panels are larger than mobile
    expect(tabletGrid.panelWidth).toBeGreaterThan(mobileGrid.panelWidth);
    expect(tabletGrid.panelHeight).toBeGreaterThan(mobileGrid.panelHeight);

    // Both have same structure (3x2 grid)
    expect(tabletGrid.getWorldDimensions().width / tabletGrid.panelWidth).toBe(3);
    expect(tabletGrid.getWorldDimensions().height / tabletGrid.panelHeight).toBe(2);
  });

  it('computeMinZoom for L-shape (stage 3) on tablet', () => {
    const grid = new PanelGrid(TABLET_W, TABLET_H, 3);
    const minZ = computeMinZoom(grid);
    // Stage 3 default: panels 5, 2, 1 -> 2 cols x 2 rows
    // regionW = 2 * 1194 = 2388, zoomX = 1194/2388 = 0.5
    // regionH = 2 * 834 = 1668, zoomY = 834/1668 = 0.5
    // min(0.5, 0.5) = 0.5
    expect(minZ).toBeCloseTo(0.5);
  });
});
