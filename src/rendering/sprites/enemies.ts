/**
 * Enemy/reptile sprites: gator, snake, boss_croc, armored_gator, venom_snake,
 * swamp_drake, siege_turtle, alpha_predator, burrowing_worm, flying_heron.
 */

import { PALETTE } from '@/constants';
import { type DrawCtx, GATOR_SCALE_HIGHLIGHT } from './draw-helpers';

export function drawGator(d: DrawCtx): void {
  const { p, rect } = d;
  rect(3, 10, 10, 4, PALETTE.gatorBase);
  for (let i = 3; i < 12; i += 2) p(i, 9, PALETTE.gatorLight);
  p(5, 11, GATOR_SCALE_HIGHLIGHT);
  p(8, 10, GATOR_SCALE_HIGHLIGHT);
  p(11, 11, GATOR_SCALE_HIGHLIGHT);
  rect(13, 11, 3, 2, PALETTE.gatorBase);
  rect(0, 11, 4, 3, PALETTE.gatorLight);
  p(3, 10, PALETTE.gatorEye);
  p(0, 13, '#ffffff');
  p(1, 13, '#ffffff');
  rect(3, 14, 2, 1, PALETTE.gatorLight);
  rect(9, 14, 2, 1, PALETTE.gatorLight);
}

export function drawSnake(d: DrawCtx): void {
  const { p, rect } = d;
  rect(4, 12, 8, 2, PALETTE.snakeBase);
  rect(2, 10, 4, 2, PALETTE.snakeBase);
  rect(10, 10, 4, 2, PALETTE.snakeBase);
  rect(12, 8, 2, 2, PALETTE.snakeBase);
  p(13, 8, PALETTE.black);
  p(14, 9, PALETTE.clamMeat);
  p(14, 10, '#ffffff');
  p(6, 11, GATOR_SCALE_HIGHLIGHT);
  p(10, 11, GATOR_SCALE_HIGHLIGHT);
  p(5, 12, PALETTE.snakeStripe);
  p(7, 12, PALETTE.snakeStripe);
  p(9, 12, PALETTE.snakeStripe);
}

export function drawBossCroc(d: DrawCtx): void {
  const { p, rect } = d;
  rect(4, 14, 24, 8, PALETTE.gatorBase);
  for (let i = 4; i < 28; i += 2) p(i, 13, PALETTE.gatorLight);
  p(8, 16, GATOR_SCALE_HIGHLIGHT);
  p(14, 15, GATOR_SCALE_HIGHLIGHT);
  p(20, 16, GATOR_SCALE_HIGHLIGHT);
  p(24, 15, GATOR_SCALE_HIGHLIGHT);
  rect(0, 16, 8, 6, PALETTE.gatorLight);
  p(2, 15, '#ff0000');
  p(5, 15, '#ff0000');
  p(2, 14, '#cc0000');
  p(5, 14, '#cc0000');
  p(0, 21, '#ffffff');
  p(1, 21, '#ffffff');
  p(6, 21, '#ffffff');
  p(7, 21, '#ffffff');
  rect(26, 16, 6, 4, PALETTE.gatorBase);
  for (let i = 8; i < 24; i += 4) {
    rect(i, 12, 3, 2, PALETTE.stone);
  }
  rect(4, 22, 4, 2, PALETTE.gatorLight);
  rect(20, 22, 4, 2, PALETTE.gatorLight);
}

