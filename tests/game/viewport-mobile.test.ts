/**
 * Tests: Mobile Viewport (T44)
 *
 * Validates PanelGrid at 667x375 (iPhone SE landscape):
 * - Panel dimensions match viewport
 * - computeMinZoom returns valid bounds for mobile
 * - World dimensions scale correctly
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';
import { computeMinZoom, PANEL_MAX_ZOOM } from '@/rendering/camera';

const MOBILE_W = 667;
const MOBILE_H = 375;

describe('PanelGrid at iPhone SE landscape (667x375)', () => {
  it('panel dimensions match viewport', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 1);
    expect(grid.panelWidth).toBe(667);
    expect(grid.panelHeight).toBe(375);
  });

  it('world dimensions are 3x panels wide, 2x panels tall', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 1);
    const dims = grid.getWorldDimensions();
    expect(dims.width).toBe(667 * 3);
    expect(dims.height).toBe(375 * 2);
  });

  it('computeMinZoom returns 1.0 for single panel (stage 1)', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 1);
    const minZ = computeMinZoom(grid);
    expect(minZ).toBeCloseTo(1.0);
  });

  it('computeMinZoom returns 0.5 for two vertical panels (stage 2)', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 2);
    const minZ = computeMinZoom(grid);
    // regionH = 2 * 375 = 750, zoomY = 375/750 = 0.5
    // regionW = 1 * 667 = 667, zoomX = 667/667 = 1.0
    // min(1.0, 0.5) = 0.5
    expect(minZ).toBeCloseTo(0.5);
  });

  it('computeMinZoom fits all 6 panels at stage 6', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 6);
    const minZ = computeMinZoom(grid);
    // regionW = 3 * 667 = 2001, zoomX = 667/2001 = 1/3
    // regionH = 2 * 375 = 750, zoomY = 375/750 = 0.5
    // min(1/3, 0.5) = 1/3
    expect(minZ).toBeCloseTo(1 / 3);
  });

  it('zoom range is valid (min < max)', () => {
    for (let stage = 1; stage <= 6; stage++) {
      const grid = new PanelGrid(MOBILE_W, MOBILE_H, stage);
      const minZ = computeMinZoom(grid);
      expect(minZ).toBeLessThanOrEqual(PANEL_MAX_ZOOM);
      expect(minZ).toBeGreaterThan(0);
    }
  });

  it('Lodge position is correctly placed within mobile panel bounds', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 1);
    const lodge = grid.getLodgePosition();
    const bounds = grid.getPanelBounds(5);

    expect(lodge.x).toBeGreaterThanOrEqual(bounds.x);
    expect(lodge.x).toBeLessThanOrEqual(bounds.x + bounds.width);
    expect(lodge.y).toBeGreaterThanOrEqual(bounds.y);
    expect(lodge.y).toBeLessThanOrEqual(bounds.y + bounds.height);
  });

  it('unlocked bounds at stage 1 match panel 5 exactly', () => {
    const grid = new PanelGrid(MOBILE_W, MOBILE_H, 1);
    const bounds = grid.getUnlockedBounds();
    const panel5 = grid.getPanelBounds(5);

    expect(bounds.minX).toBe(panel5.x);
    expect(bounds.minY).toBe(panel5.y);
    expect(bounds.maxX).toBe(panel5.x + panel5.width);
    expect(bounds.maxY).toBe(panel5.y + panel5.height);
  });
});
