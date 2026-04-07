/**
 * v3 Progression System Tests
 *
 * T38: Rewards Clam calculation matches formula
 * T39: Upgrade effects apply in-game
 * T40: Prestige flow verification (buy upgrades, prestige, verify reset)
 * T41: Specialist auto-deploy at match start from Pearl upgrades
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  canPrestige,
  createPrestigeState,
  executePrestige,
  getAutoDeployUnits,
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

    // 2. Buy 3 upgrades: auto_deploy_fisher (cost 3 each)
    let result = purchasePearlUpgrade(state, 'auto_deploy_fisher');
    expect(result.result.success).toBe(true);
    state = result.state;

    result = purchasePearlUpgrade(state, 'auto_deploy_fisher');
    expect(result.result.success).toBe(true);
    state = result.state;

    result = purchasePearlUpgrade(state, 'auto_deploy_fisher');
    expect(result.result.success).toBe(true);
    state = result.state;

    expect(state.upgradeRanks.auto_deploy_fisher).toBe(3);
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
    expect(newState.upgradeRanks.auto_deploy_fisher).toBe(3);

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

// ── T41: Specialist auto-deploy from Pearl upgrades ─────────────

describe('T41: Specialist auto-deploy', () => {
  let _world: GameWorld;

  beforeEach(() => {
    _world = createGameWorld();
  });

  it('spawns 3 fishers when auto_deploy_fisher rank is 3', () => {
    // Set up prestige state with auto_deploy_fisher rank 3
    const prestigeState: PrestigeState = {
      rank: 1,
      pearls: 20,
      totalPearlsEarned: 50,
      upgradeRanks: { auto_deploy_fisher: 3 },
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

  it('auto-deploy units from prestige state resolve to correct kinds', () => {
    const prestigeState: PrestigeState = {
      rank: 2,
      pearls: 30,
      totalPearlsEarned: 80,
      upgradeRanks: {
        auto_deploy_fisher: 2,
        auto_deploy_guardian: 1,
      },
    };

    const deploySpecs = getAutoDeployUnits(prestigeState);
    expect(deploySpecs.length).toBe(2);

    const fisher = deploySpecs.find((s) => s.unitId === 'fisher');
    expect(fisher).toBeTruthy();
    expect(fisher?.count).toBe(2);

    const guardian = deploySpecs.find((s) => s.unitId === 'guardian');
    expect(guardian).toBeTruthy();
    expect(guardian?.count).toBe(1);
  });

  it('no specialists deployed with empty prestige state', () => {
    const prestigeState = createPrestigeState();
    const plan = computeSpecialistDeployPlan(prestigeState);

    expect(plan.totalCount).toBe(0);
    expect(plan.spawns.length).toBe(0);
  });

  it('multiple auto-deploy upgrades combine correctly', () => {
    const prestigeState: PrestigeState = {
      rank: 3,
      pearls: 50,
      totalPearlsEarned: 100,
      upgradeRanks: {
        auto_deploy_fisher: 3,
        auto_deploy_digger: 2,
        auto_deploy_guardian: 1,
        auto_deploy_shaman: 1,
      },
    };

    const plan = computeSpecialistDeployPlan(prestigeState);

    // 3 + 2 + 1 + 1 = 7 total specialists
    expect(plan.totalCount).toBe(7);
    expect(plan.spawns.length).toBe(4);
    expect(plan.summary.length).toBe(4);
  });
});
