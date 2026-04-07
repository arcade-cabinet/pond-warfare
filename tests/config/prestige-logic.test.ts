/**
 * Prestige Pearl logic tests.
 *
 * Validates prestige system from configs/prestige.json:
 * - Pearl calculation formula
 * - Specialist blueprint caps at each rank
 * - Auto-behavior unlocks
 * - Stat multipliers
 * - Pearl upgrade purchase logic
 * - Prestige execution (rank up)
 */

import { describe, expect, it } from 'vitest';
import {
  calculatePearlReward,
  getPrestigeConfig,
  getPrestigeThreshold,
} from '@/config/config-loader';
import {
  canPrestige,
  createPrestigeState,
  executePrestige,
  getPearlUpgradeDisplayList,
  getSpecialistBlueprintCap,
  getSpecialistBlueprints,
  getStatMultiplier,
  getStatMultipliers,
  getUnlockedAutoBehaviors,
  isAutoBehaviorUnlocked,
  nextPrestigeThreshold,
  type PrestigeState,
  pearlsForPrestige,
  purchasePearlUpgrade,
} from '@/config/prestige-logic';

describe('Pearl calculation', () => {
  it('should calculate Pearls using formula: floor(level * multiplier * (1 + rank * 0.1))', () => {
    const config = getPrestigeConfig();
    const _multiplier = config.pearl_formula.rank_multiplier;

    expect(pearlsForPrestige(20, 0)).toBe(10);
    expect(pearlsForPrestige(20, 1)).toBe(11);
    expect(pearlsForPrestige(50, 5)).toBe(37);
    expect(pearlsForPrestige(0, 10)).toBe(0);
  });

  it('should match calculatePearlReward from config-loader', () => {
    for (let level = 0; level <= 100; level += 10) {
      for (let rank = 0; rank <= 5; rank++) {
        expect(pearlsForPrestige(level, rank)).toBe(calculatePearlReward(level, rank));
      }
    }
  });
});

describe('Prestige threshold', () => {
  it('should calculate threshold using formula from config', () => {
    const _base = getPrestigeConfig().rank_threshold_base;

    expect(nextPrestigeThreshold(0)).toBe(20);
    expect(nextPrestigeThreshold(1)).toBe(30);
    expect(nextPrestigeThreshold(2)).toBe(40);
  });

  it('should match getPrestigeThreshold from config-loader', () => {
    for (let rank = 0; rank <= 20; rank++) {
      expect(nextPrestigeThreshold(rank)).toBe(getPrestigeThreshold(rank));
    }
  });

  it('canPrestige returns false below threshold', () => {
    expect(canPrestige(19, 0)).toBe(false);
  });

  it('canPrestige returns true at threshold', () => {
    expect(canPrestige(20, 0)).toBe(true);
  });

  it('canPrestige returns true above threshold', () => {
    expect(canPrestige(50, 0)).toBe(true);
  });
});

describe('Specialist blueprint cap calculations', () => {
  it('should return empty list for new player', () => {
    const state = createPrestigeState();
    const blueprints = getSpecialistBlueprints(state);
    expect(blueprints).toHaveLength(0);
  });

  it('should return correct cap for single upgrade', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: { blueprint_fisher: 3 },
    };

    const blueprints = getSpecialistBlueprints(state);
    const fisher = blueprints.find((d) => d.unitId === 'fisher');
    expect(fisher).toBeDefined();
    expect(fisher?.cap).toBe(3);
  });

  it('should return correct caps for multiple upgrades', () => {
    const state: PrestigeState = {
      rank: 3,
      pearls: 0,
      totalPearlsEarned: 50,
      upgradeRanks: {
        blueprint_fisher: 5,
        blueprint_digger: 2,
        blueprint_guard: 1,
      },
    };

    const blueprints = getSpecialistBlueprints(state);
    expect(blueprints.length).toBe(3);

    expect(getSpecialistBlueprintCap(state, 'fisher')).toBe(5);
    expect(getSpecialistBlueprintCap(state, 'digger')).toBe(2);
    expect(getSpecialistBlueprintCap(state, 'guard')).toBe(1);
    expect(getSpecialistBlueprintCap(state, 'bombardier')).toBe(0);
  });

  it('should not include non-specialist Pearl upgrades', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: { gather_multiplier: 5 },
    };

    const blueprints = getSpecialistBlueprints(state);
    expect(blueprints).toHaveLength(0);
  });
});

