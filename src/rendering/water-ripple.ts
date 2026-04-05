/**
 * Water Ripple Overlay
 *
 * Generates two procedural ripple frames using Canvas2D concentric circles
 * with alpha gradients, then cycles between them as a semi-transparent
 * overlay on Water and Shallows terrain tiles.
 *
 * - Shallows: cycle every 60 frames (~1s), 30% opacity
 * - Deep Water: cycle every 90 frames (~1.5s), 50% opacity
 *
 * Performance: pre-renders each frame to an offscreen canvas at terrain-grid
 * resolution, then draws the active canvas as a single drawImage() per frame.
 *
 * Fully procedural — zero PNG dependencies.
 */

import { Sprite, Texture } from 'pixi.js';

import { TILE_SIZE } from '@/constants';
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

// Ripple tile size for procedural generation
const RIPPLE_TILE = 128;

// ---------------------------------------------------------------------------
// Procedural ripple tile generation
// ---------------------------------------------------------------------------

/**
 * Generate a single ripple tile as an offscreen canvas.
 * Draws concentric circles with alpha gradients to simulate water surface.
 *
 * @param phase - 0 or 1, shifts circle positions for animation variety
 */
function generateRippleTile(phase: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = RIPPLE_TILE;
  canvas.height = RIPPLE_TILE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Two ripple centers per tile, offset by phase
  const centers = [
    { x: RIPPLE_TILE * 0.3 + phase * 12, y: RIPPLE_TILE * 0.3 + phase * 8 },
    { x: RIPPLE_TILE * 0.7 - phase * 10, y: RIPPLE_TILE * 0.7 - phase * 6 },
  ];

  for (const center of centers) {
    const maxRadius = RIPPLE_TILE * 0.4;
    const ringCount = 4 + phase;

    for (let r = ringCount; r >= 1; r--) {
      const radius = (r / ringCount) * maxRadius;
      const alpha = 0.15 * (1 - r / (ringCount + 1));

      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(120, 180, 200, ${alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Add a subtle radial gradient fill for overall shimmer
  const grad = ctx.createRadialGradient(
    RIPPLE_TILE * 0.5,
    RIPPLE_TILE * 0.5,
    0,
    RIPPLE_TILE * 0.5,
    RIPPLE_TILE * 0.5,
    RIPPLE_TILE * 0.6,
  );
  grad.addColorStop(0, `rgba(140, 200, 220, ${0.06 + phase * 0.02})`);
  grad.addColorStop(1, 'rgba(140, 200, 220, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RIPPLE_TILE, RIPPLE_TILE);

  return canvas;
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/**
 * Generate procedural ripple tiles and pre-render overlay canvases for each
 * terrain type. Returns a promise for API compatibility with callers.
 */
export async function initWaterRipples(terrainGrid: TerrainGrid): Promise<void> {
  const tile1 = generateRippleTile(0);
  const tile2 = generateRippleTile(1);

  const waterOverlays = buildOverlayPair(tile1, tile2, terrainGrid, TerrainType.Water);
  const shallowOverlays = buildOverlayPair(tile1, tile2, terrainGrid, TerrainType.Shallows);

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

/**
 * Build two overlay canvases (one per ripple frame) for a single terrain type.
 * Canvas dimensions are derived from the terrain grid (cols * tileSize x rows * tileSize).
 */
function buildOverlayPair(
  tile1: HTMLCanvasElement,
  tile2: HTMLCanvasElement,
  terrainGrid: TerrainGrid,
  terrainType: TerrainType,
): [HTMLCanvasElement, HTMLCanvasElement] {
  return [
    buildSingleOverlay(tile1, terrainGrid, terrainType),
    buildSingleOverlay(tile2, terrainGrid, terrainType),
  ];
}

function buildSingleOverlay(
  tile: HTMLCanvasElement,
  terrainGrid: TerrainGrid,
  terrainType: TerrainType,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const canvasW = terrainGrid.cols * TILE_SIZE;
  const canvasH = terrainGrid.rows * TILE_SIZE;
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Draw the ripple tile tiled across water/shallows tiles
  for (let row = 0; row < terrainGrid.rows; row++) {
    for (let col = 0; col < terrainGrid.cols; col++) {
      if (terrainGrid.get(col, row) !== terrainType) continue;
      const x = col * TILE_SIZE;
      const y = row * TILE_SIZE;
      ctx.drawImage(
        tile,
        x % tile.width,
        y % tile.height,
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