export function drawArmoredGator(d: DrawCtx): void {
  const { p, rect } = d;
  rect(2, 9, 12, 5, '#0f4a28');
  rect(14, 10, 2, 3, '#0f4a28');
  rect(0, 10, 4, 4, PALETTE.gatorLight);
  p(1, 9, PALETTE.gatorEye);
  p(0, 13, '#ffffff');
  p(1, 13, '#ffffff');
  rect(2, 14, 3, 1, PALETTE.gatorLight);
  rect(10, 14, 3, 1, PALETTE.gatorLight);
  rect(3, 7, 3, 3, PALETTE.stoneL);
  rect(7, 7, 3, 3, PALETTE.stoneL);
  rect(11, 8, 3, 2, PALETTE.stoneL);
  p(4, 8, '#d4d4d8');
  p(8, 8, '#d4d4d8');
  p(12, 9, '#d4d4d8');
  rect(3, 10, 3, 1, PALETTE.stone);
  rect(7, 10, 3, 1, PALETTE.stone);
  rect(11, 10, 3, 1, PALETTE.stone);
}

export function drawVenomSnake(d: DrawCtx): void {
  const { p, rect } = d;
  const venomBase = '#a855f7';
  const venomStripe = '#7c3aed';
  rect(4, 12, 8, 2, venomBase);
  rect(2, 10, 4, 2, venomBase);
  rect(10, 10, 4, 2, venomBase);
  rect(12, 8, 2, 2, venomBase);
  p(13, 8, PALETTE.black);
  p(14, 9, '#f87171');
  p(14, 10, '#ffffff');
  p(14, 11, '#22c55e');
  p(15, 10, '#22c55e');
  p(5, 12, venomStripe);
  p(7, 12, venomStripe);
  p(9, 12, venomStripe);
  p(6, 11, '#c084fc');
  p(10, 11, '#c084fc');
}

export function drawSwampDrake(d: DrawCtx): void {
  const { p, rect } = d;
  rect(4, 8, 8, 4, PALETTE.gatorBase);
  rect(12, 9, 3, 2, PALETTE.gatorBase);
  rect(1, 9, 3, 3, PALETTE.gatorLight);
  p(2, 8, '#ff0000');
  p(2, 9, '#ff4444');
  rect(5, 12, 2, 2, PALETTE.gatorLight);
  rect(10, 12, 2, 2, PALETTE.gatorLight);
  rect(3, 3, 2, 5, '#2d6a4f');
  rect(1, 4, 4, 4, '#40916c');
  p(0, 5, '#40916c');
  p(0, 6, '#40916c');
  p(1, 3, '#52b788');
  rect(11, 3, 2, 5, '#2d6a4f');
  rect(11, 4, 4, 4, '#40916c');
  p(15, 5, '#40916c');
  p(15, 6, '#40916c');
  p(14, 3, '#52b788');
  rect(5, 7, 6, 1, '#2d6a4f');
}

export function drawSiegeTurtle(d: DrawCtx): void {
  const { p, rect, circle } = d;
  circle(16, 16, 12, '#3d2b1f');
  circle(16, 16, 10, PALETTE.stone);
  rect(12, 10, 4, 4, '#64748b');
  rect(17, 10, 4, 4, '#64748b');
  rect(10, 15, 4, 4, '#64748b');
  rect(15, 15, 4, 4, '#64748b');
  rect(20, 15, 4, 4, '#64748b');
  rect(12, 20, 4, 4, '#64748b');
  rect(17, 20, 4, 4, '#64748b');
  p(14, 12, PALETTE.stoneL);
  p(19, 12, PALETTE.stoneL);
  p(17, 17, PALETTE.stoneL);
  rect(7, 22, 4, 4, PALETTE.gatorLight);
  rect(21, 22, 4, 4, PALETTE.gatorLight);
  rect(7, 8, 4, 4, PALETTE.gatorLight);
  rect(21, 8, 4, 4, PALETTE.gatorLight);
  rect(0, 13, 10, 6, PALETTE.gatorBase);
  rect(1, 14, 2, 2, PALETTE.gatorLight);
  p(3, 13, PALETTE.gatorEye);
  rect(0, 15, 3, 2, '#78350f');
  p(0, 15, PALETTE.stoneL);
  p(0, 16, PALETTE.stoneL);
}