describe('Auto-behavior unlocks', () => {
  it('should return empty list for new player', () => {
    const state = createPrestigeState();
    const behaviors = getUnlockedAutoBehaviors(state);
    expect(behaviors).toHaveLength(0);
  });

  it('should unlock lodge_regen when auto_heal purchased', () => {
    const state: PrestigeState = {
      rank: 3,
      pearls: 0,
      totalPearlsEarned: 30,
      upgradeRanks: { auto_heal_behavior: 1 },
    };

    const behaviors = getUnlockedAutoBehaviors(state);
    expect(behaviors.length).toBe(1);
    expect(behaviors[0].behavior).toBe('lodge_regen');
    expect(isAutoBehaviorUnlocked(state, 'lodge_regen')).toBe(true);
    expect(isAutoBehaviorUnlocked(state, 'lodge_self_repair')).toBe(false);
  });

  it('should unlock both behaviors when both purchased', () => {
    const state: PrestigeState = {
      rank: 5,
      pearls: 0,
      totalPearlsEarned: 50,
      upgradeRanks: {
        auto_heal_behavior: 1,
        auto_repair_behavior: 1,
      },
    };

    const behaviors = getUnlockedAutoBehaviors(state);
    expect(behaviors.length).toBe(2);
    expect(isAutoBehaviorUnlocked(state, 'lodge_regen')).toBe(true);
    expect(isAutoBehaviorUnlocked(state, 'lodge_self_repair')).toBe(true);
  });
});

describe('Stat multipliers', () => {
  it('should return 1.0 for unupgraded stats', () => {
    const state = createPrestigeState();
    expect(getStatMultiplier(state, 'damage')).toBe(1.0);
    expect(getStatMultiplier(state, 'gathering_speed')).toBe(1.0);
  });

  it('should calculate correct multiplier value', () => {
    const state: PrestigeState = {
      rank: 2,
      pearls: 0,
      totalPearlsEarned: 30,
      upgradeRanks: { gather_multiplier: 4 },
    };

    expect(getStatMultiplier(state, 'gathering_speed')).toBeCloseTo(1.2);
  });

  it('should list all active multipliers', () => {
    const state: PrestigeState = {
      rank: 3,
      pearls: 0,
      totalPearlsEarned: 50,
      upgradeRanks: {
        gather_multiplier: 3,
        combat_multiplier: 2,
        hp_multiplier: 1,
      },
    };

    const multipliers = getStatMultipliers(state);
    expect(multipliers.length).toBe(3);

    const stats = multipliers.map((m) => m.stat);
    expect(stats).toContain('gathering_speed');
    expect(stats).toContain('damage');
    expect(stats).toContain('hp');
  });
});

describe('Pearl upgrade purchase', () => {
  it('should purchase successfully when affordable', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 10,
      totalPearlsEarned: 10,
      upgradeRanks: {},
    };

    const { state: newState, result } = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.success).toBe(true);
    expect(result.newPearls).toBe(7);
    expect(result.newRank).toBe(1);
    expect(newState.upgradeRanks.blueprint_fisher).toBe(1);
  });

  it('should fail when not enough Pearls', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 1,
      totalPearlsEarned: 1,
      upgradeRanks: {},
    };

    const { result } = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Need');
  });

  it('should fail when at max rank', () => {
    const state: PrestigeState = {
      rank: 5,
      pearls: 100,
      totalPearlsEarned: 100,
      upgradeRanks: { blueprint_fisher: 5 },
    };

    const { result } = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('max rank');
  });

  it('should not mutate original state', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 10,
      totalPearlsEarned: 10,
      upgradeRanks: {},
    };

    const { state: newState } = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(state.pearls).toBe(10);
    expect(newState.pearls).toBe(7);
  });

  it('should increment existing rank', () => {
    const state: PrestigeState = {
      rank: 2,
      pearls: 20,
      totalPearlsEarned: 40,
      upgradeRanks: { blueprint_fisher: 2 },
    };

    const { state: newState, result } = purchasePearlUpgrade(state, 'blueprint_fisher');
    expect(result.success).toBe(true);
    expect(newState.upgradeRanks.blueprint_fisher).toBe(3);
  });
});

