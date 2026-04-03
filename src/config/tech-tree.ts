/**
 * Tech Tree Stub
 *
 * Minimal stub preserving type signatures and exports so surviving systems
 * (combat, action-panel, governor, achievements, shrine, branch-cosmetics,
 * game-over) continue to compile. All upgrade logic will be replaced by the
 * JSON-driven upgrade web in Phase 4 of the v3.0 migration.
 */

/** Tech branch identifiers. */
export type TechBranch = 'lodge' | 'nature' | 'warfare' | 'fortifications' | 'shadow';

/** All tech upgrade IDs. */
export type TechId =
  | 'tidalHarvest'
  | 'cartography'
  | 'sharpSticks'
  | 'eagleEye'
  | 'herbalMedicine'
  | 'sturdyMud'
  | 'swiftPaws'
  | 'tradeRoutes'
  | 'deepDiving'
  | 'battleRoar'
  | 'ironShell'
  | 'aquaticTraining'
  | 'cunningTraps'
  | 'fortifiedWalls'
  | 'siegeWorks'
  | 'piercingShot'
  | 'warDrums'
  | 'rallyCry'
  | 'hardenedShells'
  | 'regeneration'
  | 'rootNetwork'
  | 'pondBlessing'
  | 'tidalSurge'
  | 'camouflage'
  | 'venomCoating';

/** State of all techs: true = researched, false = not yet. */
export type TechState = Record<string, boolean>;

export interface TechUpgrade {
  id: TechId;
  name: string;
  description: string;
  branch: TechBranch;
  clamCost: number;
  twigCost: number;
  pearlCost?: number;
  requires?: TechId;
}

/** Empty upgrade registry -- all upgrades removed for v3.0. */
export const TECH_UPGRADES: Record<TechId, TechUpgrade> = {} as Record<TechId, TechUpgrade>;

/** Check if a tech can be researched. Always returns false in stub. */
export function canResearch(_techId: TechId, _state: Record<string, boolean>): boolean {
  return false;
}

/** Create a blank tech state with all techs set to false. */
export function createInitialTechState(): TechState {
  return {} as TechState;
}
