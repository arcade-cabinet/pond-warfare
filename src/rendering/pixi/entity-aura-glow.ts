/**
 * Entity Aura and Glow Overlays
 *
 * Draws distinctive visual rings around key entities:
 * - Commander: pulsing gold aura for instant player recognition
 * - PredatorNest: red glow so enemy nests stand out from dark terrain
 */

import type { Graphics } from 'pixi.js';

// Commander aura visual constants
const COMMANDER_AURA_RADIUS = 24;
const COMMANDER_AURA_COLOR = 0xfbbf24; // Gold
const COMMANDER_AURA_OUTER = 0xf59e0b; // Darker gold outer ring

// Enemy nest glow visual constants
const NEST_GLOW_RADIUS = 36;
const NEST_GLOW_COLOR = 0xef4444; // Red
const NEST_GLOW_OUTER = 0xb91c1c; // Dark red outer ring

/**
 * Draw a pulsing aura ring around the commander so it is immediately
 * recognizable at any zoom level.
 */
export function drawCommanderAura(gfx: Graphics, ex: number, ey: number, frameCount: number): void {
  const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frameCount * 0.06));
  const outerR = COMMANDER_AURA_RADIUS + 2 * pulse;
  const innerR = COMMANDER_AURA_RADIUS - 2;

  // Outer glow ring
  gfx.circle(ex, ey, outerR);
  gfx.stroke({ width: 3, color: COMMANDER_AURA_OUTER, alpha: 0.25 * pulse });

  // Main aura ring
  gfx.circle(ex, ey, innerR);
  gfx.stroke({ width: 2, color: COMMANDER_AURA_COLOR, alpha: 0.5 + 0.3 * pulse });

  // Inner bright highlight
  gfx.circle(ex, ey, innerR - 2);
  gfx.stroke({ width: 1, color: 0xfef3c7, alpha: 0.3 * pulse });
}

/**
 * Draw a red glow ring around enemy predator nests so they are
 * visually distinct from the dark terrain.
 */
export function drawNestGlow(gfx: Graphics, ex: number, ey: number, frameCount: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.04);

  // Outer diffuse glow
  gfx.circle(ex, ey, NEST_GLOW_RADIUS);
  gfx.stroke({ width: 4, color: NEST_GLOW_OUTER, alpha: 0.15 + 0.1 * pulse });

  // Main red ring
  gfx.circle(ex, ey, NEST_GLOW_RADIUS - 4);
  gfx.stroke({ width: 2, color: NEST_GLOW_COLOR, alpha: 0.35 + 0.15 * pulse });

  // Inner bright core
  gfx.circle(ex, ey, NEST_GLOW_RADIUS - 8);
  gfx.stroke({ width: 1, color: 0xfca5a5, alpha: 0.2 * pulse });
}
