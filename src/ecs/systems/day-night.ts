/**
 * Day-Night Cycle System
 *
 * Ported from updateLogic() lines 1149-1152 (time of day), getLerpedColor()
 * lines 1126-1133 (ambient darkness calculation), and firefly update lines 1154-1160
 * of the original HTML game.
 *
 * Responsibilities:
 * - Advance time of day by 0.05 per frame, wrapping at 24*60 (1440 minutes)
 * - Calculate ambient darkness via lerped color from TIME_STOPS palette
 * - Update firefly positions: random drift, velocity clamping, screen wrapping
 */

import { TIME_STOPS } from '@/constants';
import type { GameWorld } from '@/ecs/world';

/**
 * Interpolate the ambient color from TIME_STOPS and compute ambientDarkness.
 * Direct port of GAME.getLerpedColor() (lines 1126-1133).
 *
 * @param timeInHours - Current time expressed in hours (0-24)
 * @returns Darkness value between 0 (bright) and 1 (dark)
 */
function getAmbientDarkness(timeInHours: number): number {
  // Find the two TIME_STOPS bracketing the current hour
  let idx = 0;
  while (idx < TIME_STOPS.length - 1 && TIME_STOPS[idx + 1].h <= timeInHours) {
    idx++;
  }

  const start = TIME_STOPS[idx];
  const end = TIME_STOPS[idx + 1] ?? TIME_STOPS[idx];

  if (start === end) {
    return 1.0 - start.c[0] / 255;
  }

  // Linear interpolation between stops
  const t = (timeInHours - start.h) / (end.h - start.h);
  const r = start.c[0] + (end.c[0] - start.c[0]) * t;
  return 1.0 - r / 255;
}

export function dayNightSystem(world: GameWorld): void {
  // --- Time of day advancement (line 1149) ---
  world.timeOfDay += 0.05;
  if (world.timeOfDay >= 24 * 60) {
    world.timeOfDay = 0;
  }

  // --- Calculate ambient darkness (lines 1150-1152 call getLerpedColor) ---
  const timeInHours = world.timeOfDay / 60;
  world.ambientDarkness = getAmbientDarkness(timeInHours);

  // --- Firefly update (lines 1154-1160) ---
  const margin = 200;
  for (let i = 0; i < world.fireflies.length; i++) {
    const f = world.fireflies[i];
    f.x += f.vx;
    f.y += f.vy;
    f.phase += 0.05;

    // Random drift on x velocity
    f.vx += (world.gameRng.next() - 0.5) * 0.1;

    // Clamp velocity
    if (f.vx > 1) f.vx = 1;
    if (f.vx < -1) f.vx = -1;

    // Screen wrapping
    // Original uses this.camX and this.width; we use world camera state
    if (f.x < world.camX - margin) f.x = world.camX + world.viewWidth + margin;
    if (f.x > world.camX + world.viewWidth + margin) f.x = world.camX - margin;
    if (f.y < world.camY - margin) f.y = world.camY + world.viewHeight + margin;
    if (f.y > world.camY + world.viewHeight + margin) f.y = world.camY - margin;
  }
}