describe('Prestige execution (rank up)', () => {
  it('should increment rank and award Pearls', () => {
    const state: PrestigeState = {
      rank: 0,
      pearls: 0,
      totalPearlsEarned: 0,
      upgradeRanks: {},
    };

    const { state: newState, result } = executePrestige(state, 25);
    expect(result.newRank).toBe(1);
    expect(result.pearlsEarned).toBe(pearlsForPrestige(25, 0));
    expect(newState.rank).toBe(1);
    expect(newState.pearls).toBe(result.pearlsEarned);
    expect(newState.totalPearlsEarned).toBe(result.pearlsEarned);
  });

  it('should preserve Pearl upgrade ranks across prestige', () => {
    const state: PrestigeState = {
      rank: 1,
      pearls: 5,
      totalPearlsEarned: 15,
      upgradeRanks: { blueprint_fisher: 3, combat_multiplier: 2 },
    };

    const { state: newState } = executePrestige(state, 40);
    expect(newState.upgradeRanks.blueprint_fisher).toBe(3);
    expect(newState.upgradeRanks.combat_multiplier).toBe(2);
  });

  it('should accumulate Pearls across multiple prestiges', () => {
    let state: PrestigeState = createPrestigeState();

    const r1 = executePrestige(state, 25);
    state = r1.state;
    const firstPearls = r1.result.pearlsEarned;

    const r2 = executePrestige(state, 35);
    state = r2.state;

    expect(state.rank).toBe(2);
    expect(state.pearls).toBe(firstPearls + r2.result.pearlsEarned);
    expect(state.totalPearlsEarned).toBe(firstPearls + r2.result.pearlsEarned);
  });

  it('should list what resets and persists', () => {
    const state = createPrestigeState();
    const { result } = executePrestige(state, 25);

    expect(result.resets).toContain('clam_upgrades');
    expect(result.resets).toContain('current_run');
    expect(result.persists).toContain('pearl_upgrades');
    expect(result.persists).toContain('rank');
    expect(result.persists).toContain('total_pearls_earned');
  });

  it('should not mutate original state', () => {
    const state: PrestigeState = {
      rank: 0,
      pearls: 5,
      totalPearlsEarned: 5,
      upgradeRanks: { blueprint_fisher: 1 },
    };

    const { state: newState } = executePrestige(state, 30);
    expect(state.rank).toBe(0);
    expect(state.pearls).toBe(5);
    expect(newState.rank).toBe(1);
  });
});

describe('Display helpers', () => {
  it('should format Pearl upgrade list for UI', () => {
    const state: PrestigeState = {
      rank: 2,
      pearls: 10,
      totalPearlsEarned: 30,
      upgradeRanks: { blueprint_fisher: 2 },
    };

    const list = getPearlUpgradeDisplayList(state);
    expect(list.length).toBeGreaterThan(0);

    const fisher = list.find((u) => u.id === 'blueprint_fisher');
    expect(fisher).toBeDefined();
    expect(fisher?.currentRank).toBe(2);
    expect(fisher?.maxRank).toBe(5);
    expect(fisher?.isMaxed).toBe(false);
    expect(fisher?.canAfford).toBe(true);
    expect(fisher?.effectSummary).toBe('Field up to 2 Fishers');
  });

  it('should show max rank correctly', () => {
    const state: PrestigeState = {
      rank: 5,
      pearls: 100,
      totalPearlsEarned: 200,
      upgradeRanks: { auto_heal_behavior: 1 },
    };

    const list = getPearlUpgradeDisplayList(state);
    const heal = list.find((u) => u.id === 'auto_heal_behavior');
    expect(heal).toBeDefined();
    expect(heal?.isMaxed).toBe(true);
    expect(heal?.canAfford).toBe(false);
  });

  it('should format multiplier effect summaries', () => {
    const state: PrestigeState = {
      rank: 3,
      pearls: 50,
      totalPearlsEarned: 80,
      upgradeRanks: { gather_multiplier: 4 },
    };

    const list = getPearlUpgradeDisplayList(state);
    const gather = list.find((u) => u.id === 'gather_multiplier');
    expect(gather).toBeDefined();
    expect(gather?.effectSummary).toBe('+20% gathering_speed');
  });
});

describe('Prestige config completeness', () => {
  it('should have all expected Pearl upgrades', () => {
    const config = getPrestigeConfig();
    const ids = Object.keys(config.pearl_upgrades);

    expect(ids).toContain('blueprint_fisher');
    expect(ids).toContain('blueprint_digger');
    expect(ids).toContain('blueprint_logger');
    expect(ids).toContain('blueprint_guard');
    expect(ids).toContain('blueprint_ranger');
    expect(ids).toContain('blueprint_bombardier');
    expect(ids).toContain('blueprint_shaman');
    expect(ids).toContain('blueprint_lookout');

    expect(ids).toContain('gather_multiplier');
    expect(ids).toContain('combat_multiplier');
    expect(ids).toContain('hp_multiplier');
    expect(ids).toContain('clam_earnings_multiplier');

    expect(ids).toContain('auto_heal_behavior');
    expect(ids).toContain('auto_repair_behavior');
  });

  it('should have positive costs and max ranks for all upgrades', () => {
    const config = getPrestigeConfig();
    for (const [id, up] of Object.entries(config.pearl_upgrades)) {
      expect(up.cost_per_rank, `${id} cost`).toBeGreaterThan(0);
      expect(up.max_rank, `${id} max_rank`).toBeGreaterThan(0);
    }
  });

  it('should define reset and persist lists', () => {
    const config = getPrestigeConfig();
    expect(config.resets_on_prestige.length).toBeGreaterThan(0);
    expect(config.persists_on_prestige.length).toBeGreaterThan(0);
  });
});
