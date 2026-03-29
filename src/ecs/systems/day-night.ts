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
 * @returns The RGB color string for the day-night overlay
 */
function getLerpedColor(timeInHours: number): { color: string; darkness: number } {
  // Find the two TIME_STOPS bracketing the current hour
  // Original: let i = 0; while (i < TIME_STOPS.length - 1 && TIME_STOPS[i+1].h <= timeInHours) i++;
  let idx = 0;
  while (idx < TIME_STOPS.length - 1 && TIME_STOPS[idx + 1].h <= timeInHours) {
    idx++;
  }

  const start = TIME_STOPS[idx];
  const end = TIME_STOPS[idx + 1] ?? TIME_STOPS[idx];

  // Original: if (start === end) return `rgb(${start.c[0]}, ${start.c[1]}, ${start.c[2]})`;
  if (start === end) {
    const darkness = 1.0 - start.c[0] / 255;
    return {
      color: `rgb(${start.c[0]}, ${start.c[1]}, ${start.c[2]})`,
      darkness,
    };
  }

  // Linear interpolation between stops
  // Original: let t = (timeInHours - start.h) / (end.h - start.h);
  const t = (timeInHours - start.h) / (end.h - start.h);
  const r = Math.round(start.c[0] + (end.c[0] - start.c[0]) * t);
  const g = Math.round(start.c[1] + (end.c[1] - start.c[1]) * t);
  const b = Math.round(start.c[2] + (end.c[2] - start.c[2]) * t);

  // Original: this.ambientDarkness = 1.0 - (r / 255);
  const darkness = 1.0 - r / 255;

  return {
    color: `rgb(${r}, ${g}, ${b})`,
    darkness,
  };
}

export function dayNightSystem(world: GameWorld): void {
  // --- Time of day advancement (line 1149) ---
  // Original: this.timeOfDay += 0.05; if (this.timeOfDay >= 24*60) this.timeOfDay = 0;
  world.timeOfDay += 0.05;
  if (world.timeOfDay >= 24 * 60) {
    world.timeOfDay = 0;
  }

  // --- Calculate ambient darkness (lines 1150-1152 call getLerpedColor) ---
  const timeInHours = world.timeOfDay / 60;
  const { darkness } = getLerpedColor(timeInHours);
  world.ambientDarkness = darkness;

  // --- Firefly update (lines 1154-1160) ---
  const margin = 200;
  for (let i = 0; i < world.fireflies.length; i++) {
    const f = world.fireflies[i];

    // Original: f.x += f.vx; f.y += f.vy; f.phase += 0.05;
    f.x += f.vx;
    f.y += f.vy;
    f.phase += 0.05;

    // Random drift on x velocity
    // Original: f.vx += (Math.random() - 0.5) * 0.1;
    f.vx += (Math.random() - 0.5) * 0.1;

    // Clamp velocity
    // Original: if (f.vx > 1) f.vx = 1; if (f.vx < -1) f.vx = -1;
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
