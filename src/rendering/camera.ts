/**
 * Camera System
 *
 * Port of camera logic from the original pond_craft.html.
 * Handles camera state (camX, camY), WASD/arrow key panning, edge-of-screen
 * panning, minimap click panning, smooth tracking (lerp at 10%), bounds
 * clamping, and screen shake offset calculation.
 */

import { MINIMAP_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';

const PAN_SPEED = 12;
const EDGE_PAN_MARGIN = 20;
const TRACKING_LERP = 0.1;

export interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  /** Whether the mouse is inside the game viewport. */
  inside: boolean;
}

export interface CameraShake {
  offsetX: number;
  offsetY: number;
}

/**
 * Update camera position based on keyboard, edge panning, and tracking.
 *
 * Call once per frame. Returns whether manual panning occurred (which
 * disables tracking).
 */
export function updateCamera(
  world: GameWorld,
  keys: Record<string, boolean>,
  mouse: MouseState,
): boolean {
  let manualPan = false;
  const s = PAN_SPEED;
  const e = EDGE_PAN_MARGIN;

  // Keyboard panning (W/S and arrow keys)
  if (keys.w || keys.arrowup || (mouse.inside && mouse.y < e && !mouse.isDown)) {
    world.camY -= s;
    manualPan = true;
  }
  if (
    keys.s ||
    keys.arrowdown ||
    (mouse.inside && mouse.y > world.viewHeight - e && !mouse.isDown)
  ) {
    world.camY += s;
    manualPan = true;
  }
  // Note: 'a' is attack-move in the original, so only arrow keys / edge for left pan
  if (keys.arrowleft || (mouse.inside && mouse.x < e && !mouse.isDown)) {
    world.camX -= s;
    manualPan = true;
  }
  if (
    keys.d ||
    keys.arrowright ||
    (mouse.inside && mouse.x > world.viewWidth - e && !mouse.isDown)
  ) {
    world.camX += s;
    manualPan = true;
  }

  if (manualPan) {
    world.isTracking = false;
  }

  // Smooth camera tracking towards selection centre
  if (world.isTracking && world.selection.length > 0) {
    let cx = 0;
    let cy = 0;
    let validCount = 0;
    for (const eid of world.selection) {
      if (Health.current[eid] > 0) {
        cx += Position.x[eid];
        cy += Position.y[eid];
        validCount++;
      }
    }
    if (validCount > 0) {
      cx /= validCount;
      cy /= validCount;
      world.camX += (cx - world.viewWidth / 2 - world.camX) * TRACKING_LERP;
      world.camY += (cy - world.viewHeight / 2 - world.camY) * TRACKING_LERP;
    } else {
      world.isTracking = false;
    }
  }

  // Clamp to world bounds
  clampCamera(world);

  return manualPan;
}

/** Clamp the camera so it cannot scroll beyond the world edges. */
export function clampCamera(world: GameWorld): void {
  world.camX = Math.max(0, Math.min(WORLD_WIDTH - world.viewWidth, world.camX));
  world.camY = Math.max(0, Math.min(WORLD_HEIGHT - world.viewHeight, world.camY));
}

/**
 * Handle minimap click/drag: convert a click position within the minimap
 * element into a world camera position.
 *
 * @param xPercent - normalised X position within the minimap (0..1)
 * @param yPercent - normalised Y position within the minimap (0..1)
 * @param offset  - offset from centre of viewport (for drag panning)
 */
export function panCameraToMinimap(
  world: GameWorld,
  xPercent: number,
  yPercent: number,
  offset: { x: number; y: number } = { x: 0, y: 0 },
): void {
  world.camX = Math.max(
    0,
    Math.min(WORLD_WIDTH - world.viewWidth, xPercent * WORLD_WIDTH - offset.x),
  );
  world.camY = Math.max(
    0,
    Math.min(WORLD_HEIGHT - world.viewHeight, yPercent * WORLD_HEIGHT - offset.y),
  );
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

/**
 * Get the minimap camera-viewport indicator dimensions.
 * Returns CSS-compatible position/size values for the minimap-cam overlay element.
 */
export function getMinimapViewport(world: GameWorld): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const sx = MINIMAP_SIZE / WORLD_WIDTH;
  const sy = MINIMAP_SIZE / WORLD_HEIGHT;
  return {
    left: world.camX * sx,
    top: world.camY * sy,
    width: world.viewWidth * sx,
    height: world.viewHeight * sy,
  };
}
