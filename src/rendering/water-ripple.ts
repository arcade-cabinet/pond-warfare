/**
 * Water Ripple Overlay
 *
 * Loads two ripple PNG frames and cycles between them as a semi-transparent
 * overlay on Water and Shallows terrain tiles.
 *
 * - Shallows: cycle every 60 frames (~1s), 30% opacity
 * - Deep Water: cycle every 90 frames (~1.5s), 50% opacity
 *
 * Performance: pre-renders each frame to an offscreen canvas at terrain-grid
 * resolution, then draws the active canvas as a single drawImage() per frame.
 */

import { Sprite, Texture } from 'pixi.js';

import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import type { TerrainGrid } from '@/terrain/terrain-grid';
import { TerrainType } from '@/terrain/terrain-grid';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Two pre-rendered overlay canvases per terrain type (Water / Shallows). */
interface RippleFrames {
  water: [HTMLCanvasElement, HTMLCanvasElement];
  shallows: [HTMLCanvasElement, HTMLCanvasElement];
}

let frames: RippleFrames | null = null;
let waterSprite: Sprite | null = null;
let shallowsSprite: Sprite | null = null;
let waterTextures: [Texture, Texture] | null = null;
let shallowsTextures: [Texture, Texture] | null = null;

// Frame indices (0 or 1)
let waterFrame = 0;
let shallowsFrame = 0;

// Cycle intervals (in game frames)
const WATER_CYCLE = 90;
const SHALLOWS_CYCLE = 60;

// Opacity per terrain type
const WATER_ALPHA = 0.5;
const SHALLOWS_ALPHA = 0.3;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Load ripple PNGs and pre-render overlay canvases for each terrain type.
 * Returns a promise that resolves when both images have loaded.
 */
export async function initWaterRipples(terrainGrid: TerrainGrid): Promise<void> {
  const [img1, img2] = await Promise.all([
    loadImage('assets/ui/Flowing_Serenity_Water Ripples 1.png'),
    loadImage('assets/ui/Flowing_Serenity_Water ripples 2.png'),
  ]);

  const waterOverlays = buildOverlayPair(img1, img2, terrainGrid, TerrainType.Water);
  const shallowOverlays = buildOverlayPair(img1, img2, terrainGrid, TerrainType.Shallows);

  frames = { water: waterOverlays, shallows: shallowOverlays };

  waterTextures = [
    Texture.from({ resource: waterOverlays[0], antialias: false }),
    Texture.from({ resource: waterOverlays[1], antialias: false }),
  ];
  shallowsTextures = [
    Texture.from({ resource: shallowOverlays[0], antialias: false }),
    Texture.from({ resource: shallowOverlays[1], antialias: false }),
  ];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Build two overlay canvases (one per ripple frame) for a single terrain type.
 * Each canvas is WORLD_WIDTH x WORLD_HEIGHT but only the matching terrain
 * tiles have ripple pixels; everything else is transparent.
 */
function buildOverlayPair(
  img1: HTMLImageElement,
  img2: HTMLImageElement,
  terrainGrid: TerrainGrid,
  terrainType: TerrainType,
): [HTMLCanvasElement, HTMLCanvasElement] {
  return [
    buildSingleOverlay(img1, terrainGrid, terrainType),
    buildSingleOverlay(img2, terrainGrid, terrainType),
  ];
}

function buildSingleOverlay(
  img: HTMLImageElement,
  terrainGrid: TerrainGrid,
  terrainType: TerrainType,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Draw the ripple image tiled across water/shallows tiles
  for (let row = 0; row < terrainGrid.rows; row++) {
    for (let col = 0; col < terrainGrid.cols; col++) {
      if (terrainGrid.get(col, row) !== terrainType) continue;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      ctx.drawImage(
        img,
        x % img.width,
        y % img.height,
        TILE_SIZE,
        TILE_SIZE,
        x,
        y,
        TILE_SIZE,
        TILE_SIZE,
      );
    }
  }

  return canvas;
}

// ---------------------------------------------------------------------------
// Per-frame update
// ---------------------------------------------------------------------------

/**
 * Create PixiJS sprites for the ripple overlays and add them to the bgLayer.
 * Call once after initWaterRipples() resolves and PixiJS is initialised.
 */
export function attachRippleSprites(bgLayer: { addChild: (child: Sprite) => void }): void {
  if (!waterTextures || !shallowsTextures) return;

  waterSprite = new Sprite(waterTextures[0]);
  waterSprite.alpha = WATER_ALPHA;
  waterSprite.zIndex = 1;
  bgLayer.addChild(waterSprite);

  shallowsSprite = new Sprite(shallowsTextures[0]);
  shallowsSprite.alpha = SHALLOWS_ALPHA;
  shallowsSprite.zIndex = 2;
  bgLayer.addChild(shallowsSprite);
}

/**
 * Swap ripple frames at the correct intervals. Call each frame.
 */
export function updateWaterRipples(frameCount: number): void {
  if (!waterTextures || !shallowsTextures) return;

  // Deep water: swap every WATER_CYCLE frames
  if (frameCount % WATER_CYCLE === 0) {
    waterFrame = waterFrame === 0 ? 1 : 0;
    if (waterSprite) waterSprite.texture = waterTextures[waterFrame];
  }

  // Shallows: swap every SHALLOWS_CYCLE frames
  if (frameCount % SHALLOWS_CYCLE === 0) {
    shallowsFrame = shallowsFrame === 0 ? 1 : 0;
    if (shallowsSprite) shallowsSprite.texture = shallowsTextures[shallowsFrame];
  }
}

/**
 * Reset state (e.g. on game restart).
 */
export function resetWaterRipples(): void {
  if (waterSprite) {
    waterSprite.destroy();
    waterSprite = null;
  }
  if (shallowsSprite) {
    shallowsSprite.destroy();
    shallowsSprite = null;
  }
  if (waterTextures) {
    waterTextures[0].destroy(true);
    waterTextures[1].destroy(true);
    waterTextures = null;
  }
  if (shallowsTextures) {
    shallowsTextures[0].destroy(true);
    shallowsTextures[1].destroy(true);
    shallowsTextures = null;
  }
  frames = null;
  waterFrame = 0;
  shallowsFrame = 0;
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Exported for testing: get the current frame index for a terrain type. */
export function _getCurrentFrame(type: 'water' | 'shallows'): number {
  return type === 'water' ? waterFrame : shallowsFrame;
}

/** Exported for testing: get cycle interval constants. */
export function _getCycleIntervals(): { water: number; shallows: number } {
  return { water: WATER_CYCLE, shallows: SHALLOWS_CYCLE };
}

/** Exported for testing: check if ripple sprites are attached. */
export function _isInitialised(): boolean {
  return frames !== null;
}
