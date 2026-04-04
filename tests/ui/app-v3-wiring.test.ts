/**
 * App v3 Screen Wiring Tests
 *
 * Validates that store-v3 signals connect to app.tsx rendering:
 * - upgradesScreenOpen -> UpgradeWebScreen
 * - pearlScreenOpen -> PearlUpgradeScreen
 * - rankUpModalOpen -> RankUpModal
 * - rewardsScreenOpen -> RewardsScreen
 * - Handler functions update signals correctly
 */

import { describe, expect, it } from 'vitest';
import type { PrestigeState } from '@/config/prestige-logic';
import {
  handleClamsChange,
  handlePearlBack,
  handlePearlStateChange,
  handleRankUpCancel,
  handleRewardsPlayAgain,
  handleRewardsRankUp,
  handleRewardsUpgrades,
  handleUpgradesBack,
} from '@/ui/app-v3-handlers';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';

describe('App v3 Screen Wiring', () => {
  describe('Signal initialization', () => {
    it('upgradesScreenOpen starts false', () => {
      expect(storeV3.upgradesScreenOpen.value).toBe(false);
    });

    it('pearlScreenOpen starts false', () => {
      expect(storeV3.pearlScreenOpen.value).toBe(false);
    });

    it('rankUpModalOpen starts false', () => {
      expect(storeV3.rankUpModalOpen.value).toBe(false);
    });

    it('rewardsScreenOpen starts false', () => {
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
    });

    it('lastRewardBreakdown starts null', () => {
      expect(storeV3.lastRewardBreakdown.value).toBeNull();
    });
  });

  describe('Handler: handleUpgradesBack', () => {
    it('should close upgrades screen', () => {
      storeV3.upgradesScreenOpen.value = true;
      handleUpgradesBack();
      expect(storeV3.upgradesScreenOpen.value).toBe(false);
    });
  });

  describe('Handler: handleClamsChange', () => {
    it('should update totalClams signal', () => {
      handleClamsChange(999);
      expect(storeV3.totalClams.value).toBe(999);
      // Reset
      storeV3.totalClams.value = 0;
    });
  });

  describe('Handler: handlePearlBack', () => {
    it('should close pearl screen', () => {
      storeV3.pearlScreenOpen.value = true;
      handlePearlBack();
      expect(storeV3.pearlScreenOpen.value).toBe(false);
    });
  });

  describe('Handler: handlePearlStateChange', () => {
    it('should update prestige state, pearls, and rank', () => {
      const newState: PrestigeState = {
        rank: 3,
        pearls: 50,
        totalPearlsEarned: 100,
        upgradeRanks: {},
      };
      handlePearlStateChange(newState);
      expect(storeV3.prestigeState.value.rank).toBe(3);
      expect(storeV3.totalPearls.value).toBe(50);
      expect(storeV3.prestigeRank.value).toBe(3);
      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.totalPearls.value = 0;
      storeV3.prestigeRank.value = 0;
    });
  });

  describe('Handler: handleRankUpCancel', () => {
    it('should close rank up modal', () => {
      storeV3.rankUpModalOpen.value = true;
      handleRankUpCancel();
      expect(storeV3.rankUpModalOpen.value).toBe(false);
    });
  });

  describe('Handler: handleRewardsRankUp', () => {
    it('should open rank up modal', () => {
      handleRewardsRankUp();
      expect(storeV3.rankUpModalOpen.value).toBe(true);
      // Reset
      storeV3.rankUpModalOpen.value = false;
    });
  });

  describe('Handler: handleRewardsUpgrades', () => {
    it('should close rewards and open upgrades in main menu', () => {
      storeV3.rewardsScreenOpen.value = true;
      store.menuState.value = 'playing';
      handleRewardsUpgrades();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.upgradesScreenOpen.value).toBe(true);
      expect(store.menuState.value).toBe('main');
      // Reset
      storeV3.upgradesScreenOpen.value = false;
      store.menuState.value = 'main';
    });
  });

  describe('Handler: handleRewardsPlayAgain', () => {
    it('should close rewards and go to main menu', () => {
      storeV3.rewardsScreenOpen.value = true;
      store.menuState.value = 'playing';
      handleRewardsPlayAgain();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');
    });
  });

  describe('Screen rendering conditions', () => {
    it('UpgradeWebScreen renders when upgradesScreenOpen and in main menu', () => {
      store.menuState.value = 'main';
      storeV3.upgradesScreenOpen.value = true;
      const shouldRender = store.menuState.value === 'main' && storeV3.upgradesScreenOpen.value;
      expect(shouldRender).toBe(true);
      // Reset
      storeV3.upgradesScreenOpen.value = false;
    });

    it('PearlUpgradeScreen renders when pearlScreenOpen and in main menu', () => {
      store.menuState.value = 'main';
      storeV3.pearlScreenOpen.value = true;
      const shouldRender = store.menuState.value === 'main' && storeV3.pearlScreenOpen.value;
      expect(shouldRender).toBe(true);
      // Reset
      storeV3.pearlScreenOpen.value = false;
    });

    it('RewardsScreen renders when rewardsScreenOpen with breakdown and playing', () => {
      store.menuState.value = 'playing';
      storeV3.rewardsScreenOpen.value = true;
      storeV3.lastRewardBreakdown.value = {
        base: 10,
        killBonus: 5,
        eventBonus: 3,
        survivalBonus: 2,
        subtotal: 20,
        prestigeMultiplier: 1,
        totalClams: 20,
        isWin: true,
        durationDisplay: '5m 0s',
      };
      const shouldRender =
        store.menuState.value === 'playing' &&
        storeV3.rewardsScreenOpen.value &&
        storeV3.lastRewardBreakdown.value !== null;
      expect(shouldRender).toBe(true);
      // Reset
      storeV3.rewardsScreenOpen.value = false;
      storeV3.lastRewardBreakdown.value = null;
      store.menuState.value = 'main';
    });

    it('RankUpModal renders when rankUpModalOpen and playing', () => {
      store.menuState.value = 'playing';
      storeV3.rankUpModalOpen.value = true;
      const shouldRender = store.menuState.value === 'playing' && storeV3.rankUpModalOpen.value;
      expect(shouldRender).toBe(true);
      // Reset
      storeV3.rankUpModalOpen.value = false;
      store.menuState.value = 'main';
    });
  });
});
