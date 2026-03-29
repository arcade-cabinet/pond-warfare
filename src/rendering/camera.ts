/**
 * Camera System
 *
 * Port of camera logic from the original pond_craft.html.
 * Handles camera state (camX, camY), WASD/arrow key panning, edge-of-screen
 * panning, minimap click panning, smooth tracking (lerp at 10%), bounds
 * clamping, and screen shake offset calculation.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import type { GameWorld } from '@/ecs/world';

export interface CameraShake {
  offsetX: number;
  offsetY: number;
}

/** Clamp the camera so it cannot scroll beyond the world edges. */
export function clampCamera(world: GameWorld): void {
  world.camX = Math.max(0, Math.min(WORLD_WIDTH - world.viewWidth, world.camX));
  world.camY = Math.max(0, Math.min(WORLD_HEIGHT - world.viewHeight, world.camY));
}

/**
 * Compute the current screen-shake offset.
 *
 * When shakeTimer > 0, returns random offsets proportional to the remaining
 * shake strength. When shakeTimer <= 0, returns zero offset.
 */
export function computeShakeOffset(world: GameWorld): CameraShake {
  if (world.shakeTimer > 0) {
    return {
      offsetX: (Math.random() - 0.5) * world.shakeTimer,
      offsetY: (Math.random() - 0.5) * world.shakeTimer,
    };
  }
  return { offsetX: 0, offsetY: 0 };
}
