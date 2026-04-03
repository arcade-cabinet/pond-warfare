/**
 * Background & Fog Texture Generator
 *
 * - buildBackground(): generates the procedural terrain with biome
 *   blending using multi-octave value noise (fbm), splat blending between
 *   biome colors, detail noise, and shore foam effects.
 * - buildFogTexture(): generates the 256x256 seamless fog noise texture.
 *
 * The background canvas is sized to at least match the viewport so that
 * no black void is visible when the map is smaller than the screen.
 * Out-of-bounds pixels (outside the playable world) are filled with
 * procedural deep water.
 */

import { FOG_TEXTURE_SIZE } from '@/constants';
import type { TerrainGrid } from '@/terrain/terrain-grid';
import { TerrainType } from '@/terrain/terrain-grid';
import { biomeColor, fbm, type RGB, valueNoise } from './background-noise';

function require2DContext(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', options);
  if (!ctx) {
    throw new Error('2D canvas context is unavailable');
  }
  return ctx;
}

/**
 * Generate the full-world procedural terrain background canvas.
 *
 * Uses multi-octave value noise to create a biome map with smooth
 * blending between biome colors, detail noise for texture variation,
 * and shore foam effects along water-land boundaries.
 *
 * When a TerrainGrid is provided, terrain tiles are tinted to reflect
 * their type (water=blue, mud=brown, rocks=grey, high ground=bright).
 *
 * The canvas extends to `max(worldW, viewW) x max(worldH, viewH)` so
 * the viewport never sees black void. Pixels outside the playable area
 * are filled with deep water noise.
 *
 * @param worldW  - World width in pixels (defaults to terrainGrid dims or 2560).
 * @param worldH  - World height in pixels (defaults to terrainGrid dims or 2560).
 * @param viewW   - Viewport width (optional, used to extend canvas).
 * @param viewH   - Viewport height (optional, used to extend canvas).
 */
