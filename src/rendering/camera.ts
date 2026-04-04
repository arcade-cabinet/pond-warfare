/**
 * Camera System
 *
 * Handles camera state (camX, camY), panel-aware zoom bounds,
 * pan clamping to unlocked panels, and screen shake offset.
 */

import type { GameWorld } from '@/ecs/world';
import type { PanelGrid } from '@/game/panel-grid';
import { screenShakeEnabled } from '@/ui/store';

export interface CameraShake {
  offsetX: number;
  offsetY: number;
}

/**
 * Clamp the camera so it cannot pan beyond unlocked panel bounds.
 *
 * When a PanelGrid is available, the camera is restricted to the
 * bounding box of unlocked panels (no peeking into thorn walls).
 * Falls back to full world bounds when no panel grid exists.
 */
export function clampCamera(world: GameWorld): void {
  const panelGrid = world.panelGrid;
  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;

  if (panelGrid) {
    const bounds = panelGrid.getUnlockedBounds();
    minX = bounds.minX;
    minY = bounds.minY;
    maxX = bounds.maxX;
    maxY = bounds.maxY;
  } else {
    minX = 0;
    minY = 0;
    maxX = world.worldWidth;
    maxY = world.worldHeight;
  }

  const regionW = maxX - minX;
  const regionH = maxY - minY;

  if (regionW <= world.viewWidth) {
    world.camX = minX - (world.viewWidth - regionW) / 2;
  } else {
    world.camX = Math.max(minX, Math.min(maxX - world.viewWidth, world.camX));
  }

  if (regionH <= world.viewHeight) {
    world.camY = minY - (world.viewHeight - regionH) / 2;
  } else {
    world.camY = Math.max(minY, Math.min(maxY - world.viewHeight, world.camY));
  }
}

/**
 * Compute the current screen-shake offset.
 */
const MAX_SHAKE_OFFSET = 10;
export function computeShakeOffset(world: GameWorld): CameraShake {
  if (!screenShakeEnabled.value) {
    return { offsetX: 0, offsetY: 0 };
  }
  if (world.shakeTimer > 0) {
    return {
      offsetX: (Math.random() - 0.5) * Math.min(world.shakeTimer, MAX_SHAKE_OFFSET),
      offsetY: (Math.random() - 0.5) * Math.min(world.shakeTimer, MAX_SHAKE_OFFSET),
    };
  }
  return { offsetX: 0, offsetY: 0 };
}

/**
 * Base zoom: one panel fills the entire viewport = 1.0.
 * Panel dimensions are already sized to match the viewport.
 */
export function computeInitialZoom(_worldWidth: number, _viewportWidth: number): number {
  return 1.0;
}

/** Max zoom for close-up micro (1.5× one panel fills screen). */
export const PANEL_MAX_ZOOM = 1.5;

/**
 * Compute the minimum zoom so all unlocked panels fit in the viewport.
 *
 * For 1 panel: 1.0 (panel = viewport). For 2 vertical panels: 0.5.
 * For all 6 (3×2): fits 3 wide × 2 tall into one viewport.
 */
export function computeMinZoom(panelGrid: PanelGrid): number {
  const bounds = panelGrid.getUnlockedBounds();
  const regionW = bounds.maxX - bounds.minX;
  const regionH = bounds.maxY - bounds.minY;
  const zoomX = panelGrid.panelWidth / regionW;
  const zoomY = panelGrid.panelHeight / regionH;
  return Math.min(zoomX, zoomY);
}
