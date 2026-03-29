/**
 * Water Shimmer Effect
 *
 * Adds subtle animated sparkle effects on water areas of the game terrain.
 * Maintains a small pool of sparkle objects that fade in/out on water regions,
 * creating a shimmering pond surface effect without heavy computation.
 *
 * Integration: Called from the PixiJS render loop (pixi/index.ts) each frame.
 */

import type { Graphics } from 'pixi.js';

/** A single water sparkle instance. */
interface WaterSparkle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

/** Maximum number of active sparkles at any time. */
const MAX_SPARKLES = 20;

/** How many frames between spawning new sparkles. */
const SPAWN_INTERVAL = 4;

/** Active sparkle pool. */
const sparkles: WaterSparkle[] = [];

/**
 * Cached reference to the background canvas ImageData for sampling terrain.
 * Set once via `initWaterShimmer()`.
 */
let bgImageData: ImageData | null = null;
let bgWidth = 0;
let bgHeight = 0;

/**
 * Initialise the water shimmer system by sampling the background canvas.
 * Call once after `buildBackground()` has produced the terrain canvas.
 */
export function initWaterShimmer(bgCanvas: HTMLCanvasElement): void {
  const ctx = bgCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  bgWidth = bgCanvas.width;
  bgHeight = bgCanvas.height;
  bgImageData = ctx.getImageData(0, 0, bgWidth, bgHeight);
}

/**
 * Check whether a world-space coordinate is over water terrain.
 * Water pixels are dark with dominant blue/teal channel values.
 * The background uses biome noise; water regions have low noise values
 * which produce dark teal colors (r < 40, g < 100).
 */
function isWaterAt(x: number, y: number): boolean {
  if (!bgImageData) return false;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= bgWidth || py < 0 || py >= bgHeight) return false;
  const idx = (py * bgWidth + px) * 4;
  const r = bgImageData.data[idx];
  const g = bgImageData.data[idx + 1];
  // Water pixels: deepWater (#0a1d22) to shallowWater (#11525c)
  // Both have r < 30 and g < 100
  return r < 35 && g < 100;
}

/**
 * Update and render water sparkles for the current frame.
 *
 * @param gfx        - The PixiJS Graphics object to draw sparkles into.
 * @param frameCount - Current game frame number (for spawn timing).
 * @param camX       - Camera X position (world space).
 * @param camY       - Camera Y position (world space).
 * @param viewW      - Viewport width.
 * @param viewH      - Viewport height.
 */
export function updateAndRenderWaterShimmer(
  gfx: Graphics,
  frameCount: number,
  camX: number,
  camY: number,
  viewW: number,
  viewH: number,
): void {
  if (!bgImageData) return;

  // --- Spawn new sparkles every SPAWN_INTERVAL frames ---
  if (frameCount % SPAWN_INTERVAL === 0 && sparkles.length < MAX_SPARKLES) {
    // Try a few random positions within the visible area
    for (let attempt = 0; attempt < 3; attempt++) {
      if (sparkles.length >= MAX_SPARKLES) break;
      const x = camX + Math.random() * viewW;
      const y = camY + Math.random() * viewH;
      if (isWaterAt(x, y)) {
        sparkles.push({
          x,
          y,
          life: 10,
          maxLife: 10,
        });
      }
    }
  }

  // --- Update and render existing sparkles ---
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.life--;

    if (s.life <= 0) {
      sparkles.splice(i, 1);
      continue;
    }

    // Alpha: fade in during first 3 frames, then fade out
    const fadeIn = Math.min(1, (s.maxLife - s.life) / 3);
    const fadeOut = s.life / s.maxLife;
    const alpha = Math.min(fadeIn, fadeOut) * 0.3;

    // Draw a tiny 1-2px sparkle as a small circle
    gfx.circle(s.x, s.y, 1.5);
    gfx.fill({ color: 0xffffff, alpha });
  }
}

/**
 * Reset the shimmer state (e.g. on game restart).
 */
export function resetWaterShimmer(): void {
  sparkles.length = 0;
  bgImageData = null;
  bgWidth = 0;
  bgHeight = 0;
}
