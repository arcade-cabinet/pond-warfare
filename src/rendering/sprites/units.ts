/**
 * Otter-type unit sprites.
 *
 * Sprite bodies for live otter units. A few reserved enum ids reuse these same
 * draw functions, but the player-facing roster is:
 * - `drawMudpaw` -> Mudpaw and gather-specialist bodies
 * - `drawLookout` -> Lookout body
 * - `drawSapper` / `drawSaboteur` -> live combat bodies
 */

import { PALETTE } from '@/constants';
import { type DrawCtx, OTTER_NOSE_HIGHLIGHT, OTTER_OUTLINE } from './draw-helpers';

/** Draw the base otter body shared by Mudpaw and a few alias-backed otter units. */
function drawOtterBase(d: DrawCtx): void {
  const { p, rect, ctx } = d;
  // Shadow under feet
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(5, 14, 6, 1);
  // Dark outline around body for definition
  rect(4, 3, 1, 10, OTTER_OUTLINE);
  rect(12, 3, 1, 10, OTTER_OUTLINE);
  rect(5, 1, 6, 1, OTTER_OUTLINE);
  rect(5, 12, 1, 2, OTTER_OUTLINE);
  rect(11, 12, 1, 2, OTTER_OUTLINE);
  // Otter base body
  rect(5, 4, 6, 8, PALETTE.otterBase);
  rect(6, 5, 4, 6, PALETTE.otterBelly);
  rect(5, 2, 6, 4, PALETTE.otterBase);
  // Face
  p(6, 3, PALETTE.black);
  p(9, 3, PALETTE.black);
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  // Nose highlight for 3D feel
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  // Arms
  rect(4, 5, 1, 4, PALETTE.otterBase);
  rect(11, 5, 1, 4, PALETTE.otterBase);
  // Legs & tail
  rect(5, 12, 2, 2, PALETTE.otterBase);
  rect(9, 12, 2, 2, PALETTE.otterBase);
  rect(11, 10, 3, 2, PALETTE.otterBase);
}

/** Draw the standard otter body without extra outline on feet (Medic/shared heavy chassis). */
function drawOtterBodyMinimal(d: DrawCtx): void {
  const { p, rect, ctx } = d;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(5, 14, 6, 1);
  rect(4, 3, 1, 10, OTTER_OUTLINE);
  rect(12, 3, 1, 10, OTTER_OUTLINE);
  rect(5, 1, 6, 1, OTTER_OUTLINE);
  rect(5, 4, 6, 8, PALETTE.otterBase);
  rect(6, 5, 4, 6, PALETTE.otterBelly);
  rect(5, 2, 6, 4, PALETTE.otterBase);
  p(6, 3, PALETTE.black);
  p(9, 3, PALETTE.black);
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  rect(4, 5, 1, 4, PALETTE.otterBase);
  rect(11, 5, 1, 4, PALETTE.otterBase);
  rect(5, 12, 2, 2, PALETTE.otterBase);
  rect(9, 12, 2, 2, PALETTE.otterBase);
  rect(11, 10, 3, 2, PALETTE.otterBase);
}

export function drawMudpaw(d: DrawCtx): void {
  drawOtterBase(d);
  d.rect(3, 5, 2, 2, PALETTE.clamShell);
}

export function drawMedic(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  d.rect(7, 6, 2, 5, '#22c55e');
  d.rect(6, 8, 4, 1, '#22c55e');
}

export function drawSharedHeavyChassis(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  d.rect(2, 5, 4, 6, PALETTE.clamShell);
  d.rect(1, 6, 1, 4, PALETTE.stoneL);
  d.p(3, 7, PALETTE.stone);
  d.p(3, 9, PALETTE.stone);
}

export function drawLookout(d: DrawCtx): void {
  const { p, rect, ctx } = d;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(5, 14, 6, 1);
  rect(4, 5, 1, 8, OTTER_OUTLINE);
  rect(12, 5, 1, 8, OTTER_OUTLINE);
  rect(5, 3, 6, 1, OTTER_OUTLINE);
  rect(5, 6, 6, 6, PALETTE.otterBase);
  rect(6, 7, 4, 4, PALETTE.otterBelly);
  rect(5, 4, 6, 4, PALETTE.otterBase);
  p(6, 5, PALETTE.black);
  p(9, 5, PALETTE.black);
  p(7, 6, PALETTE.otterNose);
  p(8, 6, PALETTE.otterNose);
  p(8, 6, OTTER_NOSE_HIGHLIGHT);
  p(5, 5, '#06b6d4');
  p(10, 5, '#06b6d4');
  rect(4, 7, 1, 3, PALETTE.otterBase);
  rect(11, 7, 1, 3, PALETTE.otterBase);
  rect(5, 12, 2, 2, PALETTE.otterBase);
  rect(9, 12, 2, 2, PALETTE.otterBase);
  rect(11, 10, 3, 1, PALETTE.otterBase);
}

