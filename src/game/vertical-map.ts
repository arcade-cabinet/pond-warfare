/**
 * Vertical Map Generator (v3.0 — US5)
 *
 * Creates a compact vertical map from terrain.json config.
 * Lodge at bottom, enemies from top, resources in the middle zone.
 * Map size scales with progression level.
 */

import { getTerrainForLevel } from '@/config/config-loader';
import type { TerrainTier } from '@/config/v3-types';
import type { GameWorld } from '@/ecs/world';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';
import type { SeededRandom } from '@/utils/random';

/** Tile size in world pixels. */
const TILE_SIZE = 32;

/** Layout zones as fraction of map height (bottom to top). */
const LODGE_ZONE_FRAC = 0.15; // bottom 15% — Lodge + immediate area
const RESOURCE_ZONE_START = 0.2; // resources start at 20%
const RESOURCE_ZONE_END = 0.65; // resources end at 65%
const ENEMY_ZONE_FRAC = 0.15; // top 15% — enemy spawn area

/** Result of vertical map generation. */
export interface VerticalMapLayout {
  /** World width in pixels. */
  worldWidth: number;
  /** World height in pixels. */
  worldHeight: number;
  /** Grid columns. */
  cols: number;
  /** Grid rows. */
  rows: number;
  /** Lodge spawn position (bottom center). */
  lodgeX: number;
  lodgeY: number;
  /** Resource node positions (middle zone). */
  resourcePositions: { x: number; y: number; type: string }[];
  /** Enemy spawn positions (top zone). */
  enemySpawnPositions: { x: number; y: number }[];
  /** Spawn directions available at this progression level. */
  spawnDirections: string[];
  /** The terrain tier used for this layout. */
  terrainTier: TerrainTier;
}

/**
 * Generate a vertical map layout for the given progression level.
 * All positions are in world-space pixels.
 */
export function generateVerticalMapLayout(
  progressionLevel: number,
  rng: SeededRandom,
): VerticalMapLayout {
  const tier = getTerrainForLevel(progressionLevel);

  const worldWidth = tier.map_width;
  const worldHeight = tier.map_height;
  const cols = Math.ceil(worldWidth / TILE_SIZE);
  const rows = Math.ceil(worldHeight / TILE_SIZE);

  // Lodge at bottom center
  const lodgeX = worldWidth / 2;
  const lodgeY = worldHeight * (1 - LODGE_ZONE_FRAC / 2);

  // Resource nodes in the middle zone
  const resStartY = worldHeight * RESOURCE_ZONE_START;
  const resEndY = worldHeight * RESOURCE_ZONE_END;
  const margin = 60;
  const resourcePositions = generateResourcePositions(
    tier.resource_nodes,
    worldWidth,
    resStartY,
    resEndY,
    margin,
    rng,
  );

  // Enemy spawn points at the top
  const enemySpawnY = worldHeight * (ENEMY_ZONE_FRAC / 2);
  const spawnCount = tier.enemy_spawn_directions.includes('top') ? 3 : 1;
  const enemySpawnPositions: { x: number; y: number }[] = [];

  // Top spawns
  for (let i = 0; i < spawnCount; i++) {
    const fraction = (i + 1) / (spawnCount + 1);
    enemySpawnPositions.push({
      x: worldWidth * fraction,
      y: enemySpawnY,
    });
  }

  // Side spawns for higher progression
  if (tier.enemy_spawn_directions.includes('left')) {
    enemySpawnPositions.push({ x: margin, y: worldHeight * 0.4 });
  }
  if (tier.enemy_spawn_directions.includes('right')) {
    enemySpawnPositions.push({ x: worldWidth - margin, y: worldHeight * 0.4 });
  }

  return {
    worldWidth,
    worldHeight,
    cols,
    rows,
    lodgeX,
    lodgeY,
    resourcePositions,
    enemySpawnPositions,
    spawnDirections: tier.enemy_spawn_directions,
    terrainTier: tier,
  };
}

