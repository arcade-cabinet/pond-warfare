/**
 * Tests: Pinch-Zoom (T22)
 *
 * Validates that PointerHandler's two-finger pinch logic:
 * - Computes zoom from distance ratio between two pointers
 * - Clamps zoom to computeMinZoom lower bound
 * - Clamps zoom to PANEL_MAX_ZOOM upper bound
 */

import { describe, expect, it } from 'vitest';
import { PanelGrid } from '@/game/panel-grid';
import { computeMinZoom, PANEL_MAX_ZOOM } from '@/rendering/camera';

/**
 * We test the pinch-zoom factor computation logic directly rather than
 * instantiating PointerHandler (which requires a real DOM container/canvas).
 *
 * The pinch-zoom logic in pointer.ts:
 *   scale = currentDist / lastPinchDist
 *   newZoom = clamp(world.zoomLevel * scale, minZoom, PANEL_MAX_ZOOM)
 *
 * We replicate that formula to verify correctness.
 */

function computePinchZoom(
  currentZoom: number,
  lastPinchDist: number,
  currentPinchDist: number,
  panelGrid: PanelGrid | null,
): number {
  const scale = currentPinchDist / lastPinchDist;
  const minZ = panelGrid ? computeMinZoom(panelGrid) : 0.5;
  return Math.max(minZ, Math.min(PANEL_MAX_ZOOM, currentZoom * scale));
}

describe('Pinch-zoom factor', () => {
  it('increases zoom when fingers spread apart', () => {
    const grid = new PanelGrid(960, 540, 1);
    const newZoom = computePinchZoom(1.0, 100, 150, grid);
    expect(newZoom).toBeCloseTo(1.5);
  });

  it('decreases zoom when fingers pinch together', () => {
    const grid = new PanelGrid(960, 540, 2);
    const newZoom = computePinchZoom(1.0, 200, 100, grid);
    expect(newZoom).toBeCloseTo(0.5);
  });

  it('clamps to computeMinZoom lower bound', () => {
    const grid = new PanelGrid(960, 540, 1); // min zoom = 1.0 for single panel
    const minZ = computeMinZoom(grid);
    expect(minZ).toBeCloseTo(1.0);

    // Pinch to zoom out further than min
    const newZoom = computePinchZoom(1.0, 100, 30, grid);
    expect(newZoom).toBe(minZ);
  });

  it('clamps to PANEL_MAX_ZOOM upper bound', () => {
    const grid = new PanelGrid(960, 540, 6);
    // Try to zoom way in
    const newZoom = computePinchZoom(1.0, 50, 500, grid);
    expect(newZoom).toBe(PANEL_MAX_ZOOM);
    expect(PANEL_MAX_ZOOM).toBe(1.5);
  });

  it('respects min zoom for multi-panel grids', () => {
    const grid = new PanelGrid(960, 540, 6); // All 6 panels, min zoom = 1/3
    const minZ = computeMinZoom(grid);
    expect(minZ).toBeCloseTo(1 / 3);

    // Zoom out past minimum
    const newZoom = computePinchZoom(0.5, 100, 10, grid);
    expect(newZoom).toBeCloseTo(minZ);
  });

  it('no-ops when pinch distance does not change', () => {
    const grid = new PanelGrid(960, 540, 2);
    const newZoom = computePinchZoom(0.8, 200, 200, grid);
    expect(newZoom).toBeCloseTo(0.8);
  });

  it('works without panelGrid (fallback min 0.5)', () => {
    const newZoom = computePinchZoom(1.0, 200, 50, null);
    expect(newZoom).toBe(0.5);
  });

  it('handles progressive pinch-zoom in small increments', () => {
    const grid = new PanelGrid(960, 540, 2);
    let zoom = 1.0;

    // Simulate 5 small pinch-in steps
    for (let i = 0; i < 5; i++) {
      zoom = computePinchZoom(zoom, 100, 95, grid);
    }
    expect(zoom).toBeLessThan(1.0);
    expect(zoom).toBeGreaterThan(computeMinZoom(grid));
  });
});
