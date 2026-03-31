/**
 * Tech Tree — Layout data and constants
 *
 * Contains the tree graph definitions (nodes, edges) for each branch,
 * cell sizing constants, and the shared interfaces used by all tech-tree
 * sub-components.
 */

import type { TechId } from '@/config/tech-tree';

// -------------------------------------------------------------------
// Shared interfaces
// -------------------------------------------------------------------

export interface TreeNode {
  id: TechId;
  /** Grid column (0-based) within the branch */
  col: number;
  /** Grid row (0-based) */
  row: number;
  /** Unit unlock text shown below the node */
  unlocks?: string;
}

export interface TreeEdge {
  from: TechId;
  to: TechId;
}

// -------------------------------------------------------------------
// Cell sizing (desktop graph layout)
// -------------------------------------------------------------------

export const NODE_W = 130;
export const NODE_H = 80;
export const GAP_X = 30;
export const GAP_Y = 24;
export const CELL_W = NODE_W + GAP_X;
export const CELL_H = NODE_H + GAP_Y;

// -------------------------------------------------------------------
// Lodge / Nature branch
// -------------------------------------------------------------------

export const LODGE_NODES: TreeNode[] = [
  { id: 'cartography', col: 0, row: 0, unlocks: 'Scout Post' },
  { id: 'tidalHarvest', col: 1, row: 0 },
  { id: 'herbalMedicine', col: 2, row: 0, unlocks: 'Herbalist Hut' },
  { id: 'tradeRoutes', col: 0, row: 1 },
  { id: 'aquaticTraining', col: 2, row: 1, unlocks: 'Swimmer' },
  { id: 'pondBlessing', col: 1, row: 1 },
  { id: 'deepDiving', col: 2, row: 2 },
  { id: 'rootNetwork', col: 1, row: 2 },
  { id: 'tidalSurge', col: 0, row: 2 },
];

export const LODGE_EDGES: TreeEdge[] = [
  { from: 'herbalMedicine', to: 'aquaticTraining' },
  { from: 'herbalMedicine', to: 'pondBlessing' },
  { from: 'aquaticTraining', to: 'deepDiving' },
  { from: 'cartography', to: 'tradeRoutes' },
  { from: 'deepDiving', to: 'rootNetwork' },
  { from: 'deepDiving', to: 'tidalSurge' },
];

// -------------------------------------------------------------------
// Armory branch
// -------------------------------------------------------------------

export const ARMORY_NODES: TreeNode[] = [
  { id: 'sturdyMud', col: 0, row: 0 },
  { id: 'swiftPaws', col: 1, row: 0 },
  { id: 'sharpSticks', col: 0, row: 1 },
  { id: 'ironShell', col: 1, row: 1, unlocks: 'Shieldbearer' },
  { id: 'battleRoar', col: 2, row: 1 },
  { id: 'eagleEye', col: 0, row: 2 },
  { id: 'siegeWorks', col: 1, row: 2, unlocks: 'Catapult' },
  { id: 'cunningTraps', col: 2, row: 2, unlocks: 'Trapper' },
  { id: 'hardenedShells', col: 0, row: 3 },
  { id: 'piercingShot', col: 1, row: 3 },
  { id: 'camouflage', col: 2, row: 3 },
  { id: 'fortifiedWalls', col: 0, row: 4 },
  { id: 'rallyCry', col: 1, row: 4 },
  { id: 'warDrums', col: 2, row: 4 },
  { id: 'venomCoating', col: 0, row: 5 },
  { id: 'siegeEngineering', col: 1, row: 5 },
];

export const ARMORY_EDGES: TreeEdge[] = [
  { from: 'sturdyMud', to: 'swiftPaws' },
  { from: 'sturdyMud', to: 'fortifiedWalls' },
  { from: 'sharpSticks', to: 'ironShell' },
  { from: 'sharpSticks', to: 'battleRoar' },
  { from: 'sharpSticks', to: 'eagleEye' },
  { from: 'sharpSticks', to: 'cunningTraps' },
  { from: 'eagleEye', to: 'siegeWorks' },
  { from: 'eagleEye', to: 'hardenedShells' },
  { from: 'eagleEye', to: 'piercingShot' },
  { from: 'cunningTraps', to: 'camouflage' },
  { from: 'cunningTraps', to: 'venomCoating' },
  { from: 'swiftPaws', to: 'rallyCry' },
  { from: 'battleRoar', to: 'warDrums' },
  { from: 'siegeWorks', to: 'siegeEngineering' },
];
