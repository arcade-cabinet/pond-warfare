/**
 * Background Biome Tinting
 *
 * Per-biome color palette overrides for terrain types, and ThornWall
 * procedural rendering. Used by buildBackground() to give each panel
 * a distinct visual character.
 */

import type { PanelGrid, PanelId } from '@/game/panel-grid';
import type { TerrainGrid } from '@/terrain/terrain-grid';
import { TerrainType } from '@/terrain/terrain-grid';
import type { RGB } from './background-noise';
import { fbm, valueNoise } from './background-noise';

/** Terrain tint table: base color + blend strength per terrain type. */
interface BiomeTintTable {
  [TerrainType.Grass]: { color: RGB; strength: number };
  [TerrainType.Water]: { color: RGB; strength: number };
  [TerrainType.Shallows]: { color: RGB; strength: number };
  [TerrainType.Mud]: { color: RGB; strength: number };
  [TerrainType.Rocks]: { color: RGB; strength: number };
  [TerrainType.HighGround]: { color: RGB; strength: number };
}

/** Default tints (used when no biome-specific override exists). */
const DEFAULT_TINTS: BiomeTintTable = {
  [TerrainType.Grass]: { color: { r: 50, g: 70, b: 30 }, strength: 0.15 },
  [TerrainType.Water]: { color: { r: 5, g: 20, b: 50 }, strength: 0.6 },
  [TerrainType.Shallows]: { color: { r: 20, g: 50, b: 70 }, strength: 0.4 },
  [TerrainType.Mud]: { color: { r: 50, g: 25, b: 5 }, strength: 0.35 },
  [TerrainType.Rocks]: { color: { r: 40, g: 40, b: 45 }, strength: 0.6 },
  [TerrainType.HighGround]: { color: { r: 25, g: 30, b: 15 }, strength: 0.35 },
};

/** Biome-specific tint overrides keyed by biome string from panels.json. */
const BIOME_TINTS: Record<string, BiomeTintTable> = {
  grassland_clearing: {
    [TerrainType.Grass]: { color: { r: 60, g: 95, b: 35 }, strength: 0.2 },
    [TerrainType.Water]: { color: { r: 15, g: 40, b: 80 }, strength: 0.55 },
    [TerrainType.Shallows]: { color: { r: 30, g: 70, b: 100 }, strength: 0.35 },
    [TerrainType.Mud]: { color: { r: 55, g: 35, b: 10 }, strength: 0.3 },
    [TerrainType.Rocks]: { color: { r: 50, g: 50, b: 45 }, strength: 0.5 },
    [TerrainType.HighGround]: { color: { r: 40, g: 50, b: 20 }, strength: 0.3 },
  },
  muddy_forest: {
    [TerrainType.Grass]: { color: { r: 35, g: 55, b: 25 }, strength: 0.25 },
    [TerrainType.Water]: { color: { r: 10, g: 25, b: 40 }, strength: 0.6 },
    [TerrainType.Shallows]: { color: { r: 25, g: 40, b: 50 }, strength: 0.4 },
    [TerrainType.Mud]: { color: { r: 60, g: 30, b: 5 }, strength: 0.5 },
    [TerrainType.Rocks]: { color: { r: 35, g: 35, b: 30 }, strength: 0.55 },
    [TerrainType.HighGround]: { color: { r: 30, g: 40, b: 12 }, strength: 0.35 },
  },
  rocky_marsh: {
    [TerrainType.Grass]: { color: { r: 50, g: 60, b: 40 }, strength: 0.2 },
    [TerrainType.Water]: { color: { r: 10, g: 25, b: 45 }, strength: 0.6 },
    [TerrainType.Shallows]: { color: { r: 25, g: 50, b: 65 }, strength: 0.4 },
    [TerrainType.Mud]: { color: { r: 50, g: 40, b: 20 }, strength: 0.35 },
    [TerrainType.Rocks]: { color: { r: 55, g: 55, b: 55 }, strength: 0.65 },
    [TerrainType.HighGround]: { color: { r: 45, g: 45, b: 35 }, strength: 0.4 },
  },
  flooded_swamp: {
    [TerrainType.Grass]: { color: { r: 30, g: 55, b: 35 }, strength: 0.25 },
    [TerrainType.Water]: { color: { r: 8, g: 30, b: 60 }, strength: 0.65 },
    [TerrainType.Shallows]: { color: { r: 20, g: 55, b: 80 }, strength: 0.5 },
    [TerrainType.Mud]: { color: { r: 40, g: 25, b: 10 }, strength: 0.35 },
    [TerrainType.Rocks]: { color: { r: 35, g: 40, b: 45 }, strength: 0.55 },
    [TerrainType.HighGround]: { color: { r: 25, g: 35, b: 20 }, strength: 0.3 },
  },
  stone_quarry: {
    [TerrainType.Grass]: { color: { r: 55, g: 60, b: 50 }, strength: 0.2 },
    [TerrainType.Water]: { color: { r: 10, g: 20, b: 35 }, strength: 0.55 },
    [TerrainType.Shallows]: { color: { r: 30, g: 45, b: 55 }, strength: 0.4 },
    [TerrainType.Mud]: { color: { r: 50, g: 40, b: 25 }, strength: 0.35 },
    [TerrainType.Rocks]: { color: { r: 65, g: 65, b: 65 }, strength: 0.7 },
    [TerrainType.HighGround]: { color: { r: 55, g: 55, b: 45 }, strength: 0.45 },
  },
  dense_thicket: {
    [TerrainType.Grass]: { color: { r: 25, g: 50, b: 20 }, strength: 0.3 },
    [TerrainType.Water]: { color: { r: 5, g: 18, b: 35 }, strength: 0.6 },
    [TerrainType.Shallows]: { color: { r: 15, g: 35, b: 50 }, strength: 0.45 },
    [TerrainType.Mud]: { color: { r: 45, g: 25, b: 5 }, strength: 0.4 },
    [TerrainType.Rocks]: { color: { r: 30, g: 35, b: 30 }, strength: 0.55 },
    [TerrainType.HighGround]: { color: { r: 20, g: 35, b: 12 }, strength: 0.4 },
  },
};

