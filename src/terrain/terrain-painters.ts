/**
 * Terrain Painters
 *
 * Scenario-specific terrain painting functions. Each paints terrain types
 * onto the TerrainGrid based on the map layout.
 *
 * Extended scenarios (Archipelago, Ravine, Swamp) are in terrain-painters-extended.ts.
 */

import { TILE_SIZE, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import type { SeededRandom } from '@/utils/random';
import { type TerrainGrid, TerrainType } from './terrain-grid';

export { paintArchipelago, paintRavine, paintSwamp } from './terrain-painters-extended';

interface PaintContext {
  grid: TerrainGrid;
  rng: SeededRandom;
}

/** Scatter random patches of a terrain type across a rectangular region. */
function scatterPatches(
  ctx: PaintContext,
  type: TerrainType,
  count: number,
  minCol: number,
  minRow: number,
  maxCol: number,
  maxRow: number,
  radius: number,
): void {
  const { grid, rng } = ctx;
  for (let i = 0; i < count; i++) {
    const col = rng.int(minCol, maxCol);
    const row = rng.int(minRow, maxRow);
    grid.fillCircle(col, row, radius, type);
  }
}

/** Paint the standard scenario terrain. */
export function paintStandard(grid: TerrainGrid, rng: SeededRandom): void {
  const ctx: PaintContext = { grid, rng };
  const maxCol = grid.cols - 1;
  const maxRow = grid.rows - 1;

  // Mud patches scattered across the map
  scatterPatches(ctx, TerrainType.Mud, 12, 2, 2, maxCol - 2, maxRow - 2, 3);

  // Rock clusters forming natural walls/chokepoints along the midline
  const midCol = Math.floor(grid.cols / 2);
  scatterPatches(ctx, TerrainType.Rocks, 6, midCol - 8, 2, midCol + 8, maxRow - 2, 2);

  // High ground patches at strategic positions
  scatterPatches(ctx, TerrainType.HighGround, 4, 4, 4, maxCol - 4, maxRow - 4, 3);

  // Small water ponds
  scatterPatches(ctx, TerrainType.Water, 3, 4, 4, maxCol - 4, maxRow - 4, 2);
  // Shallows around water
  scatterPatches(ctx, TerrainType.Shallows, 6, 4, 4, maxCol - 4, maxRow - 4, 2);
}

/** Paint the river scenario terrain: water stripe with shallow crossings. */
export function paintRiver(grid: TerrainGrid, rng: SeededRandom): void {
  const riverCol = Math.floor(grid.cols / 2);
  const riverWidth = 3;

  // Determine bridge positions (2-3 crossings)
  const bridgeCount = rng.int(2, 4);
  const sectionHeight = Math.floor(grid.rows / (bridgeCount + 1));
  const bridgeRows: number[] = [];
  for (let i = 0; i < bridgeCount; i++) {
    bridgeRows.push(sectionHeight * (i + 1) + rng.int(-2, 2));
  }

  // Paint the river as water
  for (let r = 0; r < grid.rows; r++) {
    let isBridge = false;
    for (const br of bridgeRows) {
      if (Math.abs(r - br) <= 2) {
        isBridge = true;
        break;
      }
    }
    for (let c = riverCol - riverWidth; c <= riverCol + riverWidth; c++) {
      if (isBridge) {
        grid.set(c, r, TerrainType.Shallows);
      } else {
        grid.set(c, r, TerrainType.Water);
      }
    }
  }

  // Mud along riverbanks
  for (let r = 0; r < grid.rows; r++) {
    grid.set(riverCol - riverWidth - 1, r, TerrainType.Mud);
    grid.set(riverCol + riverWidth + 1, r, TerrainType.Mud);
  }

  // High ground overlooking bridges
  for (const br of bridgeRows) {
    grid.fillCircle(riverCol - riverWidth - 4, br, 2, TerrainType.HighGround);
    grid.fillCircle(riverCol + riverWidth + 4, br, 2, TerrainType.HighGround);
  }
}

/** Paint the island scenario terrain: water ring, shallows at bridges. */
export function paintIsland(grid: TerrainGrid, rng: SeededRandom): void {
  const centerCol = Math.floor(grid.cols / 2);
  const centerRow = Math.floor(grid.rows / 2);
  const outerRadius = Math.min(grid.cols, grid.rows) * 0.42;
  const innerRadius = outerRadius - 4;

  // Paint a ring of water around the island
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const dx = c - centerCol;
      const dy = r - centerRow;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > outerRadius) {
        grid.set(c, r, TerrainType.Water);
      } else if (d > innerRadius) {
        grid.set(c, r, TerrainType.Shallows);
      }
    }
  }

  // 4 shallow "bridges" at cardinal directions
  const bridgeWidth = 3;
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    for (let d = innerRadius - 1; d < outerRadius + 4; d++) {
      for (let w = -bridgeWidth; w <= bridgeWidth; w++) {
        const c = Math.round(centerCol + Math.cos(angle) * d + Math.sin(angle) * w);
        const r = Math.round(centerRow + Math.sin(angle) * d - Math.cos(angle) * w);
        grid.set(c, r, TerrainType.Shallows);
      }
    }
  }

  // High ground in center
  grid.fillCircle(centerCol, centerRow, 4, TerrainType.HighGround);

  // Mud near shoreline
  const ctx: PaintContext = { grid, rng };
  scatterPatches(ctx, TerrainType.Mud, 6, 4, 4, grid.cols - 4, grid.rows - 4, 2);
}

