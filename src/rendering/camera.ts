/**
 * Camera System
 *
 * Handles camera state (camX, camY), WASD/arrow key panning, edge-of-screen
 * panning, minimap click panning, smooth tracking (lerp at 10%), bounds
 * clamping, and screen shake offset calculation.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import type { GameWorld } from '@/ecs/world';
import { screenShakeEnabled } from '@/ui/store';

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
