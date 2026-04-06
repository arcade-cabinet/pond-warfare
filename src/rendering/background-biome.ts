/**
 * Background Biome Tinting
 *
 * Per-biome color palette overrides for terrain types. Used by
 * buildBackground() to give each panel a distinct visual character.
 *
 * Tile-edge blending: near tile boundaries, samples all four neighboring
 * tile centers and bilinearly blends so terrain transitions are smooth
 * instead of showing a hard grid edge every 32 pixels.
 *
 * ThornWall rendering lives in background-thornwall.ts.
 */

import type { PanelGrid, PanelId } from '@/game/panel-grid';
import type { TerrainGrid } from '@/terrain/terrain-grid';
import { TerrainType } from '@/terrain/terrain-grid';
import type { RGB } from './background-noise';
import type { BiomeTintTableLike } from './background-thornwall';
import { thornWallWithFade } from './background-thornwall';

/** Terrain tint table: base color + blend strength per terrain type. */
interface BiomeTintTable {
  [TerrainType.Grass]: { color: RGB; strength: number };
  [TerrainType.Water]: { color: RGB; strength: number };
  [TerrainType.Shallows]: { color: RGB; strength: number };
  [TerrainType.Mud]: { color: RGB; strength: number };
  [TerrainType.Rocks]: { color: RGB; strength: number };
  [TerrainType.HighGround]: { color: RGB; strength: number };
}

/** Default tints (used when no biome-specific override exists).
 *  Brightened 30-40% from original dark palette for an inviting look. */
const DEFAULT_TINTS: BiomeTintTable = {
  [TerrainType.Grass]: { color: { r: 74, g: 124, b: 63 }, strength: 0.15 },
  [TerrainType.Water]: { color: { r: 33, g: 150, b: 243 }, strength: 0.5 },
  [TerrainType.Shallows]: { color: { r: 50, g: 140, b: 180 }, strength: 0.35 },
  [TerrainType.Mud]: { color: { r: 139, g: 115, b: 85 }, strength: 0.3 },
  [TerrainType.Rocks]: { color: { r: 122, g: 122, b: 122 }, strength: 0.5 },
  [TerrainType.HighGround]: { color: { r: 80, g: 100, b: 55 }, strength: 0.3 },
};

/** Biome-specific tint overrides keyed by biome string from panels.json. */
const BIOME_TINTS: Record<string, BiomeTintTable> = {
  grassland_clearing: {
    [TerrainType.Grass]: { color: { r: 90, g: 145, b: 60 }, strength: 0.2 },
    [TerrainType.Water]: { color: { r: 40, g: 130, b: 200 }, strength: 0.45 },
    [TerrainType.Shallows]: { color: { r: 60, g: 150, b: 190 }, strength: 0.3 },
    [TerrainType.Mud]: { color: { r: 145, g: 120, b: 80 }, strength: 0.25 },
    [TerrainType.Rocks]: { color: { r: 120, g: 120, b: 115 }, strength: 0.4 },
    [TerrainType.HighGround]: { color: { r: 85, g: 110, b: 55 }, strength: 0.25 },
  },
  muddy_forest: {
    [TerrainType.Grass]: { color: { r: 65, g: 100, b: 50 }, strength: 0.2 },
    [TerrainType.Water]: { color: { r: 30, g: 90, b: 140 }, strength: 0.5 },
    [TerrainType.Shallows]: { color: { r: 50, g: 110, b: 140 }, strength: 0.35 },
    [TerrainType.Mud]: { color: { r: 130, g: 95, b: 50 }, strength: 0.4 },
    [TerrainType.Rocks]: { color: { r: 100, g: 100, b: 90 }, strength: 0.45 },
    [TerrainType.HighGround]: { color: { r: 70, g: 95, b: 40 }, strength: 0.3 },
  },
  rocky_marsh: {
    [TerrainType.Grass]: { color: { r: 80, g: 105, b: 70 }, strength: 0.18 },
    [TerrainType.Water]: { color: { r: 30, g: 95, b: 150 }, strength: 0.5 },
    [TerrainType.Shallows]: { color: { r: 55, g: 125, b: 160 }, strength: 0.35 },
    [TerrainType.Mud]: { color: { r: 120, g: 105, b: 75 }, strength: 0.3 },
    [TerrainType.Rocks]: { color: { r: 130, g: 130, b: 130 }, strength: 0.55 },
    [TerrainType.HighGround]: { color: { r: 95, g: 100, b: 80 }, strength: 0.35 },
  },
  flooded_swamp: {
    [TerrainType.Grass]: { color: { r: 60, g: 100, b: 65 }, strength: 0.22 },
    [TerrainType.Water]: { color: { r: 25, g: 100, b: 160 }, strength: 0.55 },
    [TerrainType.Shallows]: { color: { r: 45, g: 130, b: 170 }, strength: 0.42 },
    [TerrainType.Mud]: { color: { r: 110, g: 90, b: 60 }, strength: 0.3 },
    [TerrainType.Rocks]: { color: { r: 100, g: 105, b: 110 }, strength: 0.45 },
    [TerrainType.HighGround]: { color: { r: 65, g: 90, b: 55 }, strength: 0.25 },
  },
  stone_quarry: {
    [TerrainType.Grass]: { color: { r: 90, g: 105, b: 80 }, strength: 0.18 },
    [TerrainType.Water]: { color: { r: 30, g: 80, b: 130 }, strength: 0.45 },
    [TerrainType.Shallows]: { color: { r: 60, g: 115, b: 145 }, strength: 0.35 },
    [TerrainType.Mud]: { color: { r: 120, g: 105, b: 80 }, strength: 0.3 },
    [TerrainType.Rocks]: { color: { r: 140, g: 140, b: 140 }, strength: 0.6 },
    [TerrainType.HighGround]: { color: { r: 110, g: 110, b: 95 }, strength: 0.4 },
  },
  dense_thicket: {
    [TerrainType.Grass]: { color: { r: 55, g: 95, b: 45 }, strength: 0.25 },
    [TerrainType.Water]: { color: { r: 20, g: 75, b: 120 }, strength: 0.5 },
    [TerrainType.Shallows]: { color: { r: 40, g: 100, b: 135 }, strength: 0.38 },
    [TerrainType.Mud]: { color: { r: 115, g: 90, b: 50 }, strength: 0.35 },
    [TerrainType.Rocks]: { color: { r: 95, g: 100, b: 90 }, strength: 0.45 },
    [TerrainType.HighGround]: { color: { r: 60, g: 85, b: 40 }, strength: 0.35 },
  },
};

