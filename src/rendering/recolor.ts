/**
 * Sprite Recoloring System
 *
 * Takes an existing sprite canvas and returns a recolored version by shifting
 * the hue/saturation/brightness of all non-transparent pixels. Uses HSL color
 * space for natural-looking tint effects.
 *
 * Includes a preset system for common visual states (veteran ranks, status
 * effects, champion enemies) and a texture cache to avoid per-frame recomputation.
 */

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export type RecolorPreset =
  | 'veteran'
  | 'elite'
  | 'hero'
  | 'champion'
  | 'enraged'
  | 'poisoned'
  | 'shielded';

interface RecolorParams {
  hueShift: number;
  satMult: number;
  brightMult: number;
}

const PRESETS: Record<RecolorPreset, RecolorParams> = {
  veteran: { hueShift: 0, satMult: 1.1, brightMult: 1.15 }, // Slightly brighter
  elite: { hueShift: 30, satMult: 1.2, brightMult: 1.2 }, // Gold-tinted
  hero: { hueShift: 60, satMult: 1.3, brightMult: 1.3 }, // Bright gold
  champion: { hueShift: -30, satMult: 1.4, brightMult: 0.9 }, // Dark purple tint
  enraged: { hueShift: 0, satMult: 1.5, brightMult: 1.4 }, // Red-hot
  poisoned: { hueShift: 90, satMult: 0.8, brightMult: 0.9 }, // Sickly green
  shielded: { hueShift: 200, satMult: 0.7, brightMult: 1.3 }, // Blue glow
};

// ---------------------------------------------------------------------------
// HSL <-> RGB conversion helpers
// ---------------------------------------------------------------------------

/** Convert RGB [0-255] to HSL [0-1, 0-1, 0-1]. */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;

  if (max === min) {
    return [0, 0, l]; // achromatic
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === rn) {
    h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  } else if (max === gn) {
    h = ((bn - rn) / d + 2) / 6;
  } else {
    h = ((rn - gn) / d + 4) / 6;
  }

  return [h, s, l];
}

/** Helper for hslToRgb: convert hue sector to RGB component. */
function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

/** Convert HSL [0-1, 0-1, 0-1] to RGB [0-255, 0-255, 0-255]. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v]; // achromatic
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

// ---------------------------------------------------------------------------
// Core recoloring function
// ---------------------------------------------------------------------------

/**
 * Recolor a sprite canvas using a named preset. Returns a new canvas with
 * the recolored pixels; the original is not modified.
 */
export function recolorSprite(
  sourceCanvas: HTMLCanvasElement,
  preset: RecolorPreset,
): HTMLCanvasElement {
  const { hueShift, satMult, brightMult } = PRESETS[preset];
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas; // Should never happen for offscreen canvas
  ctx.drawImage(sourceCanvas, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // Skip fully transparent pixels

    // Convert RGB to HSL, apply transforms, convert back
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    const [r, g, b] = hslToRgb(
      (h + hueShift / 360 + 1) % 1,
      Math.min(1, s * satMult),
      Math.min(1, l * brightMult),
    );
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ---------------------------------------------------------------------------
// Texture cache
// ---------------------------------------------------------------------------

/**
 * Cache key format: `${spriteId}:${preset}`
 * Stores pre-computed recolored canvases so we only compute once per
 * unique (spriteId, preset) combination.
 */
const recolorCache = new Map<string, HTMLCanvasElement>();

/** Build a cache key for a (spriteId, preset) pair. */
function cacheKey(spriteId: number, preset: RecolorPreset): string {
  return `${spriteId}:${preset}`;
}

/**
 * Get a recolored sprite canvas, using the cache. If not yet cached, the
 * recolored canvas is computed from the source and stored.
 */
export function getRecoloredSprite(
  spriteId: number,
  preset: RecolorPreset,
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const key = cacheKey(spriteId, preset);
  let cached = recolorCache.get(key);
  if (!cached) {
    cached = recolorSprite(sourceCanvas, preset);
    recolorCache.set(key, cached);
  }
  return cached;
}

/** Clear the recolor cache (call on game restart). */
export function clearRecolorCache(): void {
  recolorCache.clear();
}

/**
 * Map veterancy rank to the appropriate recolor preset.
 * Returns undefined for rank 0 (recruit - no recolor).
 */
export function veterancyPreset(rank: number): RecolorPreset | undefined {
  switch (rank) {
    case 1:
      return 'veteran';
    case 2:
      return 'elite';
    case 3:
      return 'hero';
    default:
      return undefined;
  }
}
