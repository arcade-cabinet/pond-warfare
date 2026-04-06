/**
 * Entity Aura and Glow Overlays
 *
 * Draws distinctive visual rings around key entities:
 * - Commander: large pulsing gold aura -- the most visible unit on the map
 * - PredatorNest: prominent red glow visible from across the map
 */

import type { Graphics } from 'pixi.js';

// Commander aura visual constants -- large beacon-style radius
const COMMANDER_AURA_RADIUS = 48;
const COMMANDER_AURA_COLOR = 0xfbbf24; // Gold
const COMMANDER_AURA_OUTER = 0xf59e0b; // Darker gold outer ring

// Enemy nest glow visual constants -- visible at 1x zoom
const NEST_GLOW_RADIUS = 72;
const NEST_GLOW_COLOR = 0xef4444; // Red
const NEST_GLOW_OUTER = 0xb91c1c; // Dark red outer ring

/**
 * Draw a pulsing aura ring around the commander so it is immediately
 * recognizable at any zoom level. The aura has a constant base glow
 * plus an animated pulse on top so it is always visible.
 */
export function drawCommanderAura(gfx: Graphics, ex: number, ey: number, frameCount: number): void {
  const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(frameCount * 0.06));
  const outerR = COMMANDER_AURA_RADIUS + 4 * pulse;
  const innerR = COMMANDER_AURA_RADIUS - 4;
  const coreR = innerR - 4;

  // Outer glow ring -- always visible with pulse boost
  gfx.circle(ex, ey, outerR);
  gfx.stroke({ width: 5, color: COMMANDER_AURA_OUTER, alpha: 0.4 + 0.2 * pulse });

  // Main aura ring -- bright constant base
  gfx.circle(ex, ey, innerR);
  gfx.stroke({ width: 3, color: COMMANDER_AURA_COLOR, alpha: 0.6 + 0.25 * pulse });

  // Inner bright highlight
  gfx.circle(ex, ey, coreR);
  gfx.stroke({ width: 2, color: 0xfef3c7, alpha: 0.35 + 0.25 * pulse });
}

/**
 * Draw a red glow ring around enemy predator nests so they are
 * visually distinct and visible from across the map at any zoom.
 */
export function drawNestGlow(gfx: Graphics, ex: number, ey: number, frameCount: number): void {
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.04);

  // Outer diffuse glow -- wide and prominent
  gfx.circle(ex, ey, NEST_GLOW_RADIUS);
  gfx.stroke({ width: 6, color: NEST_GLOW_OUTER, alpha: 0.4 + 0.15 * pulse });

  // Main red ring
  gfx.circle(ex, ey, NEST_GLOW_RADIUS - 8);
  gfx.stroke({ width: 4, color: NEST_GLOW_COLOR, alpha: 0.5 + 0.2 * pulse });

  // Inner bright core
  gfx.circle(ex, ey, NEST_GLOW_RADIUS - 16);
  gfx.stroke({ width: 2, color: 0xfca5a5, alpha: 0.35 + 0.15 * pulse });
}