/** Look up the biome string for a world-space pixel using the PanelGrid. */
function getBiomeAt(panelGrid: PanelGrid, x: number, y: number): string | null {
  const panelId = panelGrid.worldToPanel(x, y);
  if (panelId == null) return null;
  return panelGrid.getPanelDef(panelId).biome;
}

/**
 * Apply biome-aware terrain tinting to a base color.
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
    return thornWallColor(x, y);
  }

  // Grass with no biome override = untouched (matches old behavior)
  let tintTable = DEFAULT_TINTS;
  if (panelGrid) {
    const biome = getBiomeAt(panelGrid, x, y);
    if (biome && BIOME_TINTS[biome]) {
      tintTable = BIOME_TINTS[biome];
    }
  }

  if (type === TerrainType.Grass && !panelGrid) return base;

  const entry = tintTable[type as keyof BiomeTintTable];
  if (!entry) return base;

  const { color: tint, strength } = entry;
  return {
    r: Math.max(0, Math.min(255, Math.round(base.r * (1 - strength) + tint.r * strength))),
    g: Math.max(0, Math.min(255, Math.round(base.g * (1 - strength) + tint.g * strength))),
    b: Math.max(0, Math.min(255, Math.round(base.b * (1 - strength) + tint.b * strength))),
  };
}

// --- Thorn Wall procedural color ---

const THORN_BASE: RGB = { r: 26, g: 42, b: 21 };
const THORN_VINE: RGB = { r: 15, g: 28, b: 10 };
const THORN_DARK: RGB = { r: 10, g: 18, b: 8 };
const THORN_SEED = 777;
const VINE_SEED = 999;

/**
 * Procedural ThornWall pixel color.
 * Uses layered noise: base dark green with thick vine silhouettes
 * and a darker criss-cross pattern. Clearly distinct from fog (black)
 * — thorns are green-brown and opaque.
 */
function thornWallColor(x: number, y: number): RGB {
  const scale = 0.04;

  // Base noise layer — broad murky variation
  const baseN = fbm(x * scale, y * scale, 4, THORN_SEED);

  // Vine pattern — higher frequency, creates vine-like streaks
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
