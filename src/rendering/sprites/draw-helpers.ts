/**
 * Shared low-level drawing helpers for procedural sprite generation.
 */

export function require2DContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context is unavailable');
  }
  return ctx;
}

/** Derived colors for sprite detail enhancements */
export const OTTER_OUTLINE = '#4a2000';
export const OTTER_NOSE_HIGHLIGHT = '#a0703a';
export const GATOR_SCALE_HIGHLIGHT = '#34d399';
export const DOORWAY_GLOW = '#d97706';
export const FLAME_ORANGE = '#f97316';
export const FLAME_YELLOW = '#facc15';

export interface DrawCtx {
  p: (x: number, y: number, color: string) => void;
  rect: (x: number, y: number, w: number, h: number, color: string) => void;
  circle: (cx: number, cy: number, r: number, color: string) => void;
  ctx: CanvasRenderingContext2D;
}

/** Create pixel-art drawing helpers for a canvas context. */
export function makeDrawCtx(ctx: CanvasRenderingContext2D): DrawCtx {
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

  return { p, rect, circle, ctx };
}
