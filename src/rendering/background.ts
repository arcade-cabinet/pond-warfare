/**
 * Background & Fog Texture Generator
 *
 * Faithful port of buildMap() (lines 520-535) and buildFogTexture() (lines 537-548)
 * of the original pond_craft.html.
 *
 * - buildBackground(): generates the 2560x2560 procedural water/terrain background.
 * - buildFogTexture(): generates the 256x256 seamless fog noise texture and
 *   creates a repeating CanvasPattern from it.
 */

import { FOG_TEXTURE_SIZE, PALETTE, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';

/**
 * Generate the full-world procedural water background canvas.
 *
 * Fills with deep water, scatters 50 000 small speckles (waterMid / dark variant),
 * then paints 100 organic terrain patches using random polar-coordinate fills.
 */
export function buildBackground(): HTMLCanvasElement {
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = WORLD_WIDTH;
  bgCanvas.height = WORLD_HEIGHT;
  const ctx = bgCanvas.getContext('2d', { alpha: false })!;

  // Base deep water fill
  ctx.fillStyle = PALETTE.waterDeep;
  ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // 50 000 small speckles
  for (let i = 0; i < 50000; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? PALETTE.waterMid : '#0a1d22';
    ctx.fillRect(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT, 4, 4);
  }

  // 100 organic terrain patches
  for (let patch = 0; patch < 100; patch++) {
    const px = Math.random() * WORLD_WIDTH;
    const py = Math.random() * WORLD_HEIGHT;
    const r = 50 + Math.random() * 200;
    for (let i = 0; i < r * 15; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * r;
      ctx.fillStyle = Math.random() > 0.4 ? PALETTE.waterShallow : PALETTE.mudDark;
      ctx.fillRect(px + Math.cos(ang) * dist, py + Math.sin(ang) * dist, 6, 6);
    }
  }

  return bgCanvas;
}

/**
 * Generate the 256x256 seamless fog noise texture and create a repeating
 * CanvasPattern from it.
 *
 * The texture is a dark blue base (#0f172a) with 150 radial gradient blobs.
 * Each blob is drawn at all 9 tile-wrap offsets to ensure seamless tiling.
 *
 * @param patternCtx - The CanvasRenderingContext2D to create the pattern on
 *                     (typically the fog canvas context).
 */
export function buildFogTexture(patternCtx: CanvasRenderingContext2D): {
  fogBgCanvas: HTMLCanvasElement;
  fogPattern: CanvasPattern;
} {
  const size = FOG_TEXTURE_SIZE;
  const fogBgCanvas = document.createElement('canvas');
  fogBgCanvas.width = size;
  fogBgCanvas.height = size;
  const ctx = fogBgCanvas.getContext('2d')!;

  // Base fill
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, size, size);

  // 150 radial gradient blobs with seamless tiling
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 15 + Math.random() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(51, 65, 85, 0.5)');
    g.addColorStop(1, 'rgba(51, 65, 85, 0)');
    ctx.fillStyle = g;

    // Draw at all 9 tile-wrap offsets for seamless tiling
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
    for (const [ox, oy] of offsets) {
      ctx.beginPath();
      ctx.arc(x + ox * size, y + oy * size, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const fogPattern = patternCtx.createPattern(fogBgCanvas, 'repeat')!;
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
  const exploredCtx = exploredCanvas.getContext('2d')!;
  exploredCtx.fillStyle = '#000';
  exploredCtx.fillRect(0, 0, exploredCanvas.width, exploredCanvas.height);
  return { exploredCanvas, exploredCtx };
}
