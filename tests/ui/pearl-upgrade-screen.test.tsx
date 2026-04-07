// @vitest-environment jsdom
/**
 * Pearl Upgrade Screen Tests (v3.0 — US15)
 *
 * Validates Pearl upgrade screen behavior:
 * - Displays all Pearl upgrades from prestige.json
 * - Categories: auto-deploy, auto-behavior, multiplier
 * - Purchase deducts Pearls correctly
 * - Auto-deploy count updates after purchase
 * - Max rank prevention
 * - Correct display of current rank/max rank
 */

import { describe, expect, it } from 'vitest';
import {
  createPrestigeState,
  getAutoDeployCount,
  getPearlUpgradeDisplayList,
  isAutoBehaviorUnlocked,
  type PrestigeState,
  purchasePearlUpgrade,
} from '@/config/prestige-logic';
import { getPrestigeConfig } from '@/config/config-loader';

describe('Pearl Upgrade Screen — US15', () => {
  describe('Display list generation', () => {
    it('should list all Pearl upgrades from config', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const config = getPrestigeConfig();
      const expectedCount = Object.keys(config.pearl_upgrades).length;
      expect(list.length).toBe(expectedCount);
    });

    it('should categorize auto-deploy upgrades correctly', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const autoDeployUpgrades = list.filter((u) => u.id.startsWith('auto_deploy_'));
      expect(autoDeployUpgrades.length).toBe(8); // 8 specialist types
    });

    it('should categorize auto-behavior upgrades correctly', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const behaviorUpgrades = list.filter((u) => u.id.endsWith('_behavior'));
      expect(behaviorUpgrades.length).toBe(2); // heal + repair
    });

    it('should categorize multiplier upgrades correctly', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const multiplierUpgrades = list.filter(
        (u) => u.id.endsWith('_multiplier') && !u.id.startsWith('auto_'),
      );
      expect(multiplierUpgrades.length).toBeGreaterThanOrEqual(3); // gather, combat, hp, clam
    });

    it('should show correct current rank for purchased upgrades', () => {
      const state: PrestigeState = {
        rank: 2,
        pearls: 20,
        totalPearlsEarned: 40,
        upgradeRanks: { auto_deploy_fisher: 3 },
      };

      const list = getPearlUpgradeDisplayList(state);
      const fisher = list.find((u) => u.id === 'auto_deploy_fisher');
      expect(fisher?.currentRank).toBe(3);
      expect(fisher?.maxRank).toBe(5);
    });

    it('should show canAfford correctly based on Pearl balance', () => {
      // Fisher costs 3 Pearls per rank
      const poorState: PrestigeState = {
        rank: 1,
        pearls: 2,
        totalPearlsEarned: 5,
        upgradeRanks: {},
      };

      const richState: PrestigeState = {
        rank: 1,
        pearls: 10,
        totalPearlsEarned: 10,
        upgradeRanks: {},
      };

      const poorList = getPearlUpgradeDisplayList(poorState);
      const richList = getPearlUpgradeDisplayList(richState);

      const poorFisher = poorList.find((u) => u.id === 'auto_deploy_fisher');
      const richFisher = richList.find((u) => u.id === 'auto_deploy_fisher');

      expect(poorFisher?.canAfford).toBe(false);
      expect(richFisher?.canAfford).toBe(true);
    });

    it('should show isMaxed for maxed upgrades', () => {
      const state: PrestigeState = {
        rank: 5,
        pearls: 100,
        totalPearlsEarned: 200,
        upgradeRanks: { auto_heal_behavior: 1 }, // max_rank is 1
      };

      const list = getPearlUpgradeDisplayList(state);
      const heal = list.find((u) => u.id === 'auto_heal_behavior');
      expect(heal?.isMaxed).toBe(true);
      expect(heal?.canAfford).toBe(false);
    });
  });

  describe('Auto-deploy slider display', () => {
    it('should show N units auto-spawned for auto-deploy upgrades', () => {
      const state: PrestigeState = {
        rank: 3,
        pearls: 0,
        totalPearlsEarned: 30,
        upgradeRanks: { auto_deploy_fisher: 4 },
      };

      const list = getPearlUpgradeDisplayList(state);
      const fisher = list.find((u) => u.id === 'auto_deploy_fisher');
      // Effect summary: "4x fisher"
      expect(fisher?.effectSummary).toBe('4x fisher');
    });

    it('should update count after purchase', () => {
      const state: PrestigeState = {
        rank: 2,
        pearls: 10,
        totalPearlsEarned: 20,
        upgradeRanks: { auto_deploy_fisher: 2 },
      };

      // Before purchase: 2 fishers
      expect(getAutoDeployCount(state, 'fisher')).toBe(2);

      // Purchase: rank 2 → 3
      const { state: newState, result } = purchasePearlUpgrade(state, 'auto_deploy_fisher');
      expect(result.success).toBe(true);

      // After purchase: 3 fishers
      expect(getAutoDeployCount(newState, 'fisher')).toBe(3);
    });
  });

  describe('Auto-behavior toggle display', () => {
    it('should show unlocked status for purchased behaviors', () => {
      const state: PrestigeState = {
        rank: 3,
        pearls: 50,
        totalPearlsEarned: 80,
        upgradeRanks: { auto_heal_behavior: 1 },
      };

      expect(isAutoBehaviorUnlocked(state, 'lodge_regen')).toBe(true);
      expect(isAutoBehaviorUnlocked(state, 'lodge_self_repair')).toBe(false);
    });

    it('should show locked status for unpurchased behaviors', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);
      const heal = list.find((u) => u.id === 'auto_heal_behavior');
      expect(heal?.effectSummary).toBe('Locked');
    });
  });

  describe('Multiplier display', () => {
    it('should show percentage bars for multiplier upgrades', () => {
      const state: PrestigeState = {
        rank: 3,
        pearls: 50,
        totalPearlsEarned: 80,
        upgradeRanks: { gather_multiplier: 4, combat_multiplier: 2 },
      };

      const list = getPearlUpgradeDisplayList(state);

      const gather = list.find((u) => u.id === 'gather_multiplier');
      // 4 ranks * 0.05 = 0.20 = 20%
      expect(gather?.effectSummary).toBe('+20% gathering_speed');

      const combat = list.find((u) => u.id === 'combat_multiplier');
      // 2 ranks * 0.10 = 0.20 = 20%
      expect(combat?.effectSummary).toBe('+20% damage');
    });
  });

  describe('Pearl spending', () => {
    it('should deduct Pearls on successful purchase', () => {
      const state: PrestigeState = {
        rank: 1,
        pearls: 15,
        totalPearlsEarned: 15,
        upgradeRanks: {},
      };

      // Fisher costs 3 Pearls
      const { state: newState, result } = purchasePearlUpgrade(state, 'auto_deploy_fisher');
      expect(result.success).toBe(true);
      expect(result.newPearls).toBe(12); // 15 - 3
      expect(newState.pearls).toBe(12);
    });

    it('should prevent purchase when insufficient Pearls', () => {
      const state: PrestigeState = {
        rank: 1,
        pearls: 1,
        totalPearlsEarned: 1,
        upgradeRanks: {},
      };

      const { result } = purchasePearlUpgrade(state, 'auto_deploy_fisher');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Need');
    });

    it('should prevent purchase at max rank', () => {
      const state: PrestigeState = {
        rank: 5,
        pearls: 100,
        totalPearlsEarned: 200,
        upgradeRanks: { auto_deploy_fisher: 5 },
      };

      const { result } = purchasePearlUpgrade(state, 'auto_deploy_fisher');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('max rank');
    });

    it('should allow sequential purchases of same upgrade', () => {
      let state: PrestigeState = {
        rank: 2,
        pearls: 30,
        totalPearlsEarned: 30,
        upgradeRanks: {},
      };

      // Buy fisher 3 times
      for (let i = 1; i <= 3; i++) {
        const { state: newState, result } = purchasePearlUpgrade(state, 'auto_deploy_fisher');
        expect(result.success).toBe(true);
        expect(newState.upgradeRanks.auto_deploy_fisher).toBe(i);
        state = newState;
      }

      // Should have spent 9 Pearls total (3 * 3)
      expect(state.pearls).toBe(21); // 30 - 9
    });
  });
});
