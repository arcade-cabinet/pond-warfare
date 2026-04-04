/**
 * Camera Zoom Tests
 *
 * v3 panel-map: computeInitialZoom always returns 1.0 (one panel = one viewport).
 * computeMinZoom returns the ratio to fit all unlocked panels in one viewport.
 * PANEL_MAX_ZOOM is 1.5 for close-up micro.
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';
import { computeInitialZoom, computeMinZoom, PANEL_MAX_ZOOM } from '@/rendering/camera';

describe('computeInitialZoom', () => {
  it('always returns 1.0 (one panel fills the viewport)', () => {
    expect(computeInitialZoom(1600, 1920)).toBe(1.0);
    expect(computeInitialZoom(1600, 800)).toBe(1.0);
    expect(computeInitialZoom(100, 10000)).toBe(1.0);
    expect(computeInitialZoom(10000, 100)).toBe(1.0);
  });
});

describe('PANEL_MAX_ZOOM', () => {
  it('is 1.5 for close-up micro', () => {
    expect(PANEL_MAX_ZOOM).toBe(1.5);
  });
});

describe('computeMinZoom', () => {
  it('returns 1.0 for a single panel (stage 1)', () => {
    const grid = new PanelGrid(960, 540, 1);
    expect(computeMinZoom(grid)).toBeCloseTo(1.0);
  });

  it('returns 0.5 for two vertical panels (stage 2: panels 5+2)', () => {
    const grid = new PanelGrid(960, 540, 2);
    // Panels 5 (row 1) and 2 (row 0) span 2 rows, 1 col
    // regionH = 2 * 540 = 1080, panelH = 540 -> zoomY = 0.5
    // regionW = 1 * 960 = 960, panelW = 960 -> zoomX = 1.0
    // min(1.0, 0.5) = 0.5
    expect(computeMinZoom(grid)).toBeCloseTo(0.5);
  });

  it('returns correct zoom for 3 panels (stage 3)', () => {
    const grid = new PanelGrid(960, 540, 3);
    const minZ = computeMinZoom(grid);
    // Stage 3 adds panel 1 or 3, so now 2 cols x 2 rows
    // regionW = 2 * 960 = 1920, zoomX = 960/1920 = 0.5
    // regionH = 2 * 540 = 1080, zoomY = 540/1080 = 0.5
    expect(minZ).toBeCloseTo(0.5);
  });

  it('returns correct zoom for all 6 panels (stage 6)', () => {
    const grid = new PanelGrid(960, 540, 6);
    // 3 cols x 2 rows
    // regionW = 3 * 960 = 2880, zoomX = 960/2880 = 1/3
    // regionH = 2 * 540 = 1080, zoomY = 540/1080 = 0.5
    // min(1/3, 0.5) = 1/3
    expect(computeMinZoom(grid)).toBeCloseTo(1 / 3);
  });
});
