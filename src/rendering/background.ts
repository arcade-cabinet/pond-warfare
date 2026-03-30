/**
 * Background & Fog Texture Generator
 *
 * - buildBackground(): generates the 2560x2560 procedural terrain with biome
 *   blending using multi-octave value noise (fbm), splat blending between
 *   biome colors, detail noise, and shore foam effects.
 * - buildFogTexture(): generates the 256x256 seamless fog noise texture.
 */

import { FOG_TEXTURE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';

// --- Biome palette ---
const BIOME_COLORS = {
  deepWater: { r: 10, g: 29, b: 34 }, // #0a1d22
  shallowWater: { r: 17, g: 82, b: 92 }, // #11525c
  shoreMud: { r: 69, g: 26, b: 3 }, // #451a03
  lightMud: { r: 113, g: 63, b: 18 }, // #713f12
  reedGreen: { r: 45, g: 106, b: 79 }, // #2d6a4f
  denseMud: { r: 61, g: 32, b: 0 }, // #3d2000
} as const;

type RGB = { r: number; g: number; b: number };

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

/** Simple hash-based value noise. */
function valueNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 113.5) * 43758.5453;
  return n - Math.floor(n);
}

/** Smoothed value noise using bilinear interpolation. */
function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Smooth interpolation (smoothstep)
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = valueNoise(ix, iy, seed);
  const n10 = valueNoise(ix + 1, iy, seed);
  const n01 = valueNoise(ix, iy + 1, seed);
  const n11 = valueNoise(ix + 1, iy + 1, seed);

  const nx0 = n00 + sx * (n10 - n00);
  const nx1 = n01 + sx * (n11 - n01);
  return nx0 + sy * (nx1 - nx0);
}

/** Fractal Brownian Motion - multiple octaves of noise layered together. */
function fbm(x: number, y: number, octaves: number, seed: number): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, y * frequency, seed + i * 37) * amplitude;
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / maxValue;
}

/** Linear interpolation between two colors. */
function lerpColor(a: RGB, b: RGB, t: number): RGB {
  const ct = Math.max(0, Math.min(1, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * ct),
    g: Math.round(a.g + (b.g - a.g) * ct),
    b: Math.round(a.b + (b.b - a.b) * ct),
  };
}

/**
 * Get the blended biome color for a given noise value.
 * Uses smooth lerp between adjacent biome thresholds.
 */
function biomeColor(noiseVal: number): RGB {
  const { deepWater, shallowWater, shoreMud, lightMud, reedGreen, denseMud } = BIOME_COLORS;

  if (noiseVal < 0.3) {
    // Deep water -> Shallow water
    const t = noiseVal / 0.3;
    return lerpColor(deepWater, shallowWater, t);
  }
  if (noiseVal < 0.45) {
    // Shallow water -> Shore mud
    const t = (noiseVal - 0.3) / 0.15;
    return lerpColor(shallowWater, shoreMud, t);
  }
  if (noiseVal < 0.55) {
    // Shore mud -> Reed green
    const t = (noiseVal - 0.45) / 0.1;
    return lerpColor(shoreMud, reedGreen, t);
  }
  if (noiseVal < 0.7) {
    // Reed green -> Light mud
    const t = (noiseVal - 0.55) / 0.15;
    return lerpColor(reedGreen, lightMud, t);
  }
  // Light mud -> Dense mud
  const t = (noiseVal - 0.7) / 0.3;
  return lerpColor(lightMud, denseMud, t);
}

/**
 * Generate the full-world procedural terrain background canvas.
 *
 * Uses multi-octave value noise to create a biome map with smooth
 * blending between biome colors, detail noise for texture variation,
 * and shore foam effects along water-land boundaries.
 */
export function buildBackground(): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = WORLD_WIDTH;
  bgCanvas.height = WORLD_HEIGHT;
  const ctx = require2DContext(bgCanvas, { alpha: false });

  const imageData = ctx.createImageData(WORLD_WIDTH, WORLD_HEIGHT);
  const pixels = imageData.data;

  const seed = 42;
  const detailSeed = 137;

  // Tile scale: map 2560px across ~80 tiles of noise space
  const noiseScale = 80 / WORLD_WIDTH;

  // Pre-compute the biome noise grid at a lower resolution and upsample
  // for performance. Use 4px blocks.
  const blockSize = 4;
  const gridW = Math.ceil(WORLD_WIDTH / blockSize);
  const gridH = Math.ceil(WORLD_HEIGHT / blockSize);

  // Biome noise grid
  const biomeGrid = new Float32Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const wx = gx * blockSize * noiseScale;
      const wy = gy * blockSize * noiseScale;
      biomeGrid[gy * gridW + gx] = fbm(wx, wy, 5, seed);
    }
  }

  // Render pixels
  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let x = 0; x < WORLD_WIDTH; x++) {
      const gx = Math.min(Math.floor(x / blockSize), gridW - 1);
      const gy = Math.min(Math.floor(y / blockSize), gridH - 1);

      // Bilinear interpolation of the biome grid for smoother results
      const gxf = x / blockSize;
      const gyf = y / blockSize;
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
      const detailNx = x * noiseScale * 4;
      const detailNy = y * noiseScale * 4;
      const detail = valueNoise(detailNx, detailNy, detailSeed);
      const detailOffset = (detail - 0.5) * 16; // +/- 8 brightness variation

      color = {
        r: Math.max(0, Math.min(255, color.r + detailOffset)),
        g: Math.max(0, Math.min(255, color.g + detailOffset)),
        b: Math.max(0, Math.min(255, color.b + detailOffset)),
      };

      // Shore foam effect: detect water-land boundary
      // Check if we're near the 0.45 threshold (water/land boundary)
      if (biomeVal > 0.4 && biomeVal < 0.5) {
        // Check neighbors for water
        const leftBiome = gx > 0 ? biomeGrid[gy * gridW + (gx - 1)] : biomeVal;
        const rightBiome = gx < gridW - 1 ? biomeGrid[gy * gridW + (gx + 1)] : biomeVal;
        const upBiome = gy > 0 ? biomeGrid[(gy - 1) * gridW + gx] : biomeVal;
        const downBiome = gy < gridH - 1 ? biomeGrid[(gy + 1) * gridW + gx] : biomeVal;

        const hasWaterNeighbor =
          leftBiome < 0.35 || rightBiome < 0.35 || upBiome < 0.35 || downBiome < 0.35;

        if (hasWaterNeighbor) {
          // Add foam (lighter color)
          const foamStrength = 0.3 + detail * 0.3;
          color = {
            r: Math.min(255, color.r + Math.round(60 * foamStrength)),
            g: Math.min(255, color.g + Math.round(70 * foamStrength)),
            b: Math.min(255, color.b + Math.round(80 * foamStrength)),
          };
        }
      }

      const idx = (y * WORLD_WIDTH + x) * 4;
      pixels[idx] = color.r;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.b;
      pixels[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return bgCanvas;
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
 */
export function buildExploredCanvas(): {
  exploredCanvas: HTMLCanvasElement;
  exploredCtx: CanvasRenderingContext2D;
} {
  const exploredCanvas = document.createElement('canvas');
  exploredCanvas.width = Math.ceil(WORLD_WIDTH / 16);
  exploredCanvas.height = Math.ceil(WORLD_HEIGHT / 16);
  const exploredCtx = require2DContext(exploredCanvas, { willReadFrequently: true });
  exploredCtx.fillStyle = '#000';
  exploredCtx.fillRect(0, 0, exploredCanvas.width, exploredCanvas.height);
  return { exploredCanvas, exploredCtx };
}