/** Paint the labyrinth scenario terrain: rock walls forming corridors. */
export function paintLabyrinth(grid: TerrainGrid, rng: SeededRandom): void {
  const cellSize = Math.floor(200 / TILE_SIZE); // ~6 tiles per cell
  const cols = Math.floor(grid.cols / cellSize);
  const rows = Math.floor(grid.rows / cellSize);

  // Paint rock segments along cell boundaries (matching wall placement)
  for (let row = 1; row < rows; row++) {
    const gy = row * cellSize;
    for (let col = 0; col < cols; col++) {
      if (rng.float(0, 1) < 0.3) continue;
      const gx = col * cellSize + Math.floor(cellSize / 2);
      grid.set(gx, gy, TerrainType.Rocks);
      if (gx + 1 < grid.cols) grid.set(gx + 1, gy, TerrainType.Rocks);
    }
  }
  for (let col = 1; col < cols; col++) {
    const gx = col * cellSize;
    for (let row = 0; row < rows; row++) {
      if (rng.float(0, 1) < 0.3) continue;
      const gy = row * cellSize + Math.floor(cellSize / 2);
      grid.set(gx, gy, TerrainType.Rocks);
      if (gy + 1 < grid.rows) grid.set(gx, gy + 1, TerrainType.Rocks);
    }
  }

  // Mud in dead-end corners
  const ctx: PaintContext = { grid, rng };
  scatterPatches(ctx, TerrainType.Mud, 8, 2, 2, grid.cols - 2, grid.rows - 2, 2);

  // High ground at corridor junctions
  scatterPatches(ctx, TerrainType.HighGround, 4, 4, 4, grid.cols - 4, grid.rows - 4, 2);
}

/** Paint the peninsula scenario terrain: water on 3 sides. */
export function paintPeninsula(grid: TerrainGrid, rng: SeededRandom): void {
  const penWidthTiles = Math.floor((WORLD_WIDTH * 0.35) / TILE_SIZE);
  const penLeftCol = Math.floor((grid.cols - penWidthTiles) / 2);
  const penRightCol = penLeftCol + penWidthTiles;
  const penTopRow = Math.floor((WORLD_HEIGHT * 0.45) / TILE_SIZE);

  // Water on left and right of peninsula (below penTop)
  for (let r = penTopRow; r < grid.rows; r++) {
    for (let c = 0; c < penLeftCol - 1; c++) {
      grid.set(c, r, TerrainType.Water);
    }
    // Shallows along edge
    if (penLeftCol - 1 >= 0) grid.set(penLeftCol - 1, r, TerrainType.Shallows);

    for (let c = penRightCol + 2; c < grid.cols; c++) {
      grid.set(c, r, TerrainType.Water);
    }
    if (penRightCol + 1 < grid.cols) grid.set(penRightCol + 1, r, TerrainType.Shallows);
  }

  // Rocks along peninsula walls (matching wall spawns)
  for (let r = penTopRow; r < grid.rows; r++) {
    grid.set(penLeftCol, r, TerrainType.Rocks);
    grid.set(penRightCol, r, TerrainType.Rocks);
  }

  // High ground overlooking the peninsula entrance
  grid.fillCircle(Math.floor(grid.cols / 2) - 5, penTopRow - 2, 2, TerrainType.HighGround);
  grid.fillCircle(Math.floor(grid.cols / 2) + 5, penTopRow - 2, 2, TerrainType.HighGround);

  // Mud inside the peninsula
  const ctx: PaintContext = { grid, rng };
  scatterPatches(
    ctx,
    TerrainType.Mud,
    4,
    penLeftCol + 2,
    penTopRow + 2,
    penRightCol - 2,
    grid.rows - 2,
    2,
  );
}

/** Paint the contested scenario terrain: mud between bases, scattered rocks. */
export function paintContested(grid: TerrainGrid, rng: SeededRandom): void {
  const ctx: PaintContext = { grid, rng };
  const maxCol = grid.cols - 1;
  const maxRow = grid.rows - 1;

  // Heavy mud in the contested middle zone
  scatterPatches(ctx, TerrainType.Mud, 10, 10, 10, maxCol - 10, maxRow - 10, 3);

  // Rock formations as cover
  scatterPatches(ctx, TerrainType.Rocks, 5, 8, 8, maxCol - 8, maxRow - 8, 2);

  // High ground at strategic overlook points
  scatterPatches(ctx, TerrainType.HighGround, 3, 6, 6, maxCol - 6, maxRow - 6, 3);

  // Small shallows/water features
  scatterPatches(ctx, TerrainType.Shallows, 4, 6, 6, maxCol - 6, maxRow - 6, 2);
}
