/**
 * Camera System
 *
 * Handles camera state (camX, camY), WASD/arrow key panning, edge-of-screen
 * panning, minimap click panning, smooth tracking (lerp at 10%), bounds
 * clamping, and screen shake offset calculation.
 */

import type { GameWorld } from '@/ecs/world';
import { screenShakeEnabled } from '@/ui/store';

export interface CameraShake {
  offsetX: number;
  offsetY: number;
}

/**
 * Clamp the camera so it cannot scroll beyond the world edges.
 *
 * When the map is narrower than the viewport, the camera is centered
 * horizontally so the playable area sits in the middle (instead of
 * being pinned to the left edge with black void on the right).
 * The same logic applies vertically when the map is shorter than the viewport.
 */
export function clampCamera(world: GameWorld): void {
  if (world.worldWidth <= world.viewWidth) {
    // Map narrower than viewport: center it horizontally
    world.camX = -(world.viewWidth - world.worldWidth) / 2;
  } else {
    world.camX = Math.max(0, Math.min(world.worldWidth - world.viewWidth, world.camX));
  }

  if (world.worldHeight <= world.viewHeight) {
    // Map shorter than viewport: center it vertically
    world.camY = -(world.viewHeight - world.worldHeight) / 2;
  } else {
    world.camY = Math.max(0, Math.min(world.worldHeight - world.viewHeight, world.camY));
  }
}

/**
 * Compute the current screen-shake offset.
 *
 * When shakeTimer > 0, returns random offsets proportional to the remaining
 * shake strength. When shakeTimer <= 0 or screen shake is disabled, returns
 * zero offset.
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
 * Compute the initial zoom level so that the map fills the viewport
 * and pixel-art sprites (16-32 px) are visible and tappable.
 *
 * Strategy: pick a zoom that makes the map width fit the viewport,
 * with a minimum floor so sprites stay large enough to see and tap.
 * Clamped to engine limits (0.5 - 2.0).
 */
const MIN_PLAYABLE_ZOOM = 2.0;

export function computeInitialZoom(worldWidth: number, viewportWidth: number): number {
  // Zoom so the map width fills the viewport exactly
  const zoomForWidth = viewportWidth / worldWidth;
  // Enforce minimum so pixel-art is visible and tappable
  let zoom = Math.max(zoomForWidth, MIN_PLAYABLE_ZOOM);
  // Clamp to engine limits (matches setZoom in camera.ts)
  zoom = Math.max(0.5, Math.min(2.0, zoom));
  return zoom;
}
