/**
 * Upgrade Web State Manager (v3.0 — US12)
 *
 * Manages between-match upgrade web state: purchased nodes,
 * purchase eligibility, active effects, diamond node unlocks.
 * UI component lives in upgrade-web-screen.tsx.
 */

import { getUpgradeCategories } from '@/config/config-loader';
import {
  type DiamondNode,
  getNodesForPath,
  isDiamondNodeUnlocked,
  type UpgradeNode,
  type UpgradeWeb,
} from '@/config/upgrade-web';

// ── Types ─────────────────────────────────────────────────────────

/** Player's upgrade web purchase state (stored between matches). */
export interface UpgradeWebPurchaseState {
  purchasedNodes: Set<string>;
  purchasedDiamonds: Set<string>;
  clams: number;
  /** 1-indexed tier level per path (buying t0-t4 stores 5). */
  highestTiers: Map<string, number>;
}

export type NodeDisplayState = 'locked' | 'available' | 'purchased' | 'prestige';

export interface NodeDisplayInfo {
  id: string;
  name: string;
  cost: number;
  effect: number;
  effectLabel: string;
  state: NodeDisplayState;
  tier: number;
  category: string;
  subcategory: string;
}

export interface DiamondDisplayInfo {
  id: string;
  label: string;
  cost: number;
  effectDescription: string;
  state: NodeDisplayState;
  prerequisitesMet: boolean;
  prerequisites: { path: string; requiredTier: number; currentTier: number }[];
}

export interface PurchaseNodeResult {
  success: boolean;
  reason?: string;
  newClams?: number;
}

// ── State Creation ────────────────────────────────────────────────

export function createUpgradeWebState(clams: number): UpgradeWebPurchaseState {
  return {
    purchasedNodes: new Set(),
    purchasedDiamonds: new Set(),
    clams,
    highestTiers: new Map(),
  };
}

// ── Purchase Logic ────────────────────────────────────────────────

export function purchaseNode(
  state: UpgradeWebPurchaseState,
  web: UpgradeWeb,
  nodeId: string,
): PurchaseNodeResult {
  const node = web.nodeMap.get(nodeId);
  if (!node) return { success: false, reason: 'Unknown node' };
  if (state.purchasedNodes.has(nodeId)) return { success: false, reason: 'Already purchased' };
  if (node.prerequisite && !state.purchasedNodes.has(node.prerequisite)) {
    return { success: false, reason: 'Prerequisite not purchased' };
  }
  if (state.clams < node.cost) {
    return { success: false, reason: `Need ${node.cost} Clams (have ${state.clams})` };
  }

  state.clams -= node.cost;
  state.purchasedNodes.add(nodeId);

  // 1-indexed tier level for diamond prereq compatibility
  const pathKey = `${node.category}_${node.subcategory}`;
  const tierLevel = node.tier + 1;
  const currentHighest = state.highestTiers.get(pathKey) ?? 0;
  if (tierLevel > currentHighest) state.highestTiers.set(pathKey, tierLevel);

  return { success: true, newClams: state.clams };
}

export function purchaseDiamondNode(
  state: UpgradeWebPurchaseState,
  web: UpgradeWeb,
  diamondId: string,
): PurchaseNodeResult {
  const diamond = web.diamondMap.get(diamondId);
  if (!diamond) return { success: false, reason: 'Unknown diamond node' };
  if (state.purchasedDiamonds.has(diamondId))
    return { success: false, reason: 'Already purchased' };
  if (!isDiamondNodeUnlocked(diamond.requires, state.highestTiers)) {
    return { success: false, reason: 'Prerequisites not met' };
  }
  if (state.clams < diamond.cost) {
    return { success: false, reason: `Need ${diamond.cost} Clams (have ${state.clams})` };
  }

  state.clams -= diamond.cost;
  state.purchasedDiamonds.add(diamondId);
  return { success: true, newClams: state.clams };
}

// ── Display Info Generation ──────────────────────────────────────

export function getNodeDisplayState(
  state: UpgradeWebPurchaseState,
  node: UpgradeNode,
  prestigeFilledNodes?: Set<string>,
): NodeDisplayState {
  if (state.purchasedNodes.has(node.id)) {
    if (prestigeFilledNodes?.has(node.id)) return 'prestige';
    return 'purchased';
  }
  if (node.prerequisite && !state.purchasedNodes.has(node.prerequisite)) return 'locked';
  return 'available';
}

