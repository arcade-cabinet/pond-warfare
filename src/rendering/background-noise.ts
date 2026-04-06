/**
 * Background Noise Generation
 *
 * Value noise, fractal Brownian motion, and biome color blending
 * for procedural terrain generation.
 */

// --- Biome palette (brightened for an inviting look) ---
export const BIOME_COLORS = {
  deepWater: { r: 15, g: 42, b: 55 },
  shallowWater: { r: 30, g: 115, b: 130 },
  shoreMud: { r: 100, g: 55, b: 25 },
  lightMud: { r: 145, g: 95, b: 50 },
  reedGreen: { r: 65, g: 135, b: 100 },
  denseMud: { r: 95, g: 60, b: 20 },
} as const;

export type RGB = { r: number; g: number; b: number };

/** Simple hash-based value noise. */
export function valueNoise(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 113.5) * 43758.5453;
  return n - Math.floor(n);
}

/** Smoothed value noise using bilinear interpolation. */
function smoothNoise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

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
export function fbm(x: number, y: number, octaves: number, seed: number): number {
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

/** Get the blended biome color for a given noise value. */
export function biomeColor(noiseVal: number): RGB {
  const { deepWater, shallowWater, shoreMud, lightMud, reedGreen, denseMud } = BIOME_COLORS;

  if (noiseVal < 0.3) {
    return lerpColor(deepWater, shallowWater, noiseVal / 0.3);
  }
  if (noiseVal < 0.45) {
    return lerpColor(shallowWater, shoreMud, (noiseVal - 0.3) / 0.15);
  }
  if (noiseVal < 0.55) {
    return lerpColor(shoreMud, reedGreen, (noiseVal - 0.45) / 0.1);
  }
  if (noiseVal < 0.7) {
    return lerpColor(reedGreen, lightMud, (noiseVal - 0.55) / 0.15);
  }
  return lerpColor(lightMud, denseMud, (noiseVal - 0.7) / 0.3);
}
