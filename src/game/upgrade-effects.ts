/**
 * Upgrade Effects Application (v3.0 -- T39)
 *
 * Reads purchased upgrade web effects from store-v3 and applies them
 * as world modifiers at game init. Also applies Pearl upgrade multipliers.
 */

import { getStatMultiplier, type PrestigeState } from '@/config/prestige-logic';
import { generateUpgradeWeb } from '@/config/upgrade-web';
import type { GameWorld } from '@/ecs/world';
import {
  computeActiveEffects,
  createUpgradeWebState,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';

/**
 * Apply upgrade web effects and Pearl multipliers to the game world.
 *
 * Called once at game init, after world creation but before entity spawning.
 * Reads purchased nodes and accumulates stat bonuses into world modifiers.
 */
export function applyUpgradeEffects(
  world: GameWorld,
  upgradeState: UpgradeWebPurchaseState,
  prestigeState: PrestigeState,
): void {
  const web = generateUpgradeWeb();
  const effects = computeActiveEffects(upgradeState, web);

  // Gathering bonuses: all gathering subcategories boost gatherSpeedMod
  const fishGather = effects.get('gathering_fish_gathering') ?? 0;
  const rockGather = effects.get('gathering_rock_gathering') ?? 0;
  const logGather = effects.get('gathering_log_gathering') ?? 0;
  const avgGatherBonus = (fishGather + rockGather + logGather) / 3;
  if (avgGatherBonus > 0) {
    world.gatherSpeedMod *= 1 + avgGatherBonus;
  }

  // Resource yield bonus from economy_node_yield
  const nodeYield = effects.get('economy_node_yield') ?? 0;
  if (nodeYield > 0) {
    world.rewardsModifier *= 1 + nodeYield;
  }

  const clamBonus = effects.get('economy_clam_bonus') ?? 0;
  if (clamBonus > 0) {
    world.clamRewardMultiplier *= 1 + clamBonus;
  }

  // Pearl upgrade multipliers (prestige-persistent)
  const gatherMult = getStatMultiplier(prestigeState, 'gathering_speed');
  if (gatherMult > 1.0) {
    world.gatherSpeedMod *= gatherMult;
  }

  const damageMult = getStatMultiplier(prestigeState, 'damage');
  if (damageMult > 1.0) {
    world.playerUnitDamageMultiplier *= damageMult;
  }

  const hpMult = getStatMultiplier(prestigeState, 'hp');
  if (hpMult > 1.0) {
    world.playerUnitHpMultiplier *= hpMult;
  }

  const clamEarningsMult = getStatMultiplier(prestigeState, 'clam_earnings');
  if (clamEarningsMult > 1.0) {
    world.clamRewardMultiplier *= clamEarningsMult;
  }
}

/**
 * Build an UpgradeWebPurchaseState from a set of purchased node IDs.
 * Used to reconstruct state from persisted data.
 */
export function buildUpgradeStateFromPurchased(
  purchasedNodeIds: string[],
  clams: number,
): UpgradeWebPurchaseState {
  const state = createUpgradeWebState(clams);
  const web = generateUpgradeWeb();

  for (const nodeId of purchasedNodeIds) {
    const node = web.nodeMap.get(nodeId);
    if (node) {
      state.purchasedNodes.add(nodeId);
      const pathKey = `${node.category}_${node.subcategory}`;
      const tierLevel = node.tier + 1;
      const current = state.highestTiers.get(pathKey) ?? 0;
      if (tierLevel > current) state.highestTiers.set(pathKey, tierLevel);
    }
  }

  return state;
}