export function getPathDisplayInfo(
  state: UpgradeWebPurchaseState,
  web: UpgradeWeb,
  category: string,
  subcategory: string,
  prestigeFilledNodes?: Set<string>,
): NodeDisplayInfo[] {
  const nodes = getNodesForPath(web, category, subcategory);
  const categories = getUpgradeCategories();
  const subDef = categories[category]?.subcategories?.[subcategory];

  return nodes.map((node) => ({
    id: node.id,
    name: node.name,
    cost: node.cost,
    effect: node.effect,
    effectLabel: subDef
      ? `+${Math.round(node.effect * 100)}% ${subDef.label}`
      : `+${Math.round(node.effect * 100)}%`,
    state: getNodeDisplayState(state, node, prestigeFilledNodes),
    tier: node.tier,
    category: node.category,
    subcategory: node.subcategory,
  }));
}

export function getDiamondDisplayInfo(
  state: UpgradeWebPurchaseState,
  diamond: DiamondNode,
): DiamondDisplayInfo {
  const purchased = state.purchasedDiamonds.has(diamond.id);
  const prereqsMet = isDiamondNodeUnlocked(diamond.requires, state.highestTiers);

  let nodeState: NodeDisplayState;
  if (purchased) nodeState = 'purchased';
  else if (prereqsMet) nodeState = 'available';
  else nodeState = 'locked';

  const prerequisites: DiamondDisplayInfo['prerequisites'] = [];
  for (const [cat, subs] of Object.entries(diamond.requires)) {
    for (const [sub, minTier] of Object.entries(subs)) {
      const pathKey = `${cat}_${sub}`;
      prerequisites.push({
        path: pathKey,
        requiredTier: minTier,
        currentTier: state.highestTiers.get(pathKey) ?? 0,
      });
    }
  }

  return {
    id: diamond.id,
    label: diamond.label,
    cost: diamond.cost,
    effectDescription: formatDiamondEffect(diamond),
    state: nodeState,
    prerequisitesMet: prereqsMet,
    prerequisites,
  };
}

// ── Aggregate Stats ──────────────────────────────────────────────

/** Compute total stat effects from all purchased nodes. */
export function computeActiveEffects(
  state: UpgradeWebPurchaseState,
  web: UpgradeWeb,
): Map<string, number> {
  const effects = new Map<string, number>();
  for (const nodeId of state.purchasedNodes) {
    const node = web.nodeMap.get(nodeId);
    if (!node) continue;
    const key = `${node.category}_${node.subcategory}`;
    effects.set(key, (effects.get(key) ?? 0) + node.effect);
  }
  return effects;
}

/** Count total purchased nodes (linear + diamond). */
export function countPurchased(state: UpgradeWebPurchaseState): {
  linear: number;
  diamond: number;
  total: number;
} {
  const linear = state.purchasedNodes.size;
  const diamond = state.purchasedDiamonds.size;
  return { linear, diamond, total: linear + diamond };
}

// ── Starting Tier Auto-Fill ─────────────────────────────────────

/**
 * Pre-fill all linear nodes up to the starting tier rank (free, no Clam cost).
 * Nodes filled this way are marked as purchased in the state and should
 * display as 'prestige' state (gold, not re-purchasable).
 *
 * @param state - The upgrade web purchase state to mutate
 * @param web - The full upgrade web catalog
 * @param startingTierRank - The prestige starting tier rank (0 = none, 1 = tier 0, etc.)
 * @returns Set of node IDs that were auto-filled by prestige
 */
export function autoFillToStartingTier(
  state: UpgradeWebPurchaseState,
  web: UpgradeWeb,
  startingTierRank: number,
): Set<string> {
  const filled = new Set<string>();
  if (startingTierRank <= 0) return filled;

  // Starting tier rank N means tiers 0..(N-1) are free
  const maxTierIndex = startingTierRank - 1;

  for (const node of web.nodes) {
    if (node.tier <= maxTierIndex && !state.purchasedNodes.has(node.id)) {
      state.purchasedNodes.add(node.id);
      filled.add(node.id);

      // Update highest tiers for diamond prereq tracking
      const pathKey = `${node.category}_${node.subcategory}`;
      const tierLevel = node.tier + 1;
      const currentHighest = state.highestTiers.get(pathKey) ?? 0;
      if (tierLevel > currentHighest) state.highestTiers.set(pathKey, tierLevel);
    }
  }

  return filled;
}

// ── Internal Helpers ─────────────────────────────────────────────

function formatDiamondEffect(diamond: DiamondNode): string {
  const effect = diamond.effect;
  switch (effect.type) {
    case 'lodge_wing':
      return `Unlock ${effect.wing} wing on Lodge`;
    case 'unlock_specialist':
      return `Unlock ${effect.unit} specialist unit`;
    case 'auto_behavior':
      return `Enable ${effect.behavior}`;
    case 'multiplier':
      return `${effect.stat} x${effect.value}`;
    default:
      return 'Special unlock';
  }
}
