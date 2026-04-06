/**
 * Panel-Aware Map Generator (v3.0 -- 6-Panel Map System)
 *
 * Generates terrain for each panel based on biome rules from terrain.json.
 * Unlocked panels get biome-appropriate terrain; locked panels are filled
 * with ThornWall (impassable barrier).
 *
 * Panel layout (3x2):
 *   1 2 3   (top row -- enemies, late game)
 *   4 5 6   (bottom row -- player territory)
 */

import { getTerrainConfig } from '@/config/config-loader';
import type { BiomeTerrainRule } from '@/config/v3-types';
import type { GameWorld } from '@/ecs/world';
import type { PanelGrid, PanelId } from '@/game/panel-grid';
import { paintClusters } from '@/game/terrain-clusters';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';
import type { SeededRandom } from '@/utils/random';

const TILE_SIZE = 32;

/** Result of panel-aware map generation. */
export interface VerticalMapLayout {
  worldWidth: number;
  worldHeight: number;
  cols: number;
  rows: number;
  lodgeX: number;
  lodgeY: number;
  resourcePositions: { x: number; y: number; type: string; panelId: PanelId }[];
  enemySpawnPositions: { x: number; y: number; panelId: PanelId }[];
  panelGrid: PanelGrid;
}

/** Options for map layout generation. */
export interface MapLayoutOptions {
  /** Whether the player has unlocked rare resource nodes via prestige. */
  hasRareResourceAccess?: boolean;
}

/** Map terrain type name strings from terrain.json to TerrainType enum values. */
const TERRAIN_NAME_MAP: Record<string, TerrainType> = {
  grass: TerrainType.Grass,
  water: TerrainType.Water,
  shallows: TerrainType.Shallows,
  mud: TerrainType.Mud,
  rocks: TerrainType.Rocks,
  high_ground: TerrainType.HighGround,
  thorn_wall: TerrainType.ThornWall,
};

/** Parse a terrain type name string into TerrainType enum. Defaults to Grass. */
export function parseTerrainType(name: string): TerrainType {
  return TERRAIN_NAME_MAP[name] ?? TerrainType.Grass;
}

/** Generate a panel-aware map layout. */
export function generateVerticalMapLayout(
  panelGrid: PanelGrid,
  rng: SeededRandom,
  options: MapLayoutOptions = {},
): VerticalMapLayout {
  const { width: worldWidth, height: worldHeight } = panelGrid.getWorldDimensions();
  const cols = Math.ceil(worldWidth / TILE_SIZE);
  const rows = Math.ceil(worldHeight / TILE_SIZE);
  const lodge = panelGrid.getLodgePosition();

  const resourcePositions: VerticalMapLayout['resourcePositions'] = [];
  const enemySpawnPositions: VerticalMapLayout['enemySpawnPositions'] = [];

  const activePanels = panelGrid.getActivePanels();
  for (const panelId of activePanels) {
    const def = panelGrid.getPanelDef(panelId);
    const bounds = panelGrid.getPanelBounds(panelId);
    const margin = 60;

    // Resource nodes scattered within the panel
    for (const resType of def.resources) {
      const count = resType === 'fish_node' ? rng.int(2, 4) : rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        resourcePositions.push({
          x: bounds.x + margin + rng.next() * (bounds.width - margin * 2),
          y: bounds.y + margin + rng.next() * (bounds.height - margin * 2),
          type: resType,
          panelId,
        });
      }
    }

    // Enemy spawn markers at top edge of panels with enemy_spawn=true
    if (def.enemy_spawn) {
      const spawnCount = rng.int(2, 4);
      for (let i = 0; i < spawnCount; i++) {
        const fraction = (i + 1) / (spawnCount + 1);
        enemySpawnPositions.push({
          x: bounds.x + bounds.width * fraction,
          y: bounds.y + 40,
          panelId,
        });
      }
    }
  }

  // Rare node spawning: 1-2 rare nodes per active panel when prestige unlocked
  if (options.hasRareResourceAccess) {
    for (const panelId of activePanels) {
      const bounds = panelGrid.getPanelBounds(panelId);
      const margin = 60;
      const count = rng.int(1, 2);
      for (let i = 0; i < count; i++) {
        resourcePositions.push({
          x: bounds.x + margin + rng.next() * (bounds.width - margin * 2),
          y: bounds.y + margin + rng.next() * (bounds.height - margin * 2),
          type: 'rare_node',
          panelId,
        });
      }
    }
  }

  return {
    worldWidth,
    worldHeight,
    cols,
    rows,
    lodgeX: lodge.x,
    lodgeY: lodge.y,
    resourcePositions,
    enemySpawnPositions,
    panelGrid,
  };
}

