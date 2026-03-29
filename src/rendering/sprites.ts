/**
 * Procedural Sprite Generator
 *
 * Faithful port of SpriteGen (lines 234-311 of pond_craft.html).
 * Generates all 14 sprite types on offscreen canvases, then converts
 * to PixiJS Textures. Every pixel placement matches the original exactly.
 */

import { PALETTE } from '@/constants';
import { SpriteId } from '@/types';
import { registerSpriteTexture } from './pixi-app';

/** Names used internally to map to SpriteId enum values. */
const SPRITE_NAMES: { name: string; id: SpriteId }[] = [
  { name: 'gatherer', id: SpriteId.Gatherer },
  { name: 'brawler', id: SpriteId.Brawler },
  { name: 'sniper', id: SpriteId.Sniper },
  { name: 'gator', id: SpriteId.Gator },
  { name: 'snake', id: SpriteId.Snake },
  { name: 'lodge', id: SpriteId.Lodge },
  { name: 'burrow', id: SpriteId.Burrow },
  { name: 'armory', id: SpriteId.Armory },
  { name: 'tower', id: SpriteId.Tower },
  { name: 'predator_nest', id: SpriteId.PredatorNest },
  { name: 'cattail', id: SpriteId.Cattail },
  { name: 'clambed', id: SpriteId.Clambed },
  { name: 'bones', id: SpriteId.Bones },
  { name: 'rubble', id: SpriteId.Rubble },
];

const LARGE_TYPES = new Set(['lodge', 'burrow', 'armory', 'tower', 'predator_nest', 'rubble']);

/**
 * Generate a single sprite canvas at native pixel-art resolution,
 * then scale it up with nearest-neighbour filtering.
 * Returns the scaled HTMLCanvasElement (same as original SpriteGen.generate).
 */
