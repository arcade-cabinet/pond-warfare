/**
 * Upgrade Web Catalog Generator
 *
 * Generates the full 240+ upgrade catalog from configs/upgrades.json
 * definitions. Each subcategory produces `tiers_per_subcategory` nodes,
 * and diamond nodes connect multiple paths with special unlock effects.
 *
 * Formulas:
 *   Cost:   base_cost * 2^tier  (exponential scaling)
 *   Effect: base_effect * (tier + 1)  (linear stat scaling)
 *   Name:   "{tier_prefix} {subcategory_label}" e.g. "Super Fish Gathering"
 */

import {
  generateUpgradeCatalog,
  getDiamondNodeIds,
  getDiamondNodes,
  getTiersPerSubcategory,
  getUpgradeCategories,
} from './config-loader';
import type { DiamondNodeDef, DiamondNodeEffect } from './v3-types';

// ── Upgrade Node Types ────────────────────────────────────────────

/** A single upgrade node in the web (one tier of one subcategory). */
export interface UpgradeNode {
  /** Unique ID: "{category}_{subcategory}_t{tier}" */
  id: string;
  /** Category key from upgrades.json. */
  category: string;
  /** Subcategory key from upgrades.json. */
  subcategory: string;
  /** Tier index (0 = Basic, 9 = Transcendent). */
  tier: number;
  /** Display name: "{prefix} {subcategory_label}". */
  name: string;
  /** Clam cost to purchase this node. */
  cost: number;
  /** Stat effect value at this tier. */
  effect: number;
  /** Previous tier node ID (null for tier 0). */
  prerequisite: string | null;
}

/** A diamond node connecting multiple upgrade paths. */
export interface DiamondNode {
  /** Diamond node ID from upgrades.json. */
  id: string;
  /** Display label. */
  label: string;
  /** Requirements: { category: { subcategory: minTier } }. */
  requires: Record<string, Record<string, number>>;
  /** Unlock effect (lodge wing, specialist, behavior, multiplier). */
  effect: DiamondNodeEffect;
  /** Clam cost to purchase. */
  cost: number;
  /** Computed prerequisite node IDs (the tier nodes that must be purchased). */
  prerequisiteNodeIds: string[];
}

/** The full upgrade web catalog. */
export interface UpgradeWeb {
  /** All linear upgrade nodes (240 = 6 categories * 4 subcategories * 10 tiers). */
  nodes: UpgradeNode[];
  /** All diamond nodes connecting paths. */
  diamondNodes: DiamondNode[];
  /** Total node count (linear + diamond). */
  totalCount: number;
  /** Lookup map: node ID -> UpgradeNode. */
  nodeMap: Map<string, UpgradeNode>;
  /** Lookup map: diamond node ID -> DiamondNode. */
  diamondMap: Map<string, DiamondNode>;
}

// ── Generator ─────────────────────────────────────────────────────

/**
 * Generate the full upgrade web from config data.
 *
 * Produces linear upgrade paths (6 categories * ~4 subcategories * 10 tiers)
 * plus diamond nodes that connect multiple paths.
 */
export function generateUpgradeWeb(): UpgradeWeb {
  const rawCatalog = generateUpgradeCatalog();
  const nodeMap = new Map<string, UpgradeNode>();

  // Build linear nodes with prerequisite chains
  const nodes: UpgradeNode[] = rawCatalog.map((raw) => {
    const prerequisite =
      raw.tier > 0 ? `${raw.category}_${raw.subcategory}_t${raw.tier - 1}` : null;

    const node: UpgradeNode = {
      id: raw.id,
      category: raw.category,
      subcategory: raw.subcategory,
      tier: raw.tier,
      name: raw.name,
      cost: raw.cost,
      effect: raw.effect,
      prerequisite,
    };

    nodeMap.set(node.id, node);
    return node;
  });

  // Build diamond nodes with computed prerequisite IDs
  const diamondNodeDefs = getDiamondNodes();
  const diamondMap = new Map<string, DiamondNode>();

  const diamondNodes: DiamondNode[] = getDiamondNodeIds().map((id) => {
    const def = diamondNodeDefs[id] as DiamondNodeDef;
    const prerequisiteNodeIds = computeDiamondPrereqs(def.requires);

    const diamond: DiamondNode = {
      id,
      label: def.label,
      requires: def.requires,
      effect: def.effect,
      cost: def.cost,
      prerequisiteNodeIds,
    };

    diamondMap.set(id, diamond);
    return diamond;
  });

  return {
    nodes,
    diamondNodes,
    totalCount: nodes.length + diamondNodes.length,
    nodeMap,
    diamondMap,
  };
}

