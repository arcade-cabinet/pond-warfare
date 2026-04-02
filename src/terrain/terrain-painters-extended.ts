/**
 * Terrain Painters — Extended scenarios (Archipelago, Ravine, Swamp)
 *
 * Separated from terrain-painters.ts to stay under 300 LOC per file.
 */

import type { SeededRandom } from '@/utils/random';
import { type TerrainGrid, TerrainType } from './terrain-grid';

/** Scatter random patches of a terrain type across a rectangular region. */
function scatterPatches(
  grid: TerrainGrid,
  rng: SeededRandom,
  type: TerrainType,
  count: number,
  minCol: number,
  minRow: number,
  maxCol: number,
  maxRow: number,
  radius: number,
): void {
  for (let i = 0; i < count; i++) {
    const col = rng.int(minCol, maxCol);
    const row = rng.int(minRow, maxRow);
    grid.fillCircle(col, row, radius, type);
  }
}

/** Paint the archipelago scenario terrain: water with grass islands and shallow bridges. */
export function paintArchipelago(grid: TerrainGrid, rng: SeededRandom): void {
  // Fill entire map with water
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      grid.set(c, r, TerrainType.Water);
    }
  }

  // Create 4-6 grass islands
  const islandCount = rng.int(4, 7);
  const islands: { col: number; row: number; radius: number }[] = [];
  for (let i = 0; i < islandCount; i++) {
    const col = rng.int(8, grid.cols - 8);
    const row = rng.int(8, grid.rows - 8);
    const radius = rng.int(5, 9);
    islands.push({ col, row, radius });
    // Shallows ring around island, then grass interior
    grid.fillCircle(col, row, radius + 2, TerrainType.Shallows);
    grid.fillCircle(col, row, radius, TerrainType.Grass);
  }

  // Create 2-3 shallow bridges between nearest island pairs
  const bridgeCount = Math.min(3, islands.length - 1);
  const connected = new Set<string>();
  for (let b = 0; b < bridgeCount; b++) {
    let bestDist = Infinity;
    let bestI = 0;
    let bestJ = 1;
    for (let i = 0; i < islands.length; i++) {
      for (let j = i + 1; j < islands.length; j++) {
        const key = `${i}-${j}`;
        if (connected.has(key)) continue;
        const dc = islands[i].col - islands[j].col;
        const dr = islands[i].row - islands[j].row;
        const d = Math.sqrt(dc * dc + dr * dr);
        if (d < bestDist) {
          bestDist = d;
          bestI = i;
          bestJ = j;
        }
      }
    }
    connected.add(`${bestI}-${bestJ}`);

    // Draw shallow bridge between the two islands
    const a = islands[bestI];
    const b2 = islands[bestJ];
    const steps = Math.ceil(bestDist);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const c = Math.round(a.col + (b2.col - a.col) * t);
      const r = Math.round(a.row + (b2.row - a.row) * t);
      grid.set(c, r, TerrainType.Shallows);
      if (c + 1 < grid.cols) grid.set(c + 1, r, TerrainType.Shallows);
      if (r + 1 < grid.rows) grid.set(c, r + 1, TerrainType.Shallows);
    }
  }

  // High ground at center of larger islands
  for (const island of islands) {
    if (island.radius >= 7) {
      grid.fillCircle(island.col, island.row, 2, TerrainType.HighGround);
    }
  }
}

/** Paint the ravine scenario terrain: central ravine with high ground flanks. */
export function paintRavine(grid: TerrainGrid, rng: SeededRandom): void {
  const midCol = Math.floor(grid.cols / 2);
  const ravineWidth = 5;

  // Bridge crossing positions
  const bridgeCount = rng.int(2, 4);
  const sectionHeight = Math.floor(grid.rows / (bridgeCount + 1));
  const bridgeRows: number[] = [];
  for (let i = 0; i < bridgeCount; i++) {
    bridgeRows.push(sectionHeight * (i + 1) + rng.int(-2, 2));
  }

  // Paint ravine as Mud with Shallows at bottom
  for (let r = 0; r < grid.rows; r++) {
    let isBridge = false;
    for (const br of bridgeRows) {
      if (Math.abs(r - br) <= 1) {
        isBridge = true;
        break;
      }
    }
    for (let c = midCol - ravineWidth; c <= midCol + ravineWidth; c++) {
      if (isBridge) {
        grid.set(c, r, TerrainType.Grass);
      } else if (Math.abs(c - midCol) <= 1) {
        grid.set(c, r, TerrainType.Shallows);
      } else {
        grid.set(c, r, TerrainType.Mud);
      }
    }
  }

  // High ground flanking the ravine
  for (let r = 0; r < grid.rows; r++) {
    for (let w = 1; w <= 3; w++) {
      grid.set(midCol - ravineWidth - w, r, TerrainType.HighGround);
      grid.set(midCol + ravineWidth + w, r, TerrainType.HighGround);
    }
  }

  // Rocks at ravine edges
  for (let r = 0; r < grid.rows; r += rng.int(3, 6)) {
    grid.set(midCol - ravineWidth, r, TerrainType.Rocks);
    grid.set(midCol + ravineWidth, r, TerrainType.Rocks);
  }
}

/** Paint the swamp scenario terrain: 70%+ Mud/Shallows with dry Grass patches. */
export function paintSwamp(grid: TerrainGrid, rng: SeededRandom): void {
  // Fill entire map with Mud (primary swamp terrain)
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      grid.set(c, r, TerrainType.Mud);
    }
  }

  // Scatter Shallows pools throughout
  scatterPatches(grid, rng, TerrainType.Shallows, 15, 2, 2, grid.cols - 2, grid.rows - 2, 3);

  // Small water pools (deep sections)
  scatterPatches(grid, rng, TerrainType.Water, 4, 4, 4, grid.cols - 4, grid.rows - 4, 2);

  // Create 5-8 dry Grass patches (buildable land)
  const patchCount = rng.int(5, 9);
  for (let i = 0; i < patchCount; i++) {
    const col = rng.int(6, grid.cols - 6);
    const row = rng.int(6, grid.rows - 6);
    const radius = rng.int(3, 6);
    grid.fillCircle(col, row, radius, TerrainType.Grass);
  }

  // Rock formations creating maze-like obstacles
  scatterPatches(grid, rng, TerrainType.Rocks, 10, 4, 4, grid.cols - 4, grid.rows - 4, 1);
}
