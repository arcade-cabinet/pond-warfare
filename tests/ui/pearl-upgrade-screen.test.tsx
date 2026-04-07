// @vitest-environment jsdom
/**
 * Pearl Upgrade Screen Tests (v3.0 — US15)
 *
 * Validates Pearl upgrade screen behavior:
 * - Displays all Pearl upgrades from prestige.json
 * - Categories: specialists, behaviors, multipliers
 * - Purchase deducts Pearls correctly
 * - Specialist cap display updates after purchase
 * - Max rank prevention
 * - Correct display of current rank/max rank
 */

import { describe, expect, it } from 'vitest';
import {
  createPrestigeState,
  getPearlUpgradeDisplayList,
  getSpecialistBlueprintCap,
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

    it('should keep specialist blueprint upgrades grouped together', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const blueprintUpgrades = list.filter((u) => u.id.startsWith('blueprint_'));
      expect(blueprintUpgrades.length).toBe(8);
    });

    it('should categorize auto-behavior upgrades correctly', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const behaviorUpgrades = list.filter((u) => u.id.endsWith('_behavior'));
      expect(behaviorUpgrades.length).toBe(2);
    });

    it('should categorize multiplier upgrades correctly', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);

      const multiplierUpgrades = list.filter(
        (u) => u.id.endsWith('_multiplier') && !u.id.startsWith('auto_'),
      );
      expect(multiplierUpgrades.length).toBeGreaterThanOrEqual(3);
    });

    it('should show correct current rank for purchased upgrades', () => {
      const state: PrestigeState = {
        rank: 2,
        pearls: 20,
        totalPearlsEarned: 40,
        upgradeRanks: { blueprint_fisher: 3 },
      };

      const list = getPearlUpgradeDisplayList(state);
      const fisher = list.find((u) => u.id === 'blueprint_fisher');
      expect(fisher?.currentRank).toBe(3);
      expect(fisher?.maxRank).toBe(5);
    });

    it('should show canAfford correctly based on Pearl balance', () => {
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

      const poorFisher = poorList.find((u) => u.id === 'blueprint_fisher');
      const richFisher = richList.find((u) => u.id === 'blueprint_fisher');

      expect(poorFisher?.canAfford).toBe(false);
      expect(richFisher?.canAfford).toBe(true);
    });

    it('should show isMaxed for maxed upgrades', () => {
      const state: PrestigeState = {
        rank: 5,
        pearls: 100,
        totalPearlsEarned: 200,
        upgradeRanks: { auto_heal_behavior: 1 },
      };

      const list = getPearlUpgradeDisplayList(state);
      const heal = list.find((u) => u.id === 'auto_heal_behavior');
      expect(heal?.isMaxed).toBe(true);
      expect(heal?.canAfford).toBe(false);
    });
  });

  describe('Specialist blueprint display', () => {
    it('should show field caps for specialist blueprint upgrades', () => {
      const state: PrestigeState = {
        rank: 3,
        pearls: 0,
        totalPearlsEarned: 30,
        upgradeRanks: { blueprint_fisher: 4 },
      };

      const list = getPearlUpgradeDisplayList(state);
      const fisher = list.find((u) => u.id === 'blueprint_fisher');
      expect(fisher?.effectSummary).toBe('Field up to 4 Fishers');
    });

    it('should update count after purchase', () => {
      const state: PrestigeState = {
        rank: 2,
        pearls: 10,
        totalPearlsEarned: 20,
        upgradeRanks: { blueprint_fisher: 2 },
      };

      expect(getSpecialistBlueprintCap(state, 'fisher')).toBe(2);

      const { state: newState, result } = purchasePearlUpgrade(state, 'blueprint_fisher');
      expect(result.success).toBe(true);

      expect(getSpecialistBlueprintCap(newState, 'fisher')).toBe(3);
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
      expect(gather?.effectSummary).toBe('+20% gathering_speed');

      const combat = list.find((u) => u.id === 'combat_multiplier');
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

      const { state: newState, result } = purchasePearlUpgrade(state, 'blueprint_fisher');
      expect(result.success).toBe(true);
      expect(result.newPearls).toBe(12);
      expect(newState.pearls).toBe(12);
    });

    it('should prevent purchase when insufficient Pearls', () => {
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

    it('should prevent purchase at max rank', () => {
      const state: PrestigeState = {
        rank: 5,
        pearls: 100,
        totalPearlsEarned: 200,
        upgradeRanks: { blueprint_fisher: 5 },
      };

      const { result } = purchasePearlUpgrade(state, 'blueprint_fisher');
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

      for (let i = 1; i <= 3; i += 1) {
        const { state: newState, result } = purchasePearlUpgrade(state, 'blueprint_fisher');
        expect(result.success).toBe(true);
        expect(newState.upgradeRanks.blueprint_fisher).toBe(i);
        state = newState;
      }

      expect(state.pearls).toBe(21);
    });
  });
});