/** Build terrain grid with biome painting per panel and ThornWall for locked. */
export function buildVerticalTerrain(layout: VerticalMapLayout, rng: SeededRandom): TerrainGrid {
  const grid = new TerrainGrid(layout.worldWidth, layout.worldHeight, TILE_SIZE);
  const terrainCfg = getTerrainConfig();
  const allPanels: PanelId[] = [1, 2, 3, 4, 5, 6];

  for (const panelId of allPanels) {
    const bounds = layout.panelGrid.getPanelBounds(panelId);
    const startCol = grid.worldToCol(bounds.x);
    const startRow = grid.worldToRow(bounds.y);
    const endCol = grid.worldToCol(bounds.x + bounds.width - 1);
    const endRow = grid.worldToRow(bounds.y + bounds.height - 1);

    if (!layout.panelGrid.isPanelUnlocked(panelId)) {
      grid.fillRect(
        startCol,
        startRow,
        endCol - startCol + 1,
        endRow - startRow + 1,
        TerrainType.ThornWall,
      );
      continue;
    }

    const def = layout.panelGrid.getPanelDef(panelId);
    const rule = terrainCfg.biome_terrain_rules[def.biome];
    if (rule) {
      paintBiome(grid, startCol, startRow, endCol, endRow, rule, rng);
    }
  }

  paintResourceTerrain(grid, layout);

  return grid;
}

/**
 * Paint biome terrain within a panel's grid region.
 *
 * Strategy: fill with dominant terrain first, then place a FEW large
 * coherent clusters for features (water ponds, mud banks, rock outcrops).
 * Each cluster is a group of overlapping circles to create natural blobs.
 */
function paintBiome(
  grid: TerrainGrid,
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
  rule: BiomeTerrainRule,
  rng: SeededRandom,
): void {
  const w = endCol - startCol + 1;
  const h = endRow - startRow + 1;

  // Step 1: Fill entire panel with primary terrain type
  const primaryType = parseTerrainType(rule.primary);
  if (primaryType !== TerrainType.Grass) {
    grid.fillRect(startCol, startRow, w, h, primaryType);
  }

  // Step 2: Paint coherent clusters for each feature type.
  if (rule.water_coverage) {
    paintClusters(startCol, startRow, w, h, rule.water_coverage, rng, (col, row, r) => {
      grid.fillCircle(col, row, r, TerrainType.Shallows);
      if (r >= 3) {
        grid.fillCircle(col, row, Math.max(1, r - 2), TerrainType.Water);
      }
    });
  }

  if (rule.mud_coverage) {
    paintClusters(startCol, startRow, w, h, rule.mud_coverage, rng, (col, row, r) => {
      grid.fillCircle(col, row, r, TerrainType.Mud);
    });
  }

  if (rule.rock_coverage) {
    paintClusters(startCol, startRow, w, h, rule.rock_coverage, rng, (col, row, r) => {
      grid.fillCircle(col, row, r, TerrainType.Rocks);
    });
  }

  if (rule.high_ground_coverage) {
    paintClusters(startCol, startRow, w, h, rule.high_ground_coverage, rng, (col, row, r) => {
      grid.fillCircle(col, row, r, TerrainType.HighGround);
    });
  }

  if (rule.tree_density) {
    paintClusters(startCol, startRow, w, h, rule.tree_density, rng, (col, row, r) => {
      grid.fillCircle(col, row, r, TerrainType.HighGround);
    });
  }
}

/** Paint terrain features around resource nodes. */
function paintResourceTerrain(grid: TerrainGrid, layout: VerticalMapLayout): void {
  for (const res of layout.resourcePositions) {
    const col = grid.worldToCol(res.x);
    const row = grid.worldToRow(res.y);

    if (res.type === 'fish_node') {
      grid.fillCircle(col, row, 5, TerrainType.Shallows);
      grid.fillCircle(col, row, 3, TerrainType.Water);
    } else if (res.type === 'rock_deposit') {
      grid.fillCircle(col, row, 4, TerrainType.HighGround);
      grid.fillCircle(col, row, 3, TerrainType.Rocks);
    } else if (res.type === 'tree_cluster') {
      grid.fillCircle(col, row, 3, TerrainType.HighGround);
    }
  }
}

/** Apply the vertical map layout to a GameWorld. */
export function applyVerticalMapToWorld(
  world: GameWorld,
  layout: VerticalMapLayout,
  terrain: TerrainGrid,
): void {
  world.terrainGrid = terrain;
  world.camX = layout.lodgeX - world.viewWidth / 2;
  world.camY = layout.lodgeY - world.viewHeight / 2;
}
