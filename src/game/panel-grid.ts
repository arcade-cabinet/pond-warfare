/**
 * Panel Grid (v3.0 — 6-Panel Map System)
 *
 * The game map is a 3x2 grid of panels. Each panel = one viewport.
 * New players see only panel 5 (bottom-center, Lodge). Progression
 * unlocks panels outward via "Frontier Expansion" diamond nodes.
 * Locked panels are filled with ThornWall terrain.
 *
 * Layout:
 *   ┌───┬───┬───┐
 *   │ 1 │ 2 │ 3 │  ← Top row (row 0)
 *   ├───┼───┼───┤
 *   │ 4 │ 5 │ 6 │  ← Bottom row (row 1)
 *   └───┴───┴───┘
 */

import panelsConfig from '../../configs/panels.json';

/** Panel IDs are 1-6 matching the config. */
export type PanelId = 1 | 2 | 3 | 4 | 5 | 6;

const ALL_PANEL_IDS: PanelId[] = [1, 2, 3, 4, 5, 6];
const GRID_COLS = 3;
const GRID_ROWS = 2;

export interface PanelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PanelDef {
  row: number;
  col: number;
  biome: string;
  resources: string[];
  terrain_features: string[];
  enemy_spawn: boolean;
  lodge?: boolean;
  unlock_stage: number;
}

export class PanelGrid {
  readonly panelWidth: number;
  readonly panelHeight: number;
  private readonly unlockedPanels: Set<PanelId>;
  private readonly panelDefs: Record<string, PanelDef>;

  constructor(viewportWidth: number, viewportHeight: number, unlockStage = 1) {
    this.panelWidth = viewportWidth;
    this.panelHeight = viewportHeight;
    this.panelDefs = panelsConfig.panels as unknown as Record<string, PanelDef>;
    this.unlockedPanels = new Set<PanelId>();
    this.computeUnlockedPanels(unlockStage);
  }

  /** Compute which panels are unlocked based on the progression stage. */
  private computeUnlockedPanels(stage: number): void {
    this.unlockedPanels.clear();
    for (const progression of panelsConfig.progression_stages) {
      if (progression.stage > stage) break;

      // Direct panel list
      if ('panels' in progression && Array.isArray(progression.panels)) {
        for (const id of progression.panels) {
          this.unlockedPanels.add(id as PanelId);
        }
      }
      // "add one of" — use the lower-numbered panel for deterministic default.
      // Actual 50/50 PRNG choice is done by the caller who passes the stage.
      if ('panels_add_one_of' in progression) {
        const choices = (progression as { panels_add_one_of: number[] }).panels_add_one_of;
        if (choices.length > 0) {
          this.unlockedPanels.add(choices[0] as PanelId);
        }
      }
      // "add remaining of" — add whichever wasn't already unlocked
      if ('panels_add_remaining_of' in progression) {
        const choices = (progression as { panels_add_remaining_of: number[] })
          .panels_add_remaining_of;
        for (const id of choices) {
          this.unlockedPanels.add(id as PanelId);
        }
      }
    }
  }

  /** Recompute unlocks with PRNG for 50/50 stages (3 and 5). */
  computeUnlockedPanelsWithRng(
    stage: number,
    coinFlipStage3: boolean,
    coinFlipStage5: boolean,
  ): void {
    this.unlockedPanels.clear();
    for (const progression of panelsConfig.progression_stages) {
      if (progression.stage > stage) break;

      if ('panels' in progression && Array.isArray(progression.panels)) {
        for (const id of progression.panels) {
          this.unlockedPanels.add(id as PanelId);
        }
      }
      if ('panels_add_one_of' in progression) {
        const choices = (progression as { panels_add_one_of: number[] }).panels_add_one_of;
        const flip = progression.stage === 3 ? coinFlipStage3 : coinFlipStage5;
        this.unlockedPanels.add((flip ? choices[1] : choices[0]) as PanelId);
      }
      if ('panels_add_remaining_of' in progression) {
        const choices = (progression as { panels_add_remaining_of: number[] })
          .panels_add_remaining_of;
        for (const id of choices) {
          this.unlockedPanels.add(id as PanelId);
        }
      }
    }
  }

  /** Get pixel bounds for a panel in world coordinates. */
  getPanelBounds(panelId: PanelId): PanelBounds {
    const def = this.panelDefs[String(panelId)];
    if (!def) throw new Error(`Unknown panel: ${panelId}`);
    return {
      x: def.col * this.panelWidth,
      y: def.row * this.panelHeight,
      width: this.panelWidth,
      height: this.panelHeight,
    };
  }

  /** Convert world coordinates to a panel ID, or null if out of bounds. */
  worldToPanel(worldX: number, worldY: number): PanelId | null {
    const col = Math.floor(worldX / this.panelWidth);
    const row = Math.floor(worldY / this.panelHeight);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    // Panel ID = row * 3 + col + 1
    return (row * GRID_COLS + col + 1) as PanelId;
  }

  isPanelUnlocked(panelId: PanelId): boolean {
    return this.unlockedPanels.has(panelId);
  }

  /** Bounding box covering all unlocked panels. */
  getUnlockedBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of this.unlockedPanels) {
      const b = this.getPanelBounds(id);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
    if (minX === Infinity) {
      return { minX: 0, minY: 0, maxX: this.panelWidth, maxY: this.panelHeight };
    }
    return { minX, minY, maxX, maxY };
  }

  /** List of all currently unlocked panel IDs. */
  getActivePanels(): PanelId[] {
    return ALL_PANEL_IDS.filter((id) => this.unlockedPanels.has(id));
  }

  /** Full 6-panel world dimensions. */
  getWorldDimensions(): { width: number; height: number } {
    return {
      width: GRID_COLS * this.panelWidth,
      height: GRID_ROWS * this.panelHeight,
    };
  }

  /** Lodge position: center-bottom of panel 5. */
  getLodgePosition(): { x: number; y: number } {
    const bounds = this.getPanelBounds(5);
    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height * 0.9,
    };
  }

  /** Get the panel definition (biome, resources, etc.) for a panel. */
  getPanelDef(panelId: PanelId): PanelDef {
    const def = this.panelDefs[String(panelId)];
    if (!def) throw new Error(`Unknown panel: ${panelId}`);
    return def;
  }
}
