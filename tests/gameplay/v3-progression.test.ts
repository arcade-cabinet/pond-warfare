/**
 * v3 Progression System Tests
 *
 * T38: Rewards Clam calculation matches formula
 * T39: Upgrade effects apply in-game
 * T40: Prestige flow verification (buy upgrades, prestige, verify reset)
 * T41: Specialist blueprint caps from Pearl upgrades
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  canPrestige,
  createPrestigeState,
  executePrestige,
  getSpecialistBlueprints,
  nextPrestigeThreshold,
  type PrestigeState,
  purchasePearlUpgrade,
} from '@/config/prestige-logic';
import { generateUpgradeWeb } from '@/config/upgrade-web';
import {
  computeSpecialistDeployPlan,
  getSpecialistSpawnPositions,
} from '@/ecs/systems/specialist-deploy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { calculateMatchReward, type MatchStats } from '@/game/match-rewards';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { createUpgradeWebState, purchaseNode } from '@/ui/upgrade-web-state';

// ── T38: Rewards Clam calculation matches formula ────────────────

describe('T38: Rewards Clam calculation', () => {
  it('calculates correct Clams for known match stats', () => {
    // Formula from rewards.json:
    // base_clams=20, kill_bonus=2, event_bonus=6, resource_bonus_per_100=8, survival_bonus_per_minute=4
    // 10 kills, 5 events, 3 minutes = 180 seconds, rank 0
    // Expected: 20 + (10 * 2) + (5 * 6) + floor(500/100) * 8 + (3 * 4) = 122
    const stats: MatchStats = {
      result: 'win',
      durationSeconds: 180,
      kills: 10,
      resourcesGathered: 500,
      eventsCompleted: 5,
      prestigeRank: 0,
    };

    const breakdown = calculateMatchReward(stats);

    expect(breakdown.base).toBe(20);
    expect(breakdown.killBonus).toBe(20);
    expect(breakdown.eventBonus).toBe(30);
    expect(breakdown.resourceBonus).toBe(40);
    expect(breakdown.survivalBonus).toBe(12);
    expect(breakdown.subtotal).toBe(122);
    expect(breakdown.prestigeMultiplier).toBe(1.0);
    expect(breakdown.totalClams).toBe(122);
    expect(breakdown.isWin).toBe(true);
  });

  it('applies prestige multiplier correctly', () => {
    const stats: MatchStats = {
      result: 'win',
      durationSeconds: 180,
      kills: 10,
      resourcesGathered: 500,
      eventsCompleted: 5,
      prestigeRank: 2,
    };

    const breakdown = calculateMatchReward(stats);

    // Prestige multiplier: 1 + 2 * 0.1 = 1.2
    expect(breakdown.prestigeMultiplier).toBe(1.2);
    // 122 * 1.2 = 146.4, floored to 146
    expect(breakdown.totalClams).toBe(146);
  });

  it('applies loss penalty (x0.5)', () => {
    const stats: MatchStats = {
      result: 'loss',
      durationSeconds: 180,
      kills: 10,
      resourcesGathered: 500,
      eventsCompleted: 5,
      prestigeRank: 0,
    };

    const breakdown = calculateMatchReward(stats);

    expect(breakdown.isWin).toBe(false);
    // 122 * 0.5 = 61
    expect(breakdown.totalClams).toBe(61);
  });

  it('handles zero stats (base clams only)', () => {
    const stats: MatchStats = {
      result: 'win',
      durationSeconds: 0,
      kills: 0,
      resourcesGathered: 0,
      eventsCompleted: 0,
      prestigeRank: 0,
    };

    const breakdown = calculateMatchReward(stats);

    expect(breakdown.base).toBe(20);
    expect(breakdown.killBonus).toBe(0);
    expect(breakdown.eventBonus).toBe(0);
    expect(breakdown.resourceBonus).toBe(0);
    expect(breakdown.survivalBonus).toBe(0);
    expect(breakdown.totalClams).toBe(20);
  });
});

// ── T39: Upgrade effects apply in-game ──────────────────────────

describe('T39: Upgrade effects apply in-game', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('applies gathering upgrade bonus to gatherSpeedMod', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    // Purchase first 3 tiers of fish_gathering
    purchaseNode(state, web, 'gathering_fish_gathering_t0');
    purchaseNode(state, web, 'gathering_fish_gathering_t1');
    purchaseNode(state, web, 'gathering_fish_gathering_t2');

    const prestState = createPrestigeState();
    const origMod = world.gatherSpeedMod;

    applyUpgradeEffects(world, state, prestState);

    expect(world.gatherSpeedMod).toBeGreaterThan(origMod);
  });

  it('applies a single Fish Gathering tier at full listed strength', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'gathering_fish_gathering_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.gatherSpeedMod).toBeCloseTo(1.1, 2);
  });

  it('applies Pearl gathering multiplier to gatherSpeedMod', () => {
    const state = createUpgradeWebState(0);

    // Pearl upgrade: gathering_speed multiplier at rank 2 = 1.0 + 0.05*2 = 1.10
    const prestState: PrestigeState = {
      rank: 1,
      pearls: 10,
      totalPearlsEarned: 20,
      upgradeRanks: { gather_multiplier: 2 },
    };

    const origMod = world.gatherSpeedMod;

    applyUpgradeEffects(world, state, prestState);

    // Should be 1.0 * 1.10 = 1.10
    expect(world.gatherSpeedMod).toBeCloseTo(1.1, 2);
    expect(world.gatherSpeedMod).toBeGreaterThan(origMod);
  });

  it('applies Pearl damage multiplier to playerUnitDamageMultiplier', () => {
    const state = createUpgradeWebState(0);
    const prestState: PrestigeState = {
      rank: 1,
      pearls: 10,
      totalPearlsEarned: 10,
      upgradeRanks: { combat_multiplier: 1 },
    };

    applyUpgradeEffects(world, state, prestState);

    expect(world.playerUnitDamageMultiplier).toBeCloseTo(1.1, 2);
  });

  it('applies Pearl HP multiplier to playerUnitHpMultiplier', () => {
    const state = createUpgradeWebState(0);
    const prestState: PrestigeState = {
      rank: 1,
      pearls: 10,
      totalPearlsEarned: 10,
      upgradeRanks: { hp_multiplier: 1 },
    };

    applyUpgradeEffects(world, state, prestState);

    expect(world.playerUnitHpMultiplier).toBeCloseTo(1.2, 2);
  });

  it('empty upgrade state does not change world modifiers', () => {
    const state = createUpgradeWebState(0);
    const prestState = createPrestigeState();

    applyUpgradeEffects(world, state, prestState);

    expect(world.gatherSpeedMod).toBe(1.0);
    expect(world.rewardsModifier).toBe(1.0);
  });

  it('applies economy node_yield bonus to rewardsModifier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'economy_node_yield_t0');

    const prestState = createPrestigeState();
    applyUpgradeEffects(world, state, prestState);

    expect(world.rewardsModifier).toBeGreaterThan(1.0);
  });

  it('applies economy clam bonus to clamRewardMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'economy_clam_bonus_t0');

    const prestState = createPrestigeState();
    applyUpgradeEffects(world, state, prestState);

    expect(world.clamRewardMultiplier).toBeGreaterThan(1.0);
  });

  it('applies combat attack power to playerUnitDamageMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'combat_attack_power_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerUnitDamageMultiplier).toBeCloseTo(1.08, 2);
  });

  it('applies combat attack speed to playerAttackSpeedMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'combat_attack_speed_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerAttackSpeedMultiplier).toBeCloseTo(1.08, 2);
  });

  it('applies gathering carry capacity to playerCarryCapacityMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'gathering_carry_capacity_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerCarryCapacityMultiplier).toBeCloseTo(1.1, 2);
  });

  it('applies utility unit speed to playerUnitSpeedMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'utility_unit_speed_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerUnitSpeedMultiplier).toBeCloseTo(1.03, 2);
  });

  it('applies utility heal power to playerHealMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'utility_heal_power_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerHealMultiplier).toBeCloseTo(1.05, 2);
  });

  it('applies utility train speed to playerTrainSpeedMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'utility_train_speed_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerTrainSpeedMultiplier).toBeCloseTo(1.04, 2);
  });

  it('applies defense tower damage to playerTowerDamageMultiplier', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(10000);

    purchaseNode(state, web, 'defense_tower_damage_t0');

    applyUpgradeEffects(world, state, createPrestigeState());

    expect(world.playerTowerDamageMultiplier).toBeCloseTo(1.08, 2);
  });
});

// ── T40: Prestige flow verification ───────────���─────────────────

describe('T40: Prestige flow', () => {
  it('buy 3 upgrades, prestige, verify reset/persist', () => {
    // 1. Start with fresh state and give enough pearls
    let state: PrestigeState = {
      rank: 0,
      pearls: 50,
      totalPearlsEarned: 50,
      upgradeRanks: {},
    };

    // 2. Buy 3 upgrades: blueprint_fisher (cost 3 each)
    let result = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.result.success).toBe(true);
    state = result.state;

    result = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.result.success).toBe(true);
    state = result.state;

    result = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.result.success).toBe(true);
    state = result.state;

    expect(state.upgradeRanks.blueprint_fisher).toBe(3);
    expect(state.pearls).toBe(50 - 9); // 3 * 3 = 9

    // 3. Execute prestige at progression level 25
    const progressionLevel = 25;
    const { state: newState, result: prestigeResult } = executePrestige(state, progressionLevel);

    // 4. Verify rank incremented
    expect(prestigeResult.newRank).toBe(1);
    expect(newState.rank).toBe(1);

    // 5. Verify Pearls awarded (floor(25 * 0.5 * (1 + 0 * 0.1)) = 12)
    expect(prestigeResult.pearlsEarned).toBe(12);
    expect(newState.pearls).toBe(41 + 12); // previous pearls + earned

    // 6. Verify Pearl upgrades PRESERVED (not reset)
    expect(newState.upgradeRanks.blueprint_fisher).toBe(3);

    // 7. Verify what resets vs persists is documented
    expect(prestigeResult.resets).toContain('clam_upgrades');
    expect(prestigeResult.resets).toContain('current_run');
    expect(prestigeResult.persists).toContain('pearl_upgrades');
    expect(prestigeResult.persists).toContain('rank');
  });

  it('cannot prestige below threshold', () => {
    // rank 0, threshold = 20
    // progression level 10 < 20 -- should not be able to prestige
    expect(canPrestige(10, 0)).toBe(false);
    expect(canPrestige(20, 0)).toBe(true);
  });

  it('prestige threshold scales with rank', () => {
    // rank 0: 20 * (1 + 0 * 0.5) = 20
    expect(nextPrestigeThreshold(0)).toBe(20);
    // rank 1: 20 * (1 + 1 * 0.5) = 30
    expect(nextPrestigeThreshold(1)).toBe(30);
    // rank 2: 20 * (1 + 2 * 0.5) = 40
    expect(nextPrestigeThreshold(2)).toBe(40);
  });
});

// ── T41: Specialist blueprint caps from Pearl upgrades ──────────

describe('T41: Specialist blueprints', () => {
  let _world: GameWorld;

  beforeEach(() => {
    _world = createGameWorld();
  });

  it('computes 3 fisher field slots when blueprint_fisher rank is 3', () => {
    // Set up prestige state with blueprint_fisher rank 3
    const prestigeState: PrestigeState = {
      rank: 1,
      pearls: 20,
      totalPearlsEarned: 50,
      upgradeRanks: { blueprint_fisher: 3 },
    };

    // Verify the deploy plan
    const plan = computeSpecialistDeployPlan(prestigeState);
    expect(plan.totalCount).toBe(3);
    expect(plan.spawns.length).toBe(1);
    expect(plan.spawns[0].unitId).toBe('fisher');
    expect(plan.spawns[0].count).toBe(3);
  });

  it('computes correct spawn positions near lodge', () => {
    const lodgeX = 500;
    const lodgeY = 500;
    const positions = getSpecialistSpawnPositions(lodgeX, lodgeY, 3);

    expect(positions.length).toBe(3);
    // All positions should be within 100px of the lodge
    for (const pos of positions) {
      const dist = Math.sqrt((pos.x - lodgeX) ** 2 + (pos.y - lodgeY) ** 2);
      expect(dist).toBeLessThan(100);
    }
  });

  it('blueprint units from prestige state resolve to correct kinds', () => {
    const prestigeState: PrestigeState = {
      rank: 2,
      pearls: 30,
      totalPearlsEarned: 80,
      upgradeRanks: {
        blueprint_fisher: 2,
        blueprint_guard: 1,
      },
    };

    const deploySpecs = getSpecialistBlueprints(prestigeState);
    expect(deploySpecs.length).toBe(2);

    const fisher = deploySpecs.find((s) => s.unitId === 'fisher');
    expect(fisher).toBeTruthy();
    expect(fisher?.cap).toBe(2);

    const guard = deploySpecs.find((s) => s.unitId === 'guard');
    expect(guard).toBeTruthy();
    expect(guard?.cap).toBe(1);
  });

  it('no specialists deployed with empty prestige state', () => {
    const prestigeState = createPrestigeState();
    const plan = computeSpecialistDeployPlan(prestigeState);

    expect(plan.totalCount).toBe(0);
    expect(plan.spawns.length).toBe(0);
  });

  it('multiple blueprint upgrades combine correctly', () => {
    const prestigeState: PrestigeState = {
      rank: 3,
      pearls: 50,
      totalPearlsEarned: 100,
      upgradeRanks: {
        blueprint_fisher: 3,
        blueprint_digger: 2,
        blueprint_guard: 1,
        blueprint_shaman: 1,
      },
    };

    const plan = computeSpecialistDeployPlan(prestigeState);

    // 3 + 2 + 1 + 1 = 7 total specialists
    expect(plan.totalCount).toBe(7);
    expect(plan.spawns.length).toBe(4);
    expect(plan.summary.length).toBe(4);
  });
});
