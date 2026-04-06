/**
 * ThornWall Procedural Rendering
 *
 * Generates procedural thorn/vine pixel colors for locked panel
 * boundaries, and handles gradient fading at the boundary between
 * ThornWall and playable terrain to avoid harsh rectangular edges.
 *
 * Extracted from background-biome.ts for the 300 LOC limit.
 */

import type { TerrainGrid } from '@/terrain/terrain-grid';
import { TerrainType } from '@/terrain/terrain-grid';
import type { RGB } from './background-noise';
import { fbm, valueNoise } from './background-noise';

// --- Thorn Wall procedural color ---

const THORN_BASE: RGB = { r: 26, g: 42, b: 21 };
const THORN_VINE: RGB = { r: 15, g: 28, b: 10 };
const THORN_DARK: RGB = { r: 10, g: 18, b: 8 };
const THORN_SEED = 777;
const VINE_SEED = 999;

/**
 * Number of world-pixels over which ThornWall fades into adjacent
 * playable terrain. This prevents the harsh rectangular edge at
 * locked panel boundaries.
 */
const THORN_FADE_PIXELS = 80; // ~2.5 tiles of gradient

/**
 * Procedural ThornWall pixel color.
 * Uses layered noise: base dark green with thick vine silhouettes
 * and a darker criss-cross pattern. Clearly distinct from fog (black)
 * -- thorns are green-brown and opaque.
 */
export function thornWallColor(x: number, y: number): RGB {
  const scale = 0.04;

  // Base noise layer -- broad murky variation
  const baseN = fbm(x * scale, y * scale, 4, THORN_SEED);

  // Vine pattern -- higher frequency, creates vine-like streaks
  const vineN = fbm(x * scale * 3, y * scale * 1.5, 3, VINE_SEED);
  const isVine = vineN > 0.52;

  // Detail noise for texture
  const detail = valueNoise(x * scale * 8, y * scale * 8, THORN_SEED + 50);
  const detailOffset = (detail - 0.5) * 10;

  let color: RGB;
  if (isVine) {
    // Vine silhouette: darker with occasional even-darker thorn points
    const thornPoint = vineN > 0.65;
    color = thornPoint ? THORN_DARK : THORN_VINE;
  } else {
    // Base thorn wall background
    const brightness = baseN * 0.3;
    color = {
      r: Math.round(THORN_BASE.r + brightness * 15),
      g: Math.round(THORN_BASE.g + brightness * 20),
      b: Math.round(THORN_BASE.b + brightness * 10),
    };
  }

  return {
    r: Math.max(0, Math.min(255, color.r + detailOffset)),
    g: Math.max(0, Math.min(255, color.g + detailOffset)),
    b: Math.max(0, Math.min(255, color.b + detailOffset)),
  };
}

/** Linearly interpolate two colors. */
function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/** Apply a single terrain tint entry to a base color. */
function applyTintEntry(base: RGB, entry: { color: RGB; strength: number }): RGB {
  const { color: tint, strength } = entry;
  return {
    r: Math.max(0, Math.min(255, Math.round(base.r * (1 - strength) + tint.r * strength))),
    g: Math.max(0, Math.min(255, Math.round(base.g * (1 - strength) + tint.g * strength))),
    b: Math.max(0, Math.min(255, Math.round(base.b * (1 - strength) + tint.b * strength))),
  };
}

/** Tint table entry shape (duplicated here to avoid circular imports). */
export interface TintEntry {
  color: RGB;
  strength: number;
}

/** Tint table keyed by terrain type. */
export type BiomeTintTableLike = Record<number, TintEntry>;

/**
 * ThornWall color with gradient fade near non-ThornWall neighbors.
 *
 * Searches the four cardinal directions for the nearest non-ThornWall
 * tile within THORN_FADE_PIXELS. If found, linearly blends from the
 * thorn color toward the neighboring terrain tint, creating a soft
 * transition instead of a hard rectangular edge.
 */
export function thornWallWithFade(
  base: RGB,
  terrainGrid: TerrainGrid,
  x: number,
  y: number,
  getTintTable: (x: number, y: number) => BiomeTintTableLike,
): RGB {
  const thorn = thornWallColor(x, y);

  // Quick check: find minimum distance to a non-ThornWall tile
  const tileSize = 32;
  const col = terrainGrid.worldToCol(x);
  const row = terrainGrid.worldToRow(y);
  const scanTiles = Math.ceil(THORN_FADE_PIXELS / tileSize);

  let minDist = THORN_FADE_PIXELS + 1;
  let neighborColor: RGB | null = null;

  // Scan cardinal directions for nearest non-ThornWall tile
  for (let d = 1; d <= scanTiles; d++) {
    const candidates: [number, number][] = [
      [col - d, row],
      [col + d, row],
      [col, row - d],
      [col, row + d],
    ];
    for (const [nc, nr] of candidates) {
      if (nc < 0 || nc >= terrainGrid.cols || nr < 0 || nr >= terrainGrid.rows) continue;
      const t = terrainGrid.get(nc, nr);
      if (t !== TerrainType.ThornWall) {
        const nx = nc * tileSize + tileSize / 2;
        const ny = nr * tileSize + tileSize / 2;
        const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
        if (dist < minDist) {
          minDist = dist;
          // Compute the neighboring terrain tint color
          const tintTable = getTintTable(nx, ny);
          const entry = tintTable[t];
          neighborColor = entry ? applyTintEntry(base, entry) : base;
        }
      }
    }
    // Early exit once we found a neighbor within range
    if (minDist <= THORN_FADE_PIXELS) break;
  }

  // If no nearby non-ThornWall neighbor, return pure thorn color
  if (!neighborColor || minDist > THORN_FADE_PIXELS) return thorn;

  // Blend: 0 at boundary = full neighbor color, 1 at fade end = full thorn
  const blendT = Math.min(1, minDist / THORN_FADE_PIXELS);
  return lerpRGB(neighborColor, thorn, blendT);
}
