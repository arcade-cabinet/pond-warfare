/**
 * Resource and misc sprites: cattail, clambed, bones, rubble, pearl_bed,
 * catapult, frog, fish.
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

export function drawClambed(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(8, 10, 6, PALETTE.waterShallow);
  rect(5, 9, 2, 2, PALETTE.clamShell);
  p(6, 9, PALETTE.stone);
  rect(9, 11, 3, 2, PALETTE.clamShell);
  p(10, 11, PALETTE.stone);
  rect(7, 13, 2, 2, PALETTE.clamShell);
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
