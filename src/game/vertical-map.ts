/**
 * Panel-Aware Map Generator (v3.0 — 6-Panel Map System)
 *
 * Generates terrain for each panel based on biome rules from terrain.json.
 * Unlocked panels get biome-appropriate terrain; locked panels are filled
 * with ThornWall (impassable barrier).
 *
 * Panel layout (3x2):
 *   1 2 3   (top row — enemies, late game)
 *   4 5 6   (bottom row — player territory)
 */

import { getTerrainConfig } from '@/config/config-loader';
import type { BiomeTerrainRule } from '@/config/v3-types';
import type { GameWorld } from '@/ecs/world';
import type { PanelGrid, PanelId } from '@/game/panel-grid';
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

/** Paint biome terrain within a panel's grid region. */
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
  const totalTiles = w * h;

  if (rule.water_coverage) {
    const count = Math.floor(totalTiles * rule.water_coverage * 0.1);
    for (let i = 0; i < count; i++) {
      const col = startCol + rng.int(1, w - 1);
      const row = startRow + rng.int(1, h - 1);
      const radius = rng.int(2, 5);
      grid.fillCircle(col, row, radius, TerrainType.Shallows);
      if (rng.next() < 0.4) {
        grid.fillCircle(col, row, Math.max(1, radius - 2), TerrainType.Water);
      }
    }
  }

  if (rule.mud_coverage) {
    const count = Math.floor(totalTiles * rule.mud_coverage * 0.1);
    for (let i = 0; i < count; i++) {
      const col = startCol + rng.int(1, w - 1);
      const row = startRow + rng.int(1, h - 1);
      grid.fillCircle(col, row, rng.int(2, 4), TerrainType.Mud);
    }
  }

  if (rule.rock_coverage) {
    const count = Math.floor(totalTiles * rule.rock_coverage * 0.08);
    for (let i = 0; i < count; i++) {
      const col = startCol + rng.int(1, w - 1);
      const row = startRow + rng.int(1, h - 1);
      grid.fillCircle(col, row, rng.int(2, 4), TerrainType.Rocks);
    }
  }

  if (rule.high_ground_coverage) {
    const count = Math.floor(totalTiles * rule.high_ground_coverage * 0.08);
    for (let i = 0; i < count; i++) {
      const col = startCol + rng.int(1, w - 1);
      const row = startRow + rng.int(1, h - 1);
      grid.fillCircle(col, row, rng.int(2, 3), TerrainType.HighGround);
    }
  }

  if (rule.tree_density) {
    const count = Math.floor(totalTiles * rule.tree_density * 0.06);
    for (let i = 0; i < count; i++) {
      const col = startCol + rng.int(2, w - 2);
      const row = startRow + rng.int(2, h - 2);
      grid.fillCircle(col, row, rng.int(1, 3), TerrainType.HighGround);
    }
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
