/**
 * Terrain Grid
 *
 * Tile-based terrain system. Each tile has a TerrainType that affects
 * movement speed, pathability, and combat range bonuses.
 */

export enum TerrainType {
  Grass = 0,
  Water = 1,
  Shallows = 2,
  Mud = 3,
  Rocks = 4,
  HighGround = 5,
  ThornWall = 6,
}

/** Speed multiplier for each terrain type. 0 = impassable. */
const SPEED_MULTIPLIERS: Record<TerrainType, number> = {
  [TerrainType.Grass]: 1.0,
  [TerrainType.Water]: 0, // impassable for land units
  [TerrainType.Shallows]: 0.5,
  [TerrainType.Mud]: 0.75,
  [TerrainType.Rocks]: 0, // impassable
  [TerrainType.HighGround]: 1.0,
  [TerrainType.ThornWall]: 0, // impassable — locked panel barrier
};

/** Entity kinds that can traverse water tiles (matched by EntityKind numeric value). */
const WATER_TRAVERSABLE_KINDS = new Set([
  32, // EntityKind.Fish
]);

/** Entity kinds that ignore ALL terrain speed modifiers (fly over everything). */
const FLYING_KINDS = new Set([
  37, // EntityKind.FlyingHeron
]);

export class TerrainGrid {
  readonly grid: Uint8Array;
  readonly cols: number;
  readonly rows: number;
  private readonly tileSize: number;

  constructor(worldWidth: number, worldHeight: number, tileSize: number) {
    this.tileSize = tileSize;
    this.cols = Math.ceil(worldWidth / tileSize);
    this.rows = Math.ceil(worldHeight / tileSize);
    this.grid = new Uint8Array(this.cols * this.rows);
    // Default: all grass (0)
  }

  /** Get terrain type at a world-space position. */
  getAt(worldX: number, worldY: number): TerrainType {
    const col = Math.max(0, Math.min(this.cols - 1, Math.floor(worldX / this.tileSize)));
    const row = Math.max(0, Math.min(this.rows - 1, Math.floor(worldY / this.tileSize)));
    return this.grid[row * this.cols + col] as TerrainType;
  }

  /** Get terrain type at grid coordinates. */
  get(col: number, row: number): TerrainType {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return TerrainType.Grass;
    return this.grid[row * this.cols + col] as TerrainType;
  }

  /** Set terrain type at grid coordinates. */
  set(col: number, row: number, type: TerrainType): void {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return;
    this.grid[row * this.cols + col] = type;
  }

  /** Fill a rectangular region of tiles with a terrain type. */
  fillRect(col: number, row: number, w: number, h: number, type: TerrainType): void {
    const c0 = Math.max(0, col);
    const r0 = Math.max(0, row);
    const c1 = Math.min(this.cols, col + w);
    const r1 = Math.min(this.rows, row + h);
    for (let r = r0; r < r1; r++) {
      for (let c = c0; c < c1; c++) {
        this.grid[r * this.cols + c] = type;
      }
    }
  }

  /** Fill a circle of tiles centered at grid coordinates. */
  fillCircle(centerCol: number, centerRow: number, radius: number, type: TerrainType): void {
    const r2 = radius * radius;
    const c0 = Math.max(0, Math.floor(centerCol - radius));
    const r0 = Math.max(0, Math.floor(centerRow - radius));
    const c1 = Math.min(this.cols - 1, Math.ceil(centerCol + radius));
    const r1 = Math.min(this.rows - 1, Math.ceil(centerRow + radius));
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const dx = c - centerCol;
        const dy = r - centerRow;
        if (dx * dx + dy * dy <= r2) {
          this.grid[r * this.cols + c] = type;
        }
      }
    }
  }

  /** Speed multiplier for a terrain type. */
  speedMult(type: TerrainType): number {
    return SPEED_MULTIPLIERS[type];
  }

  /**
   * Get effective speed multiplier for an entity at a world position.
   * Flying units ignore terrain. Fish can traverse water.
   */
  getSpeedMultiplier(worldX: number, worldY: number, entityKind: number): number {
    const type = this.getAt(worldX, worldY);

    // ThornWall blocks everything — even flying units
    if (type === TerrainType.ThornWall) return 0;

    // Flying units ignore all other terrain penalties
    if (FLYING_KINDS.has(entityKind)) return 1.0;

    if (type === TerrainType.Water && WATER_TRAVERSABLE_KINDS.has(entityKind)) {
      return 0.5; // Aquatic critters cross water at shallows speed
    }
    return SPEED_MULTIPLIERS[type];
  }

  /** Check if a terrain type is passable for a given entity kind. */
  isPassable(worldX: number, worldY: number, entityKind: number): boolean {
    return this.getSpeedMultiplier(worldX, worldY, entityKind) > 0;
  }

  /** Convert world coordinates to grid column. */
  worldToCol(worldX: number): number {
    return Math.max(0, Math.min(this.cols - 1, Math.floor(worldX / this.tileSize)));
  }

  /** Convert world coordinates to grid row. */
  worldToRow(worldY: number): number {
    return Math.max(0, Math.min(this.rows - 1, Math.floor(worldY / this.tileSize)));
  }
}