export function drawAlphaPredator(d: DrawCtx): void {
  const { p, rect } = d;
  rect(2, 14, 28, 10, PALETTE.gatorBase);
  for (let i = 2; i < 30; i += 2) p(i, 13, PALETTE.gatorLight);
  p(8, 16, '#34d399');
  p(14, 15, '#34d399');
  p(20, 16, '#34d399');
  p(26, 15, '#34d399');
  rect(0, 16, 6, 8, PALETTE.gatorLight);
  p(1, 15, '#ff0000');
  p(4, 15, '#ff0000');
  p(1, 14, '#ff4444');
  p(4, 14, '#ff4444');
  p(0, 23, '#ffffff');
  p(1, 23, '#ffffff');
  p(4, 23, '#ffffff');
  p(5, 23, '#ffffff');
  rect(28, 16, 4, 4, PALETTE.gatorBase);
  for (let i = 6; i < 26; i += 4) {
    rect(i, 12, 3, 2, PALETTE.stone);
    rect(i, 10, 3, 1, PALETTE.stoneL);
  }
  p(1, 12, '#ffffff');
  p(3, 11, '#ffffff');
  p(5, 12, '#ffffff');
  p(2, 10, '#e2e8f0');
  p(4, 10, '#e2e8f0');
  rect(6, 24, 4, 2, PALETTE.gatorLight);
  rect(22, 24, 4, 2, PALETTE.gatorLight);
}

/** BurrowingWorm -- brown segmented worm that tunnels underground. */
export function drawBurrowingWorm(d: DrawCtx): void {
  const { p, rect } = d;
  // Body segments (worm coiling up from underground)
  rect(3, 12, 4, 3, '#8B4513');
  rect(6, 10, 4, 3, '#A0522D');
  rect(9, 8, 4, 3, '#8B4513');
  rect(11, 6, 3, 3, '#A0522D');
  // Segment rings for definition
  p(4, 12, '#6B3410');
  p(7, 10, '#6B3410');
  p(10, 8, '#6B3410');
  p(12, 6, '#6B3410');
  // Belly highlights
  p(5, 13, '#D2B48C');
  p(8, 11, '#D2B48C');
  p(11, 9, '#D2B48C');
  // Head with mandibles
  rect(12, 4, 3, 3, '#A0522D');
  p(13, 4, '#8B4513');
  p(12, 5, PALETTE.black); // eye
  p(14, 3, '#6B3410'); // mandible left
  p(15, 3, '#6B3410'); // mandible right
  p(14, 2, '#6B3410'); // mandible tip
  // Dirt particles around emergence point
  p(2, 14, PALETTE.mudLight);
  p(4, 15, PALETTE.mudDark);
  p(1, 13, PALETTE.mudLight);
}

/** FlyingHeron -- gray bird silhouette with outstretched wings. */
export function drawFlyingHeron(d: DrawCtx): void {
  const { p, rect } = d;
  // Body (center mass)
  rect(6, 7, 4, 4, '#6b7280');
  rect(7, 8, 2, 2, '#9ca3af'); // lighter belly
  // Head and beak
  rect(5, 5, 3, 3, '#6b7280');
  p(4, 5, '#9ca3af'); // crown
  p(3, 6, '#f59e0b'); // beak base
  p(2, 6, '#d97706'); // beak tip
  p(5, 5, PALETTE.black); // eye
  // Left wing (outstretched)
  rect(1, 7, 5, 2, '#9ca3af');
  rect(0, 8, 2, 1, '#6b7280');
  p(0, 7, '#d1d5db'); // wing tip highlight
  // Right wing (outstretched)
  rect(10, 7, 5, 2, '#9ca3af');
  rect(14, 8, 2, 1, '#6b7280');
  p(15, 7, '#d1d5db'); // wing tip highlight
  // Tail feathers
  rect(8, 11, 3, 2, '#6b7280');
  p(9, 13, '#9ca3af');
  // Legs (tucked in flight)
  p(7, 12, '#f59e0b');
  p(8, 12, '#f59e0b');
}