function generateSpriteCanvas(type: string): HTMLCanvasElement {
  const size = LARGE_TYPES.has(type) ? 32 : 16;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;

  const p = (x: number, y: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
  };

  const rect = (x: number, y: number, w: number, h: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  };

  const circle = (cx: number, cy: number, r: number, color: string): void => {
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        if (x * x + y * y <= r * r) p(cx + x, cy + y, color);
      }
    }
  };

  if (type === 'gatherer' || type === 'brawler' || type === 'sniper') {
    // Otter base body
    rect(5, 4, 6, 8, PALETTE.otterBase);
    rect(6, 5, 4, 6, PALETTE.otterBelly);
    rect(5, 2, 6, 4, PALETTE.otterBase);
    // Face
    p(6, 3, PALETTE.black);
    p(9, 3, PALETTE.black);
    p(7, 4, PALETTE.otterNose);
    p(8, 4, PALETTE.otterNose);
    // Arms
    rect(4, 5, 1, 4, PALETTE.otterBase);
    rect(11, 5, 1, 4, PALETTE.otterBase);
    // Legs & tail
    rect(5, 12, 2, 2, PALETTE.otterBase);
    rect(9, 12, 2, 2, PALETTE.otterBase);
    rect(11, 10, 3, 2, PALETTE.otterBase);
    // Type-specific items
    if (type === 'gatherer') {
      rect(3, 5, 2, 2, PALETTE.clamShell);
    }
    if (type === 'brawler') {
      rect(12, 4, 2, 7, PALETTE.reedBrown);
      rect(6, 1, 4, 2, PALETTE.clamShell);
    }
    if (type === 'sniper') {
      rect(13, 4, 1, 8, PALETTE.reedBrown);
      rect(12, 4, 1, 1, PALETTE.stoneL);
      rect(12, 11, 1, 1, PALETTE.stoneL);
    }
  } else if (type === 'gator') {
    rect(3, 10, 10, 4, PALETTE.gatorBase);
    for (let i = 3; i < 12; i += 2) p(i, 9, PALETTE.gatorLight);
    rect(13, 11, 3, 2, PALETTE.gatorBase);
    rect(0, 11, 4, 3, PALETTE.gatorLight);
    p(3, 10, PALETTE.gatorEye);
    rect(3, 14, 2, 1, PALETTE.gatorLight);
    rect(9, 14, 2, 1, PALETTE.gatorLight);
  } else if (type === 'snake') {
    rect(4, 12, 8, 2, PALETTE.snakeBase);
    rect(2, 10, 4, 2, PALETTE.snakeBase);
    rect(10, 10, 4, 2, PALETTE.snakeBase);
    rect(12, 8, 2, 2, PALETTE.snakeBase);
    p(13, 8, PALETTE.black);
    p(14, 9, PALETTE.clamMeat);
    p(5, 12, PALETTE.snakeStripe);
    p(7, 12, PALETTE.snakeStripe);
    p(9, 12, PALETTE.snakeStripe);
  } else if (type === 'cattail') {
    rect(7, 4, 2, 10, PALETTE.reedGreen);
    rect(6, 2, 4, 6, PALETTE.reedBrown);
    p(7, 1, PALETTE.otterBase);
    p(8, 1, PALETTE.otterBase);
    p(8, 12, PALETTE.reedGreen);
    p(9, 11, PALETTE.reedGreen);
  } else if (type === 'clambed') {
    circle(8, 10, 6, PALETTE.waterShallow);
    rect(5, 9, 2, 2, PALETTE.clamShell);
    p(6, 9, PALETTE.stone);
    rect(9, 11, 3, 2, PALETTE.clamShell);
    p(10, 11, PALETTE.stone);
    rect(7, 13, 2, 2, PALETTE.clamShell);
  } else if (type === 'bones') {
    rect(6, 6, 4, 4, '#cbd5e1');
    p(7, 7, '#000');
    p(8, 7, '#000');
    rect(7, 10, 2, 4, '#cbd5e1');
    rect(5, 11, 6, 1, '#cbd5e1');
    rect(6, 13, 4, 1, '#cbd5e1');
  } else if (type === 'rubble') {
    for (let i = 0; i < 40; i++) {
      const rx = 4 + Math.random() * 24;
      const ry = 16 + Math.random() * 12;
      rect(
        rx,
        ry,
        Math.random() * 4 + 1,
        Math.random() * 2 + 1,
        Math.random() > 0.5 ? PALETTE.mudDark : PALETTE.wood,
      );
    }
  } else if (type === 'tower') {
    rect(8, 16, 16, 14, PALETTE.mudLight);
    for (let i = 0; i < 30; i++)
      p(8 + Math.random() * 16, 16 + Math.random() * 14, PALETTE.mudDark);
    rect(6, 8, 20, 8, PALETTE.mudDark);
    rect(10, 4, 12, 4, PALETTE.reedGreen);
    rect(14, 22, 4, 8, PALETTE.black);
    rect(14, 12, 4, 2, PALETTE.black);
  } else if (type === 'predator_nest') {
    circle(16, 16, 12, PALETTE.mudDark);
    circle(16, 18, 8, PALETTE.black);
    rect(6, 10, 2, 16, PALETTE.gatorBase);
    rect(24, 12, 2, 14, PALETTE.gatorBase);
    rect(10, 6, 2, 12, PALETTE.gatorBase);
    p(14, 16, PALETTE.gatorEye);
    p(18, 16, PALETTE.gatorEye);
  } else if (type === 'lodge') {
    circle(16, 20, 14, PALETTE.mudDark);
    for (let i = 0; i < 80; i++)
      p(4 + Math.random() * 24, 8 + Math.random() * 24, PALETTE.mudLight);
    for (let i = 0; i < 40; i++)
      rect(4 + Math.random() * 22, 10 + Math.random() * 18, 6, 2, PALETTE.otterBase);
    rect(12, 22, 8, 8, PALETTE.black);
  } else if (type === 'burrow') {
    circle(16, 24, 8, PALETTE.mudDark);
    for (let i = 0; i < 20; i++)
      p(8 + Math.random() * 16, 16 + Math.random() * 8, PALETTE.mudLight);
    rect(14, 24, 4, 6, PALETTE.black);
  } else if (type === 'armory') {
    rect(4, 12, 24, 16, PALETTE.waterMid);
    rect(2, 10, 28, 4, PALETTE.mudDark);
    rect(2, 10, 4, 20, PALETTE.mudDark);
    rect(26, 10, 4, 20, PALETTE.mudDark);
    rect(2, 26, 28, 4, PALETTE.mudDark);
    for (let i = 0; i < 30; i++) {
      p(2 + Math.random() * 28, 10 + Math.random() * 4, PALETTE.otterBase);
      p(2 + Math.random() * 28, 26 + Math.random() * 4, PALETTE.otterBase);
    }
    rect(12, 24, 8, 8, PALETTE.waterShallow);
    rect(22, 4, 4, 8, PALETTE.stoneL);
    p(23, 4, PALETTE.black);
    p(24, 4, PALETTE.black);
  }

  // Scale up with nearest-neighbour (no smoothing)
  const scale = LARGE_TYPES.has(type) ? 3 : 2.5;
  const sCanvas = document.createElement('canvas');
  sCanvas.width = size * scale;
  sCanvas.height = size * scale;
  const sCtx = sCanvas.getContext('2d')!;
  sCtx.imageSmoothingEnabled = false;
  sCtx.drawImage(c, 0, 0, size * scale, size * scale);

  return sCanvas;
}

/**
 * Generate all 14 sprite types and return a Map<SpriteId, HTMLCanvasElement>
 * for Canvas2D usage.
 */
export function generateAllSprites(): {
  canvases: Map<SpriteId, HTMLCanvasElement>;
} {
  const canvases = new Map<SpriteId, HTMLCanvasElement>();

  for (const { name, id } of SPRITE_NAMES) {
    const canvas = generateSpriteCanvas(name);
    canvases.set(id, canvas);
    // Register as a PixiJS Texture for the main game renderer
    registerSpriteTexture(id, canvas);
  }

  return { canvases };
}

/** Convenience: get the sprite canvas dimensions for a given SpriteId. */
const LARGE_SPRITE_IDS = new Set<SpriteId>([
  SpriteId.Lodge,
  SpriteId.Burrow,
  SpriteId.Armory,
  SpriteId.Tower,
  SpriteId.PredatorNest,
  SpriteId.Rubble,
]);

export function getSpriteSize(id: SpriteId): { width: number; height: number } {
  const isLarge = LARGE_SPRITE_IDS.has(id);
  const baseSize = isLarge ? 32 : 16;
  const scale = isLarge ? 3 : 2.5;
  return { width: baseSize * scale, height: baseSize * scale };
}