export function buildBackground(
  terrainGrid?: TerrainGrid,
  worldW?: number,
  worldH?: number,
  viewW?: number,
  viewH?: number,
): HTMLCanvasElement {
  const mapW = worldW ?? (terrainGrid ? terrainGrid.cols * 32 : 2560);
  const mapH = worldH ?? (terrainGrid ? terrainGrid.rows * 32 : 2560);

  // Canvas must be at least as large as the viewport to avoid black void.
  // Add padding so that when the camera centers a narrow map, the edges
  // outside the playable area still show terrain (deep water).
  const padX = viewW && viewW > mapW ? Math.ceil((viewW - mapW) / 2) : 0;
  const padY = viewH && viewH > mapH ? Math.ceil((viewH - mapH) / 2) : 0;
  const w = mapW + padX * 2;
  const h = mapH + padY * 2;

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = w;
  bgCanvas.height = h;
  const ctx = require2DContext(bgCanvas, { alpha: false });

  const imageData = ctx.createImageData(w, h);
  const pixels = imageData.data;

  const seed = 42;
  const detailSeed = 137;

  // Tile scale: map pixels across ~80 tiles of noise space
  const noiseScale = 80 / mapW;

  // Pre-compute the biome noise grid at a lower resolution and upsample
  // for performance. Use 4px blocks.
  const blockSize = 4;
  const gridW = Math.ceil(mapW / blockSize);
  const gridH = Math.ceil(mapH / blockSize);

  // Biome noise grid (covers only the playable area)
  const biomeGrid = new Float32Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const wx = gx * blockSize * noiseScale;
      const wy = gy * blockSize * noiseScale;
      biomeGrid[gy * gridW + gx] = fbm(wx, wy, 5, seed);
    }
  }

  // Deep water base color for out-of-bounds pixels
  const DEEP_WATER: RGB = { r: 15, g: 32, b: 50 };

  // Render pixels
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Convert canvas coords to map-space coords
      const mx = x - padX;
      const my = y - padY;

      // Out-of-bounds: fill with deep water noise
      if (mx < 0 || mx >= mapW || my < 0 || my >= mapH) {
        const detailNx = x * noiseScale * 2;
        const detailNy = y * noiseScale * 2;
        const detail = valueNoise(detailNx, detailNy, detailSeed);
        const offset = (detail - 0.5) * 12;
        const idx = (y * w + x) * 4;
        pixels[idx] = Math.max(0, Math.min(255, DEEP_WATER.r + offset));
        pixels[idx + 1] = Math.max(0, Math.min(255, DEEP_WATER.g + offset));
        pixels[idx + 2] = Math.max(0, Math.min(255, DEEP_WATER.b + offset));
        pixels[idx + 3] = 255;
        continue;
      }

      // Bilinear interpolation of the biome grid for smoother results
      const gxf = mx / blockSize;
      const gyf = my / blockSize;
      const gx0 = Math.min(Math.floor(gxf), gridW - 1);
      const gy0 = Math.min(Math.floor(gyf), gridH - 1);
      const gx1 = Math.min(gx0 + 1, gridW - 1);
      const gy1 = Math.min(gy0 + 1, gridH - 1);
      const fx = gxf - gx0;
      const fy = gyf - gy0;

      const n00 = biomeGrid[gy0 * gridW + gx0];
      const n10 = biomeGrid[gy0 * gridW + gx1];
      const n01 = biomeGrid[gy1 * gridW + gx0];
      const n11 = biomeGrid[gy1 * gridW + gx1];

      const nx0 = n00 + fx * (n10 - n00);
      const nx1 = n01 + fx * (n11 - n01);
      const biomeVal = nx0 + fy * (nx1 - nx0);

      // Get base biome color
      let color = biomeColor(biomeVal);

      // Detail noise: higher frequency texture variation within each biome
      const detailNx = mx * noiseScale * 4;
      const detailNy = my * noiseScale * 4;
      const detail = valueNoise(detailNx, detailNy, detailSeed);
      const detailOffset = (detail - 0.5) * 16; // +/- 8 brightness variation

      color = {
        r: Math.max(0, Math.min(255, color.r + detailOffset)),
        g: Math.max(0, Math.min(255, color.g + detailOffset)),
        b: Math.max(0, Math.min(255, color.b + detailOffset)),
      };

      // Shore foam effect: detect water-land boundary
      const gx = Math.min(Math.floor(mx / blockSize), gridW - 1);
      const gy = Math.min(Math.floor(my / blockSize), gridH - 1);
      if (biomeVal > 0.4 && biomeVal < 0.5) {
        const leftBiome = gx > 0 ? biomeGrid[gy * gridW + (gx - 1)] : biomeVal;
        const rightBiome = gx < gridW - 1 ? biomeGrid[gy * gridW + (gx + 1)] : biomeVal;
        const upBiome = gy > 0 ? biomeGrid[(gy - 1) * gridW + gx] : biomeVal;
        const downBiome = gy < gridH - 1 ? biomeGrid[(gy + 1) * gridW + gx] : biomeVal;

        const hasWaterNeighbor =
          leftBiome < 0.35 || rightBiome < 0.35 || upBiome < 0.35 || downBiome < 0.35;

        if (hasWaterNeighbor) {
          const foamStrength = 0.3 + detail * 0.3;
          color = {
            r: Math.min(255, color.r + Math.round(60 * foamStrength)),
            g: Math.min(255, color.g + Math.round(70 * foamStrength)),
            b: Math.min(255, color.b + Math.round(80 * foamStrength)),
          };
        }
      }

      // Apply terrain type tint overlay
      if (terrainGrid) {
        color = applyTerrainTint(color, terrainGrid, mx, my);
      }

      const idx = (y * w + x) * 4;
      pixels[idx] = color.r;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.b;
      pixels[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Store padding offset on the canvas element so the renderer can
  // position the background sprite correctly (shifted by -padX, -padY).
  (bgCanvas as BgCanvas).padX = padX;
  (bgCanvas as BgCanvas).padY = padY;

  return bgCanvas;
}

