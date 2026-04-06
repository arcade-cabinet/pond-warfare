/**
 * Resource and misc sprites: cattail, clambed, bones, rubble, pearl_bed,
 * catapult, frog, fish.
 *
 * Clambed is now drawn on a 32x32 canvas (LARGE_TYPES) for better
 * visibility. Includes a bright shimmer ring so fish nodes visually
 * pop against any terrain background.
 */

import { PALETTE } from '@/constants';
import type { DrawCtx } from './draw-helpers';

export function drawCattail(d: DrawCtx): void {
  const { p, rect } = d;
  rect(7, 4, 2, 10, PALETTE.reedGreen);
  rect(6, 2, 4, 6, PALETTE.reedBrown);
  p(7, 1, PALETTE.otterBase);
  p(8, 1, PALETTE.otterBase);
  p(8, 12, PALETTE.reedGreen);
  p(9, 11, PALETTE.reedGreen);
}

/**
 * Clambed (fish node) -- 32x32 large sprite.
 *
 * Draws a bright pond with shimmer highlights and visible clam shells
 * so the resource node is obvious against any terrain.
 */
export function drawClambed(d: DrawCtx): void {
  const { p, rect, circle } = d;

  // Outer glow ring (cyan/white highlight)
  circle(16, 16, 14, '#0ea5e9');
  circle(16, 16, 12, '#0284c7');

  // Water pool
  circle(16, 16, 10, PALETTE.waterMid);
  circle(16, 16, 8, PALETTE.waterShallow);

  // Shimmer highlights -- bright sparkle dots
  p(10, 10, '#e0f2fe');
  p(11, 10, '#bae6fd');
  p(20, 12, '#e0f2fe');
  p(21, 13, '#bae6fd');
  p(14, 8, '#ffffff');
  p(19, 9, '#ffffff');

  // Clam shells (larger, more prominent)
  rect(9, 17, 4, 3, PALETTE.clamShell);
  p(10, 17, PALETTE.stone);
  p(11, 18, '#e2e8f0');

  rect(17, 19, 5, 3, PALETTE.clamShell);
  p(18, 19, PALETTE.stone);
  p(19, 20, '#e2e8f0');

  rect(13, 21, 3, 3, PALETTE.clamShell);
  p(14, 21, PALETTE.stone);

  // Central bright fish icon hint
  rect(14, 14, 4, 2, '#38bdf8');
  p(13, 14, '#60a5fa');
  p(18, 14, '#60a5fa');
  p(17, 15, '#e2e8f0');

  // Corner sparkle accents
  p(8, 8, '#ffffff');
  p(23, 9, '#ffffff');
  p(9, 22, '#ffffff');
  p(22, 22, '#ffffff');
}

export function drawBones(d: DrawCtx): void {
  const { p, rect } = d;
  rect(6, 6, 4, 4, '#cbd5e1');
  p(7, 7, '#000');
  p(8, 7, '#000');
  rect(7, 10, 2, 4, '#cbd5e1');
  rect(5, 11, 6, 1, '#cbd5e1');
  rect(6, 13, 4, 1, '#cbd5e1');
}

export function drawRubble(d: DrawCtx): void {
  const { rect } = d;
  for (let i = 0; i < 40; i++) {
    const rx = Math.round(4 + Math.random() * 24);
    const ry = Math.round(16 + Math.random() * 12);
    const width = Math.max(1, Math.round(Math.random() * 4 + 1));
    const height = Math.max(1, Math.round(Math.random() * 2 + 1));
    rect(rx, ry, width, height, Math.random() > 0.5 ? PALETTE.mudDark : PALETTE.wood);
  }
}

export function drawPearlBed(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(8, 10, 6, PALETTE.waterShallow);
  circle(6, 8, 2, '#e2e8f0');
  p(6, 8, '#fce7f3');
  circle(10, 11, 2, '#e2e8f0');
  p(10, 11, '#fce7f3');
  circle(7, 12, 1, '#e2e8f0');
  p(7, 12, '#fce7f3');
  rect(4, 13, 3, 1, PALETTE.clamShell);
  rect(9, 13, 3, 1, PALETTE.clamShell);
}

export function drawCatapult(d: DrawCtx): void {
  const { p, rect, circle } = d;
  rect(4, 20, 24, 4, PALETTE.reedBrown);
  rect(6, 14, 4, 10, PALETTE.reedBrown);
  rect(22, 14, 4, 10, PALETTE.reedBrown);
  rect(8, 10, 10, 4, PALETTE.mudDark);
  rect(10, 8, 6, 2, PALETTE.mudDark);
  rect(14, 4, 2, 10, PALETTE.reedBrown);
  circle(8, 26, 3, PALETTE.stoneL);
  circle(24, 26, 3, PALETTE.stoneL);
  p(8, 26, PALETTE.stone);
  p(24, 26, PALETTE.stone);
  rect(16, 18, 4, 4, PALETTE.otterBase);
  rect(16, 16, 4, 2, PALETTE.otterBase);
  p(17, 17, PALETTE.black);
  p(19, 17, PALETTE.black);
}

export function drawFrog(d: DrawCtx): void {
  const { p, rect } = d;
  rect(6, 8, 4, 4, '#22c55e');
  rect(5, 9, 6, 2, '#22c55e');
  rect(7, 10, 2, 1, '#86efac');
  p(7, 8, PALETTE.black);
  p(9, 8, PALETTE.black);
  p(5, 11, '#22c55e');
  p(10, 11, '#22c55e');
  p(5, 12, '#166534');
  p(10, 12, '#166534');
}

export function drawFish(d: DrawCtx): void {
  const { p, rect } = d;
  rect(5, 7, 6, 3, '#94a3b8');
  rect(5, 7, 6, 1, '#38bdf8');
  rect(3, 6, 2, 2, '#60a5fa');
  rect(3, 9, 2, 2, '#60a5fa');
  p(10, 8, PALETTE.black);
  p(7, 9, '#e2e8f0');
  p(8, 9, '#e2e8f0');
}
