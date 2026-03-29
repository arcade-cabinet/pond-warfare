/**
 * Spatial Hash Grid
 *
 * Partitions 2D space into a grid of cells for efficient proximity queries.
 * Reduces O(n^2) "find nearby entities" loops to ~O(n) by only checking
 * entities in neighboring cells.
 *
 * Cell size should roughly match the largest query radius used in
 * the game (attack ranges, aggro radii, ally assist).
 */
export class SpatialHash {
  private readonly invCellSize: number;
  private cells = new Map<number, number[]>();

  constructor(cellSize: number) {
    this.invCellSize = 1 / cellSize;
  }

  clear(): void {
    this.cells.clear();
  }

  private key(cx: number, cy: number): number {
    // Offset to handle negative coordinates (shift into positive range)
    return (cx + 5000) * 10000 + (cy + 5000);
  }

  insert(eid: number, x: number, y: number): void {
    const cx = Math.floor(x * this.invCellSize);
    const cy = Math.floor(y * this.invCellSize);
    const k = this.key(cx, cy);
    const cell = this.cells.get(k);
    if (cell) cell.push(eid);
    else this.cells.set(k, [eid]);
  }

  /**
   * Return all entity IDs in cells that overlap the axis-aligned bounding
   * box defined by (x - radius, y - radius) to (x + radius, y + radius).
   *
   * Callers should still do a precise distance check on the results.
   */
  query(x: number, y: number, radius: number): number[] {
    const result: number[] = [];
    const minCx = Math.floor((x - radius) * this.invCellSize);
    const maxCx = Math.floor((x + radius) * this.invCellSize);
    const minCy = Math.floor((y - radius) * this.invCellSize);
    const maxCy = Math.floor((y + radius) * this.invCellSize);

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const cell = this.cells.get(this.key(cx, cy));
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            result.push(cell[i]);
          }
        }
      }
    }
    return result;
  }
}
