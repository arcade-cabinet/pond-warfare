/**
 * v2.0.0 Entity Sprites
 *
 * Reserved historical entity slots 39-43.
 */

import { PALETTE } from '@/constants';
import { type DrawCtx, FLAME_ORANGE, OTTER_NOSE_HIGHLIGHT, OTTER_OUTLINE } from './draw-helpers';

/** Reserved building slot 39 reusing the old dock sprite. */
export function drawReservedBuilding39(d: DrawCtx): void {
  const { p, rect } = d;
  // Water base
  rect(2, 24, 28, 6, PALETTE.waterShallow);
  for (let i = 0; i < 10; i++) p(3 + Math.random() * 26, 25 + Math.random() * 4, PALETTE.waterMid);
  // Wooden pier platform
  rect(4, 14, 24, 12, PALETTE.reedBrown);
  for (let i = 0; i < 20; i++)
    p(5 + Math.random() * 22, 15 + Math.random() * 10, PALETTE.otterBase);
  // Planks
  for (let i = 0; i < 6; i++) rect(4, 14 + i * 2, 24, 1, '#7c3f10');
  // Support posts
  rect(6, 10, 2, 8, PALETTE.mudDark);
  rect(24, 10, 2, 8, PALETTE.mudDark);
  // Mooring posts
  rect(4, 8, 3, 6, PALETTE.reedBrown);
  rect(25, 8, 3, 6, PALETTE.reedBrown);
  p(5, 8, '#f59e0b');
  p(26, 8, '#f59e0b');
  // Rope detail
  p(7, 10, '#a8a29e');
  p(24, 10, '#a8a29e');
}

/** Reserved unit slot 40 reusing the old warship sprite. */
export function drawReservedUnit40(d: DrawCtx): void {
  const { p, rect, ctx } = d;
  // Water ripples
  ctx.fillStyle = 'rgba(56,189,248,0.3)';
  ctx.fillRect(2, 26, 28, 4);
  // Hull
  rect(6, 14, 20, 12, PALETTE.reedBrown);
  rect(4, 18, 24, 6, PALETTE.mudDark);
  // Prow
  rect(14, 10, 4, 4, PALETTE.reedBrown);
  rect(15, 8, 2, 2, PALETTE.otterBase);
  // Deck
  rect(8, 14, 16, 6, PALETTE.otterBase);
  rect(10, 15, 12, 4, PALETTE.otterBelly);
  // Mast
  rect(15, 2, 2, 12, PALETTE.reedBrown);
  // Sail
  rect(10, 4, 12, 6, '#e0e7ff');
  for (let i = 0; i < 5; i++) p(11 + Math.random() * 10, 5 + Math.random() * 4, '#c7d2fe');
  // Otter captain
  p(13, 15, PALETTE.otterBase);
  p(14, 15, PALETTE.otterBase);
  p(13, 16, PALETTE.otterBelly);
  p(13, 14, PALETTE.black);
  // Cannon
  rect(20, 18, 4, 2, PALETTE.stone);
  rect(24, 18, 2, 2, PALETTE.stoneL);
  p(25, 18, FLAME_ORANGE);
}

