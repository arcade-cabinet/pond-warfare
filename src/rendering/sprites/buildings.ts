/**
 * Building sprites: lodge, burrow, armory, tower, watchtower, predator_nest,
 * wall, scout_post, fishing_hut, herbalist_hut.
 */

import { PALETTE } from '@/constants';
import { DOORWAY_GLOW, type DrawCtx, FLAME_ORANGE, FLAME_YELLOW } from './draw-helpers';

export function drawLodge(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(16, 20, 14, PALETTE.mudDark);
  for (let i = 0; i < 80; i++) p(4 + Math.random() * 24, 8 + Math.random() * 24, PALETTE.mudLight);
  for (let i = 0; i < 40; i++)
    rect(4 + Math.random() * 22, 10 + Math.random() * 18, 6, 2, PALETTE.otterBase);
  for (let i = 0; i < 25; i++) p(6 + Math.random() * 20, 10 + Math.random() * 18, '#5c2d0a');
  rect(12, 22, 8, 8, PALETTE.black);
  p(15, 23, DOORWAY_GLOW);
  p(16, 23, DOORWAY_GLOW);
  p(15, 24, DOORWAY_GLOW);
  p(16, 24, DOORWAY_GLOW);
}

export function drawBurrow(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(16, 24, 8, PALETTE.mudDark);
  for (let i = 0; i < 20; i++) p(8 + Math.random() * 16, 16 + Math.random() * 8, PALETTE.mudLight);
  for (let i = 0; i < 10; i++) p(10 + Math.random() * 12, 18 + Math.random() * 6, '#5c2d0a');
  rect(14, 24, 4, 6, PALETTE.black);
  p(15, 25, DOORWAY_GLOW);
  p(16, 25, DOORWAY_GLOW);
}

export function drawArmory(d: DrawCtx): void {
  const { p, rect } = d;
  rect(4, 12, 24, 16, PALETTE.waterMid);
  rect(2, 10, 28, 4, PALETTE.mudDark);
  rect(2, 10, 4, 20, PALETTE.mudDark);
  rect(26, 10, 4, 20, PALETTE.mudDark);
  rect(2, 26, 28, 4, PALETTE.mudDark);
  for (let i = 0; i < 30; i++) {
    p(2 + Math.random() * 28, 10 + Math.random() * 4, PALETTE.otterBase);
    p(2 + Math.random() * 28, 26 + Math.random() * 4, PALETTE.otterBase);
  }
  for (let i = 0; i < 20; i++) p(3 + Math.random() * 26, 10 + Math.random() * 20, '#5c2d0a');
  rect(12, 24, 8, 8, PALETTE.waterShallow);
  p(15, 25, DOORWAY_GLOW);
  p(16, 25, DOORWAY_GLOW);
  rect(22, 4, 4, 8, PALETTE.stoneL);
  p(23, 4, PALETTE.black);
  p(24, 4, PALETTE.black);
}

export function drawTower(d: DrawCtx): void {
  const { p, rect } = d;
  rect(8, 16, 16, 14, PALETTE.mudLight);
  for (let i = 0; i < 30; i++) p(8 + Math.random() * 16, 16 + Math.random() * 14, PALETTE.mudDark);
  for (let i = 0; i < 15; i++) p(9 + Math.random() * 14, 17 + Math.random() * 12, '#5c2d0a');
  rect(6, 8, 20, 8, PALETTE.mudDark);
  rect(10, 4, 12, 4, PALETTE.reedGreen);
  rect(14, 22, 4, 8, PALETTE.black);
  p(15, 23, DOORWAY_GLOW);
  p(16, 23, DOORWAY_GLOW);
  rect(14, 12, 4, 2, PALETTE.black);
  p(15, 5, FLAME_ORANGE);
  p(16, 5, FLAME_ORANGE);
  p(15, 4, FLAME_YELLOW);
}

