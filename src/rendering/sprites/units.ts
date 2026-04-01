/**
 * Otter-type unit sprites: gatherer, brawler, sniper, healer, shieldbearer,
 * scout, swimmer, trapper, commander.
 */

import { PALETTE } from '@/constants';
import { type DrawCtx, OTTER_NOSE_HIGHLIGHT, OTTER_OUTLINE } from './draw-helpers';

/** Draw the base otter body shared by gatherer, brawler, sniper, healer, etc. */
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

/** Draw the standard otter body without extra outline on feet (healer/shieldbearer). */
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

export function drawGatherer(d: DrawCtx): void {
  drawOtterBase(d);
  d.rect(3, 5, 2, 2, PALETTE.clamShell);
}

export function drawBrawler(d: DrawCtx): void {
  drawOtterBase(d);
  d.rect(12, 4, 2, 7, PALETTE.reedBrown);
  d.rect(6, 1, 4, 2, PALETTE.clamShell);
}

export function drawSniper(d: DrawCtx): void {
  drawOtterBase(d);
  d.rect(13, 4, 1, 8, PALETTE.reedBrown);
  d.rect(12, 4, 1, 1, PALETTE.stoneL);
  d.rect(12, 11, 1, 1, PALETTE.stoneL);
}

export function drawHealer(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  d.rect(7, 6, 2, 5, '#22c55e');
  d.rect(6, 8, 4, 1, '#22c55e');
}

export function drawShieldbearer(d: DrawCtx): void {
  drawOtterBodyMinimal(d);
  d.rect(2, 5, 4, 6, PALETTE.clamShell);
  d.rect(1, 6, 1, 4, PALETTE.stoneL);
  d.p(3, 7, PALETTE.stone);
  d.p(3, 9, PALETTE.stone);
}

export function drawScout(d: DrawCtx): void {
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

export function drawSwimmer(d: DrawCtx): void {
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

export function drawTrapper(d: DrawCtx): void {
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