/** Reserved unit slot 41 reusing the old berserker sprite. */
export function drawReservedUnit41(d: DrawCtx): void {
  const { p, rect, ctx } = d;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(5, 14, 6, 1);
  // Body outline
  rect(4, 3, 1, 10, OTTER_OUTLINE);
  rect(12, 3, 1, 10, OTTER_OUTLINE);
  rect(5, 1, 6, 1, OTTER_OUTLINE);
  // Body
  rect(5, 4, 6, 8, PALETTE.otterBase);
  rect(6, 5, 4, 6, PALETTE.otterBelly);
  rect(5, 2, 6, 4, PALETTE.otterBase);
  // Angry eyes (red)
  p(6, 3, '#ef4444');
  p(9, 3, '#ef4444');
  p(7, 4, PALETTE.otterNose);
  p(8, 4, PALETTE.otterNose);
  p(8, 4, OTTER_NOSE_HIGHLIGHT);
  // War paint stripes
  p(5, 5, '#ef4444');
  p(10, 5, '#ef4444');
  p(5, 7, '#ef4444');
  p(10, 7, '#ef4444');
  // Arms holding dual weapons
  rect(3, 5, 2, 4, PALETTE.otterBase);
  rect(11, 5, 2, 4, PALETTE.otterBase);
  // Claws/weapons
  rect(2, 4, 2, 6, PALETTE.stone);
  rect(12, 4, 2, 6, PALETTE.stone);
  p(2, 4, '#ef4444');
  p(13, 4, '#ef4444');
  // Legs
  rect(5, 12, 2, 2, PALETTE.otterBase);
  rect(9, 12, 2, 2, PALETTE.otterBase);
  rect(11, 10, 3, 2, PALETTE.otterBase);
  // Battle scars
  p(7, 6, '#dc2626');
  p(8, 8, '#dc2626');
}

/** Reserved building slot 42 reusing the old wall-gate sprite. */
export function drawReservedBuilding42(d: DrawCtx): void {
  const { p, rect } = d;
  // Wall sides
  rect(2, 12, 10, 8, PALETTE.mudDark);
  rect(20, 12, 10, 8, PALETTE.mudDark);
  // Top trim
  rect(2, 10, 28, 2, PALETTE.mudLight);
  rect(2, 20, 28, 2, PALETTE.mudLight);
  // Logs on sides
  for (let i = 0; i < 3; i++) {
    rect(4 + i * 3, 12, 2, 8, PALETTE.otterBase);
    rect(22 + i * 3, 12, 2, 8, PALETTE.otterBase);
  }
  // Arch top
  rect(10, 10, 12, 4, PALETTE.reedBrown);
  rect(12, 8, 8, 2, PALETTE.reedBrown);
  rect(14, 7, 4, 1, PALETTE.reedBrown);
  // Gate opening
  rect(12, 14, 8, 8, PALETTE.black);
  // Arch keystone
  p(15, 8, '#f59e0b');
  p(16, 8, '#f59e0b');
  // Ground detail
  for (let i = 0; i < 4; i++) p(13 + i * 2, 20, PALETTE.mudLight);
}

/** Reserved building slot 43 reusing the old shrine sprite. */
export function drawReservedBuilding43(d: DrawCtx): void {
  const { p, rect, circle } = d;
  // Base platform
  rect(4, 22, 24, 8, PALETTE.stone);
  rect(6, 20, 20, 2, PALETTE.stoneL);
  for (let i = 0; i < 15; i++) p(5 + Math.random() * 22, 22 + Math.random() * 6, '#6b7280');
  // Pillars
  rect(6, 8, 4, 14, PALETTE.stone);
  rect(22, 8, 4, 14, PALETTE.stone);
  for (let i = 0; i < 8; i++) {
    p(7 + Math.random() * 2, 10 + Math.random() * 10, PALETTE.stoneL);
    p(23 + Math.random() * 2, 10 + Math.random() * 10, PALETTE.stoneL);
  }
  // Lintel
  rect(6, 6, 20, 3, PALETTE.stone);
  rect(8, 4, 16, 2, PALETTE.stoneL);
  // Glowing rune center
  circle(16, 16, 4, '#7c3aed');
  circle(16, 16, 2, '#a78bfa');
  p(16, 16, '#ddd6fe');
  // Rune details
  p(14, 14, '#a78bfa');
  p(18, 14, '#a78bfa');
  p(14, 18, '#a78bfa');
  p(18, 18, '#a78bfa');
  // Mystical glow particles
  p(12, 12, '#c4b5fd');
  p(20, 12, '#c4b5fd');
  p(16, 10, '#c4b5fd');
}