/** Extended canvas type with padding metadata. */
export interface BgCanvas extends HTMLCanvasElement {
  padX: number;
  padY: number;
}

/** Terrain type color tints applied as a blend over the procedural base. */
const TERRAIN_TINTS: Partial<Record<TerrainType, RGB>> = {
  [TerrainType.Water]: { r: 5, g: 20, b: 50 },
  [TerrainType.Shallows]: { r: 20, g: 50, b: 70 },
  [TerrainType.Mud]: { r: 50, g: 25, b: 5 },
  [TerrainType.Rocks]: { r: 40, g: 40, b: 45 },
  [TerrainType.HighGround]: { r: 25, g: 30, b: 15 },
};

/** Blend a terrain tint into the base color. Grass (default) is untouched. */
function applyTerrainTint(base: RGB, terrainGrid: TerrainGrid, x: number, y: number): RGB {
  const type = terrainGrid.getAt(x, y);
  if (type === TerrainType.Grass) return base;

  const tint = TERRAIN_TINTS[type];
  if (!tint) return base;

  const strength =
    type === TerrainType.Water || type === TerrainType.Rocks
      ? 0.6
      : type === TerrainType.Shallows
        ? 0.4
        : 0.35;

  return {
    r: Math.max(0, Math.min(255, Math.round(base.r * (1 - strength) + tint.r * strength))),
    g: Math.max(0, Math.min(255, Math.round(base.g * (1 - strength) + tint.g * strength))),
    b: Math.max(0, Math.min(255, Math.round(base.b * (1 - strength) + tint.b * strength))),
  };
}

/**
 * Generate the 256x256 seamless fog noise texture and create a repeating
 * CanvasPattern from it.
 */
export function buildFogTexture(patternCtx: CanvasRenderingContext2D): {
  fogBgCanvas: HTMLCanvasElement;
  fogPattern: CanvasPattern;
} {
  const size = FOG_TEXTURE_SIZE;
  const fogBgCanvas = document.createElement('canvas');
  fogBgCanvas.width = size;
  fogBgCanvas.height = size;
  const ctx = require2DContext(fogBgCanvas);

  // Base fill
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // 150 radial gradient blobs with seamless tiling
  const offsets: [number, number][] = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [0, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 15 + Math.random() * 30;

    for (const [ox, oy] of offsets) {
      const cx = x + ox * size;
      const cy = y + oy * size;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(51, 65, 85, 0.5)');
      g.addColorStop(1, 'rgba(51, 65, 85, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const fogPattern = patternCtx.createPattern(fogBgCanvas, 'repeat');
  if (!fogPattern) {
    throw new Error('Unable to create fog pattern');
  }
  return { fogBgCanvas, fogPattern };
}

/**
 * Build the explored-area tracking canvas.
 * Initially black; player units paint white circles onto it to reveal explored terrain.
 *
 * @param worldW - World width in pixels (defaults to 2560).
 * @param worldH - World height in pixels (defaults to 2560).
 */
export function buildExploredCanvas(
  worldW?: number,
  worldH?: number,
): {
  exploredCanvas: HTMLCanvasElement;
  exploredCtx: CanvasRenderingContext2D;
} {
  const w = worldW ?? 2560;
  const h = worldH ?? 2560;
  const exploredCanvas = document.createElement('canvas');
  exploredCanvas.width = Math.ceil(w / 16);
  exploredCanvas.height = Math.ceil(h / 16);
  const exploredCtx = require2DContext(exploredCanvas, { willReadFrequently: true });
  exploredCtx.fillStyle = '#000';
  exploredCtx.fillRect(0, 0, exploredCanvas.width, exploredCanvas.height);
  return { exploredCanvas, exploredCtx };
}
