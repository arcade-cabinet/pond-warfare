/**
 * Tech Tree -- Layout data and constants
 *
 * Contains the tree graph definitions (nodes, edges) for each of the
 * 5 branches, cell sizing constants, and shared interfaces.
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
// Cell sizing constants -- used by desktop graph layout only (BranchPanel,
// TechNode, EdgeLines). Mobile card layout uses CSS grid instead.
// -------------------------------------------------------------------

export const NODE_W = 130;
export const NODE_H = 80;
export const GAP_X = 30;
export const GAP_Y = 24;
export const CELL_W = NODE_W + GAP_X;
export const CELL_H = NODE_H + GAP_Y;

// -------------------------------------------------------------------
// Lodge (Economy & Expansion) -- 5 techs
// -------------------------------------------------------------------

export const LODGE_NODES: TreeNode[] = [
  { id: 'cartography', col: 0, row: 0, unlocks: 'Scout Post' },
  { id: 'tidalHarvest', col: 1, row: 0 },
  { id: 'tradeRoutes', col: 0, row: 1 },
  { id: 'deepDiving', col: 1, row: 1 },
  { id: 'rootNetwork', col: 1, row: 2 },
];

export const LODGE_EDGES: TreeEdge[] = [
  { from: 'cartography', to: 'tradeRoutes' },
  { from: 'tidalHarvest', to: 'deepDiving' },
  { from: 'deepDiving', to: 'rootNetwork' },
];

// -------------------------------------------------------------------
// Nature (Support & Healing) -- 5 techs
// -------------------------------------------------------------------

export const NATURE_NODES: TreeNode[] = [
  { id: 'herbalMedicine', col: 0, row: 0, unlocks: 'Herbalist Hut' },
  { id: 'aquaticTraining', col: 0, row: 1, unlocks: 'Swimmer' },
  { id: 'pondBlessing', col: 1, row: 1 },
  { id: 'regeneration', col: 0, row: 2 },
  { id: 'tidalSurge', col: 1, row: 2 },
];

export const NATURE_EDGES: TreeEdge[] = [
  { from: 'herbalMedicine', to: 'aquaticTraining' },
  { from: 'herbalMedicine', to: 'pondBlessing' },
  { from: 'aquaticTraining', to: 'regeneration' },
  // Cross-branch: tidalSurge requires deepDiving (Lodge)
  { from: 'deepDiving', to: 'tidalSurge' },
];

// -------------------------------------------------------------------
// Warfare (Offense & Damage) -- 5 techs
// -------------------------------------------------------------------

export const WARFARE_NODES: TreeNode[] = [
  { id: 'sharpSticks', col: 0, row: 0 },
  { id: 'eagleEye', col: 0, row: 1 },
  { id: 'battleRoar', col: 1, row: 1 },
  { id: 'piercingShot', col: 0, row: 2 },
  { id: 'warDrums', col: 1, row: 2 },
];

export const WARFARE_EDGES: TreeEdge[] = [
  { from: 'sharpSticks', to: 'eagleEye' },
  { from: 'sharpSticks', to: 'battleRoar' },
  { from: 'eagleEye', to: 'piercingShot' },
  { from: 'battleRoar', to: 'warDrums' },
];

// -------------------------------------------------------------------
// Fortifications (Defense & Siege) -- 5 techs
// -------------------------------------------------------------------

export const FORTIFICATION_NODES: TreeNode[] = [
  { id: 'sturdyMud', col: 0, row: 0 },
  { id: 'fortifiedWalls', col: 0, row: 1 },
  { id: 'ironShell', col: 1, row: 1, unlocks: 'Shieldbearer' },
  { id: 'siegeWorks', col: 0, row: 2, unlocks: 'Catapult' },
  { id: 'hardenedShells', col: 1, row: 2 },
];

export const FORTIFICATION_EDGES: TreeEdge[] = [
  { from: 'sturdyMud', to: 'fortifiedWalls' },
  // Cross-branch: ironShell requires sharpSticks (Warfare)
  { from: 'sharpSticks', to: 'ironShell' },
  // Cross-branch: siegeWorks requires eagleEye (Warfare)
  { from: 'eagleEye', to: 'siegeWorks' },
  // Cross-branch: hardenedShells requires eagleEye (Warfare)
  { from: 'eagleEye', to: 'hardenedShells' },
];

// -------------------------------------------------------------------
// Shadow (Subterfuge & Control) -- 5 techs
// -------------------------------------------------------------------

export const SHADOW_NODES: TreeNode[] = [
  { id: 'swiftPaws', col: 0, row: 0 },
  { id: 'cunningTraps', col: 0, row: 1, unlocks: 'Trapper' },
  { id: 'rallyCry', col: 1, row: 1 },
  { id: 'camouflage', col: 0, row: 2 },
  { id: 'venomCoating', col: 1, row: 2 },
];

export const SHADOW_EDGES: TreeEdge[] = [
  { from: 'swiftPaws', to: 'cunningTraps' },
  { from: 'swiftPaws', to: 'rallyCry' },
  { from: 'cunningTraps', to: 'camouflage' },
  { from: 'cunningTraps', to: 'venomCoating' },
];