export function drawReservedUnit28(d: DrawCtx): void {
  const { p, rect, ctx } = d;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(3, 12, 10, 1);
  p(2, 10, '#38bdf8');
  p(13, 10, '#38bdf8');
  p(1, 8, '#38bdf8');
  p(14, 8, '#38bdf8');
  p(3, 12, '#38bdf8');
  p(12, 12, '#38bdf8');
  rect(4, 7, 8, 4, PALETTE.otterBase);
  rect(5, 8, 6, 2, PALETTE.otterBelly);
  rect(11, 6, 3, 4, PALETTE.otterBase);
  p(12, 6, PALETTE.black);
  p(13, 7, PALETTE.otterNose);
  rect(5, 5, 2, 2, PALETTE.otterBase);
  rect(5, 11, 2, 2, PALETTE.otterBase);
  rect(9, 5, 2, 2, PALETTE.otterBase);
  rect(9, 11, 2, 2, PALETTE.otterBase);
  rect(2, 8, 2, 2, PALETTE.otterBase);
  rect(1, 9, 1, 1, PALETTE.otterBase);
}

export function drawReservedUnit29(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  const { p, rect } = d;
  rect(2, 5, 3, 1, '#f59e0b');
  rect(1, 6, 1, 3, '#f59e0b');
  rect(4, 6, 1, 3, '#f59e0b');
  rect(2, 8, 3, 1, '#f59e0b');
  p(2, 6, '#d97706');
  p(3, 7, '#d97706');
  p(2, 8, '#d97706');
}

export function drawCommander(d: DrawCtx): void {
  drawOtterBase(d);
  const { p, rect } = d;
  p(6, 1, '#fbbf24');
  p(8, 0, '#fbbf24');
  p(10, 1, '#fbbf24');
  rect(6, 2, 5, 1, '#fbbf24');
  rect(12, 6, 2, 4, '#3b82f6');
  rect(13, 10, 1, 2, '#3b82f6');
  p(12, 7, '#60a5fa');
}

/** Sapper -- dark green otter with wrench/bomb icon for siege. */
export function drawSapper(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  const { p, rect } = d;
  // Dark green tint on body
  rect(5, 4, 6, 8, '#1a4d1a');
  rect(6, 5, 4, 6, '#2d6a2d');
  rect(5, 2, 6, 4, '#1a4d1a');
  // Face over tint
  p(6, 3, PALETTE.black);
  p(9, 3, PALETTE.black);
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  // Wrench in right hand
  rect(12, 5, 1, 5, '#9ca3af');
  rect(12, 4, 2, 2, '#9ca3af');
  p(13, 5, '#6b7280');
  // Bomb in left hand
  rect(2, 6, 3, 3, '#374151');
  p(3, 5, '#f97316');
}

/** Saboteur -- purple-tinted otter with mask for subversion. */
export function drawSaboteur(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  const { p, rect } = d;
  // Purple tint on body
  rect(5, 4, 6, 8, '#581c87');
  rect(6, 5, 4, 6, '#7e22ce');
  rect(5, 2, 6, 4, '#581c87');
  // Face over tint
  p(6, 3, PALETTE.black);
  p(9, 3, PALETTE.black);
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  // Mask band across eyes
  rect(5, 3, 7, 1, '#1e1b4b');
  p(6, 3, '#c4b5fd');
  p(9, 3, '#c4b5fd');
  // Dagger in right hand
  rect(12, 5, 1, 4, '#9ca3af');
  p(12, 4, '#d4d4d8');
}

/** Shaman -- green otter with glowing staff for healing variant. */
export function drawShaman(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  const { p, rect } = d;
  // Green robe tint
  rect(5, 6, 6, 6, '#166534');
  rect(6, 7, 4, 4, '#22c55e');
  // Face (over base)
  p(6, 3, PALETTE.black);
  p(9, 3, PALETTE.black);
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  // Staff in right hand
  rect(13, 2, 1, 10, '#92400e');
  // Staff glow orb
  p(12, 1, '#4ade80');
  p(13, 1, '#86efac');
  p(14, 1, '#4ade80');
  p(13, 0, '#bbf7d0');
}

/** Reserved unit slot 33 reusing a blue-tinted otter body. */
export function drawReservedUnit33(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  const { p, rect } = d;
  // Blue tint on body
  rect(5, 4, 6, 8, '#1e3a5f');
  rect(6, 5, 4, 6, '#2563eb');
  rect(5, 2, 6, 4, '#1e3a5f');
  // Face over tint
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  // Goggles
  rect(5, 3, 3, 1, '#38bdf8');
  rect(8, 3, 3, 1, '#38bdf8');
  p(6, 3, '#0ea5e9');
  p(9, 3, '#0ea5e9');
  // Flippers on feet
  rect(4, 13, 3, 1, '#0284c7');
  rect(9, 13, 3, 1, '#0284c7');
}