export function drawWatchtower(d: DrawCtx): void {
  const { p, rect } = d;
  rect(6, 12, 20, 18, PALETTE.stone);
  for (let i = 0; i < 40; i++) p(6 + Math.random() * 20, 12 + Math.random() * 18, PALETTE.stoneL);
  for (let i = 0; i < 15; i++) p(8 + Math.random() * 16, 14 + Math.random() * 14, '#374151');
  rect(4, 6, 24, 6, PALETTE.stone);
  rect(8, 2, 16, 4, '#64748b');
  rect(12, 22, 8, 10, PALETTE.black);
  p(15, 23, DOORWAY_GLOW);
  p(16, 23, DOORWAY_GLOW);
  p(15, 4, FLAME_ORANGE);
  p(16, 4, FLAME_ORANGE);
  p(15, 3, FLAME_YELLOW);
  rect(22, 0, 1, 8, PALETTE.otterBase);
  rect(23, 0, 6, 4, '#ef4444');
}

export function drawPredatorNest(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(16, 16, 12, PALETTE.mudDark);
  circle(16, 18, 8, PALETTE.black);
  rect(6, 10, 2, 16, PALETTE.gatorBase);
  rect(24, 12, 2, 14, PALETTE.gatorBase);
  rect(10, 6, 2, 12, PALETTE.gatorBase);
  p(14, 16, PALETTE.gatorEye);
  p(18, 16, PALETTE.gatorEye);
}

export function drawWall(d: DrawCtx): void {
  const { rect } = d;
  rect(2, 12, 28, 8, PALETTE.mudDark);
  rect(4, 10, 24, 2, PALETTE.mudLight);
  rect(4, 20, 24, 2, PALETTE.mudLight);
  for (let i = 0; i < 6; i++) {
    rect(4 + i * 4, 12, 2, 8, PALETTE.otterBase);
  }
  rect(6, 8, 20, 2, PALETTE.reedBrown);
}

export function drawScoutPost(d: DrawCtx): void {
  const { rect } = d;
  rect(14, 4, 4, 24, PALETTE.reedBrown);
  rect(10, 4, 12, 3, PALETTE.mudLight);
  rect(8, 2, 16, 2, PALETTE.mudDark);
  rect(24, 0, 1, 8, PALETTE.reedBrown);
  rect(25, 0, 6, 4, '#38bdf8');
  rect(10, 26, 4, 4, PALETTE.mudDark);
  rect(18, 26, 4, 4, PALETTE.mudDark);
  rect(6, 28, 20, 2, PALETTE.mudLight);
}

export function drawFishingHut(d: DrawCtx): void {
  const { p, rect } = d;
  rect(8, 14, 16, 12, PALETTE.reedBrown);
  rect(6, 12, 20, 2, PALETTE.mudDark);
  rect(10, 26, 2, 6, PALETTE.reedBrown);
  rect(20, 26, 2, 6, PALETTE.reedBrown);
  rect(6, 28, 20, 4, PALETTE.waterShallow);
  rect(6, 8, 20, 4, PALETTE.mudLight);
  rect(14, 18, 4, 8, PALETTE.black);
  p(15, 19, DOORWAY_GLOW);
  p(16, 19, DOORWAY_GLOW);
  rect(22, 14, 2, 4, PALETTE.waterMid);
}

export function drawHerbalistHut(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(16, 20, 10, PALETTE.mudDark);
  for (let i = 0; i < 30; i++) p(8 + Math.random() * 16, 12 + Math.random() * 16, PALETTE.mudLight);
  rect(8, 8, 16, 6, PALETTE.reedGreen);
  rect(6, 10, 20, 4, PALETTE.reedGreen);
  for (let i = 0; i < 8; i++) p(8 + Math.random() * 14, 8 + Math.random() * 6, '#86efac');
  rect(13, 22, 6, 8, PALETTE.black);
  p(15, 23, DOORWAY_GLOW);
  p(16, 23, DOORWAY_GLOW);
  p(10, 16, '#22c55e');
  p(22, 16, '#22c55e');
  p(11, 18, '#4ade80');
  p(21, 18, '#4ade80');
}