/** Generate scattered resource positions in the middle zone. */
function generateResourcePositions(
  count: number,
  worldWidth: number,
  startY: number,
  endY: number,
  margin: number,
  rng: SeededRandom,
): { x: number; y: number; type: string }[] {
  const types = ['fish_node', 'rock_deposit', 'tree_cluster'];
  const positions: { x: number; y: number; type: string }[] = [];

  for (let i = 0; i < count; i++) {
    const x = margin + rng.next() * (worldWidth - margin * 2);
    const y = startY + rng.next() * (endY - startY);
    const type = types[i % types.length];
    positions.push({ x, y, type });
  }

  return positions;
}

/**
 * Build a TerrainGrid for the vertical map layout.
 * Paints water patches, rock formations, and mud paths.
 * Order matters: water first, then rocks (so rocks aren't overwritten).
 */
export function buildVerticalTerrain(layout: VerticalMapLayout, rng: SeededRandom): TerrainGrid {
  const grid = new TerrainGrid(layout.worldWidth, layout.worldHeight, TILE_SIZE);

  // Pass 1: Water bodies around fish nodes
  for (const res of layout.resourcePositions) {
    if (res.type === 'fish_node') {
      const col = grid.worldToCol(res.x);
      const row = grid.worldToRow(res.y);
      grid.fillCircle(col, row, 4, TerrainType.Shallows);
      grid.fillCircle(col, row, 2, TerrainType.Water);
    }
  }

  // Pass 2: Rock deposits (painted AFTER water so they win)
  for (const res of layout.resourcePositions) {
    if (res.type === 'rock_deposit') {
      const col = grid.worldToCol(res.x);
      const row = grid.worldToRow(res.y);
      grid.fillCircle(col, row, 2, TerrainType.Rocks);
    }
  }

  // Mud paths from Lodge zone to resource zone
  const lodgeCol = grid.worldToCol(layout.lodgeX);
  const lodgeRow = grid.worldToRow(layout.lodgeY);
  const midRow = grid.worldToRow(layout.worldHeight * 0.4);
  paintPath(grid, lodgeCol, lodgeRow, lodgeCol, midRow, TerrainType.Mud, rng);

  // Random grass clearings (variety)
  const clearingCount = Math.floor(layout.cols * layout.rows * 0.002);
  for (let i = 0; i < clearingCount; i++) {
    const col = Math.floor(rng.next() * layout.cols);
    const row = Math.floor(rng.next() * layout.rows);
    if (grid.get(col, row) === TerrainType.Grass) {
      grid.fillCircle(col, row, 1 + Math.floor(rng.next() * 2), TerrainType.HighGround);
    }
  }

  return grid;
}

/** Paint a rough path between two grid positions. */
function paintPath(
  grid: TerrainGrid,
  c0: number,
  r0: number,
  c1: number,
  r1: number,
  type: TerrainType,
  rng: SeededRandom,
): void {
  let c = c0;
  let r = r0;
  const steps = Math.abs(r1 - r0) + Math.abs(c1 - c0);

  for (let i = 0; i < steps; i++) {
    grid.set(c, r, type);
    // Adjacent tile for width
    if (c + 1 < grid.cols) grid.set(c + 1, r, type);

    // Step toward target with some randomness
    if (rng.next() < 0.3 && c !== c1) {
      c += c1 > c ? 1 : -1;
    } else if (r !== r1) {
      r += r1 > r ? 1 : -1;
    }
  }
}

/**
 * Apply the vertical map layout to a GameWorld, replacing the
 * current square map with the vertical layout dimensions.
 */
export function applyVerticalMapToWorld(
  world: GameWorld,
  layout: VerticalMapLayout,
  terrain: TerrainGrid,
): void {
  world.terrainGrid = terrain;
  // Camera starts centered on Lodge
  world.camX = layout.lodgeX - world.viewWidth / 2;
  world.camY = layout.lodgeY - world.viewHeight / 2;
}
