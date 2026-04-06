/**
 * Terrain Cluster Painting
 *
 * Paints coherent terrain clusters within a panel region using
 * overlapping circles for natural-looking terrain blobs.
 * Cluster tuning constants are read from terrain.json config.
 *
 * Circles are clamped to panel bounds so clusters cannot spill
 * into adjacent panels.
 */

import { getTerrainConfig } from '@/config/config-loader';
import type { ClusterTuning } from '@/config/v3-types';
import type { SeededRandom } from '@/utils/random';

/** Default cluster tuning when config is missing. */
const DEFAULT_TUNING: ClusterTuning = {
  max_clusters: 4,
  coverage_cluster_scale: 10,
  base_radius_offset: 3,
  coverage_radius_scale: 8,
  sub_circle_min: 2,
  sub_circle_max: 4,
  margin_tiles: 3,
};

/** Load cluster tuning from terrain.json, falling back to defaults. */
export function getClusterTuning(): ClusterTuning {
  const cfg = getTerrainConfig();
  return cfg.cluster_tuning ?? DEFAULT_TUNING;
}

/**
 * Paint coherent terrain clusters within a region.
 *
 * Places 2-4 cluster seeds based on coverage, then extends each seed
 * with 2-4 overlapping sub-circles to create natural-looking blobs
 * instead of scattered dots.
 *
 * All circle centers are clamped to [startCol..endCol, startRow..endRow]
 * so that no cluster spills into an adjacent panel.
 */
export function paintClusters(
  startCol: number,
  startRow: number,
  w: number,
  h: number,
  coverage: number,
  rng: SeededRandom,
  paintFn: (col: number, row: number, radius: number) => void,
): void {
  const tuning = getClusterTuning();
  const margin = tuning.margin_tiles;
  const endCol = startCol + w - 1;
  const endRow = startRow + h - 1;

  // Number of distinct clusters: 1-max_clusters scaled by coverage
  const clusterCount = Math.max(
    1,
    Math.min(tuning.max_clusters, Math.round(coverage * tuning.coverage_cluster_scale)),
  );

  for (let c = 0; c < clusterCount; c++) {
    // Cluster center, clamped to panel bounds
    const cx = clampCol(
      startCol + margin + rng.int(0, Math.max(1, w - margin * 2)),
      startCol,
      endCol,
    );
    const cy = clampRow(
      startRow + margin + rng.int(0, Math.max(1, h - margin * 2)),
      startRow,
      endRow,
    );

    // Base radius scaled by coverage (bigger coverage = bigger blobs)
    const baseRadius = Math.max(
      2,
      Math.round(tuning.base_radius_offset + coverage * tuning.coverage_radius_scale),
    );

    // Clamp radius so circle doesn't exceed panel bounds
    const clampedRadius = clampRadius(cx, cy, baseRadius, startCol, startRow, endCol, endRow);
    paintFn(cx, cy, clampedRadius);

    // Add overlapping sub-circles for organic shape
    const subCount = rng.int(tuning.sub_circle_min, tuning.sub_circle_max);
    for (let s = 0; s < subCount; s++) {
      const angle = rng.next() * Math.PI * 2;
      const dist = rng.int(1, Math.max(1, baseRadius - 1));
      const sx = clampCol(cx + Math.round(Math.cos(angle) * dist), startCol, endCol);
      const sy = clampRow(cy + Math.round(Math.sin(angle) * dist), startRow, endRow);
      const sr = Math.max(1, baseRadius - rng.int(1, 2));
      const clampedSr = clampRadius(sx, sy, sr, startCol, startRow, endCol, endRow);
      paintFn(sx, sy, clampedSr);
    }
  }
}

/** Clamp a column index to panel bounds. */
function clampCol(col: number, minCol: number, maxCol: number): number {
  return Math.max(minCol, Math.min(maxCol, col));
}

/** Clamp a row index to panel bounds. */
function clampRow(row: number, minRow: number, maxRow: number): number {
  return Math.max(minRow, Math.min(maxRow, row));
}

/** Shrink radius so (center +/- radius) stays within panel bounds. */
function clampRadius(
  cx: number,
  cy: number,
  radius: number,
  minCol: number,
  minRow: number,
  maxCol: number,
  maxRow: number,
): number {
  const maxR = Math.min(cx - minCol, maxCol - cx, cy - minRow, maxRow - cy, radius);
  return Math.max(1, maxR);
}
