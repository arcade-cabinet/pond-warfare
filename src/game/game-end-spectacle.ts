/**
 * Game-End Spectacle
 *
 * When a game ends (win/lose), orchestrates:
 * 1. Slow-motion (0.25x speed) for ~2 seconds real time
 * 2. Camera pan to the focus point (last nest or Lodge)
 * 3. Transition to paused state with game-over UI visible
 *
 * Called from the game loop each frame while spectacle is active.
 */

import type { GameWorld } from '@/ecs/world';
import * as store from '@/ui/store';

/** Duration of the spectacle phase in real frames (~2 seconds at 60fps). */
const SPECTACLE_REAL_FRAMES = 120;

/** Slow-motion speed during spectacle. */
const SPECTACLE_SPEED = 0.25;

/**
 * Begin the spectacle phase. Called once when game end is detected.
 * Sets slow-mo speed and prepares the camera pan target.
 */
export function beginSpectacle(world: GameWorld): void {
  world.gameSpeed = SPECTACLE_SPEED;
  store.gameSpeed.value = SPECTACLE_SPEED;
}

/**
 * Tick the spectacle each real frame. Returns true while spectacle
 * is still active, false when it should end.
 *
 * @param world - the game world
 * @param realFramesSinceEnd - how many real RAF frames since game ended
 */
export function tickSpectacle(world: GameWorld, realFramesSinceEnd: number): boolean {
  if (!world.gameEndSpectacleActive) return false;

  // Lerp camera toward focus point during spectacle
  const t = Math.min(realFramesSinceEnd / SPECTACLE_REAL_FRAMES, 1);
  const targetX = world.gameEndFocusX - world.viewWidth / 2;
  const targetY = world.gameEndFocusY - world.viewHeight / 2;
  world.camX += (targetX - world.camX) * 0.04;
  world.camY += (targetY - world.camY) * 0.04;

  if (t >= 1) {
    endSpectacle(world);
    return false;
  }

  return true;
}

/** End the spectacle: pause the game and let the game-over UI appear. */
function endSpectacle(world: GameWorld): void {
  world.gameEndSpectacleActive = false;
  world.gameSpeed = 1;
  store.gameSpeed.value = 1;
  world.paused = true;
  store.paused.value = true;
}