/**
 * Check if a diamond node's requirements are met given purchased tiers.
 *
 * @param requires - Diamond node requirements from config
 * @param purchasedTiers - Map of "category_subcategory" -> highest purchased tier
 */
export function isDiamondNodeUnlocked(
  requires: Record<string, Record<string, number>>,
  purchasedTiers: Map<string, number>,
): boolean {
  for (const [category, subcats] of Object.entries(requires)) {
    for (const [subcategory, minTier] of Object.entries(subcats)) {
      const key = `${category}_${subcategory}`;
      const currentTier = purchasedTiers.get(key) ?? -1;
      if (currentTier < minTier) return false;
    }
  }
  return true;
}

/**
 * Get the cost of an upgrade at a specific tier.
 * Uses the formula: base_cost * 2^tier
 */
export function computeUpgradeCost(baseCost: number, tier: number): number {
  return Math.round(baseCost * 2 ** tier);
}

/**
 * Get the effect value of an upgrade at a specific tier.
 * Uses the formula: base_effect * (tier + 1)
 */
export function computeUpgradeEffect(baseEffect: number, tier: number): number {
  return baseEffect * (tier + 1);
}

/**
 * Get all upgrade nodes for a specific category.
 */
export function getNodesForCategory(web: UpgradeWeb, category: string): UpgradeNode[] {
  return web.nodes.filter((n) => n.category === category);
}

/**
 * Get all upgrade nodes for a specific subcategory path.
 */
export function getNodesForPath(
  web: UpgradeWeb,
  category: string,
  subcategory: string,
): UpgradeNode[] {
  return web.nodes
    .filter((n) => n.category === category && n.subcategory === subcategory)
    .sort((a, b) => a.tier - b.tier);
}

/**
 * Get all diamond nodes that depend on a specific category.
 */
export function getDiamondsForCategory(web: UpgradeWeb, category: string): DiamondNode[] {
  return web.diamondNodes.filter((d) => category in d.requires);
}

/**
 * Get a summary of the upgrade web for debugging/display.
 */
export function getWebSummary(web: UpgradeWeb): {
  categories: number;
  subcategories: number;
  tiersPerSub: number;
  linearNodes: number;
  diamondNodes: number;
  totalNodes: number;
} {
  const categories = getUpgradeCategories();
  const catCount = Object.keys(categories).length;
  let subCount = 0;
  for (const cat of Object.values(categories)) {
    subCount += Object.keys(cat.subcategories).length;
  }

  return {
    categories: catCount,
    subcategories: subCount,
    tiersPerSub: getTiersPerSubcategory(),
    linearNodes: web.nodes.length,
    diamondNodes: web.diamondNodes.length,
    totalNodes: web.totalCount,
  };
}

// ── Internal helpers ──────────────────────────────────────────────

/**
 * Compute the prerequisite node IDs for a diamond node.
 * Each requirement like { gathering: { fish_gathering: 5 } }
 * translates to node ID "gathering_fish_gathering_t4" (tier is 0-indexed,
 * so tier 5 means t4 must be purchased).
 */
function computeDiamondPrereqs(requires: Record<string, Record<string, number>>): string[] {
  const prereqs: string[] = [];
  for (const [category, subcats] of Object.entries(requires)) {
    for (const [subcategory, minTier] of Object.entries(subcats)) {
      // minTier is the tier level needed; the node ID uses 0-based index
      // So tier 5 means t0 through t4 must be purchased
      prereqs.push(`${category}_${subcategory}_t${minTier - 1}`);
    }
  }
  return prereqs;
}
