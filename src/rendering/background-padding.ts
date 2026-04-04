/**
 * Background Padding — Fog Texture & Explored Canvas
 *
 * Separated from background.ts to keep each file under 300 LOC.
 *
 * - buildFogTexture(): generates the 256x256 seamless fog noise texture.
 * - buildExploredCanvas(): creates the explored-area tracking canvas.
 * - require2DContext(): shared helper to get a 2D canvas context.
 */

import { FOG_TEXTURE_SIZE } from '@/constants';

/** Get a 2D rendering context from a canvas, throwing if unavailable. */
export function require2DContext(
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