/** Look up the biome string for a world-space pixel using the PanelGrid. */
function getBiomeAt(panelGrid: PanelGrid, x: number, y: number): string | null {
  const panelId = panelGrid.worldToPanel(x, y);
  if (panelId == null) return null;
  return panelGrid.getPanelDef(panelId).biome;
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

/** Linearly interpolate two colors. */
function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/** Get tint table for a position, considering biome overrides. */
function getTintTable(
  panelGrid: PanelGrid | null | undefined,
  x: number,
  y: number,
): BiomeTintTable {
  if (panelGrid) {
    const biome = getBiomeAt(panelGrid, x, y);
    if (biome && BIOME_TINTS[biome]) return BIOME_TINTS[biome];
  }
  return DEFAULT_TINTS;
}

/** Exported for testing. */
export { applyTintEntry, lerpRGB };

/**
 * Apply biome-aware terrain tinting to a base color.
 *
 * Near tile boundaries, bilinearly blends the tinted colors from
 * neighboring tiles so terrain transitions are smooth instead of
 * showing a hard grid edge every 32 pixels.
 *
 * ThornWall pixels near a non-ThornWall neighbor use a gradient
 * fade so locked panel edges blend softly instead of a hard line.
 *
 * If no PanelGrid is provided, falls back to the default tint table.
 */
export function applyBiomeTint(
  base: RGB,
  terrainGrid: TerrainGrid,
  x: number,
  y: number,
  panelGrid?: PanelGrid | null,
): RGB {
  const type = terrainGrid.getAt(x, y);

  if (type === TerrainType.ThornWall) {
    return thornWallWithFade(
      base,
      terrainGrid,
      x,
      y,
      (nx, ny) => getTintTable(panelGrid, nx, ny) as unknown as BiomeTintTableLike,
    );
  }

  // Fast path: single tint lookup + cheap noise variation to break grid pattern.
  // No neighbor sampling — O(1) per pixel instead of O(4).
  const tintTable = getTintTable(panelGrid, x, y);
  if (type === TerrainType.Grass && !panelGrid) return base;
  const entry = tintTable[type as keyof BiomeTintTable];
  if (!entry) return base;
  const tinted = applyTintEntry(base, entry);

  // Add subtle per-pixel noise to break tile grid pattern (cheap hash, no sin/cos)
  const hash = ((x * 2654435761) ^ (y * 2246822519)) >>> 0;
  const noise = ((hash & 0xff) / 255 - 0.5) * 12; // ±6 per channel
  return {
    r: Math.max(0, Math.min(255, tinted.r + noise)),
    g: Math.max(0, Math.min(255, tinted.g + noise)),
    b: Math.max(0, Math.min(255, tinted.b + noise)),
  };
}

/** Pre-computed biome lookup for a PanelGrid (avoids per-pixel panel lookups). */
export interface BiomeLookup {
  panelGrid: PanelGrid;
  panelIds: (PanelId | null)[];
  panelWidth: number;
  panelHeight: number;
}

/** Build a fast biome lookup from a PanelGrid. */
export function buildBiomeLookup(panelGrid: PanelGrid): BiomeLookup {
  return {
    panelGrid,
    panelIds: [null, 1, 2, 3, 4, 5, 6] as (PanelId | null)[],
    panelWidth: panelGrid.panelWidth,
    panelHeight: panelGrid.panelHeight,
  };
}
