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
  const strongestGatherBonus = Math.max(fishGather, rockGather, logGather);
  if (strongestGatherBonus > 0) {
    world.gatherSpeedMod *= 1 + strongestGatherBonus;
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

  const attackPower = effects.get('combat_attack_power') ?? 0;
  if (attackPower > 0) {
    world.playerUnitDamageMultiplier *= 1 + attackPower;
  }

  const armor = effects.get('combat_armor') ?? 0;
  if (armor > 0) {
    world.playerDamageTakenMultiplier *= Math.max(0.1, 1 - armor);
  }

  const attackSpeed = effects.get('combat_attack_speed') ?? 0;
  if (attackSpeed > 0) {
    world.playerAttackSpeedMultiplier *= 1 + attackSpeed;
  }

  const criticalHit = effects.get('combat_critical_hit') ?? 0;
  if (criticalHit > 0) {
    world.playerCriticalHitChance = Math.min(0.95, world.playerCriticalHitChance + criticalHit);
  }

  const carryCapacity = effects.get('gathering_carry_capacity') ?? 0;
  if (carryCapacity > 0) {
    world.playerCarryCapacityMultiplier *= 1 + carryCapacity;
  }

  const gatherRadius = effects.get('economy_gather_radius') ?? 0;
  if (gatherRadius > 0) {
    world.playerGatherRadiusMultiplier *= 1 + gatherRadius;
  }

  const unitCostReduction = effects.get('economy_unit_cost_reduction') ?? 0;
  if (unitCostReduction > 0) {
    world.playerUnitCostMultiplier *= Math.max(0.1, 1 - unitCostReduction);
  }

  const unitSpeed = effects.get('utility_unit_speed') ?? 0;
  if (unitSpeed > 0) {
    world.playerUnitSpeedMultiplier *= 1 + unitSpeed;
  }

  const healPower = effects.get('utility_heal_power') ?? 0;
  if (healPower > 0) {
    world.playerHealMultiplier *= 1 + healPower;
  }

  const trainSpeed = effects.get('utility_train_speed') ?? 0;
  if (trainSpeed > 0) {
    world.playerTrainSpeedMultiplier *= 1 + trainSpeed;
  }

  const towerDamage = effects.get('defense_tower_damage') ?? 0;
  if (towerDamage > 0) {
    world.playerTowerDamageMultiplier *= 1 + towerDamage;
  }

  const lodgeHp = effects.get('defense_lodge_hp') ?? 0;
  if (lodgeHp > 0) {
    world.playerLodgeHpMultiplier *= 1 + lodgeHp;
  }

  const wallHp = effects.get('defense_wall_hp') ?? 0;
  if (wallHp > 0) {
    world.playerWallHpMultiplier *= 1 + wallHp;
  }

  const repairSpeed = effects.get('defense_repair_speed') ?? 0;
  if (repairSpeed > 0) {
    world.playerRepairSpeedMultiplier *= 1 + repairSpeed;
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
