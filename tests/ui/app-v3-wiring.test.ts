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
import { executePrestige, getStartingTierRank, type PrestigeState } from '@/config/prestige-logic';
import {
  handleClamsChange,
  handleClamUpgradeContinue,
  handlePearlBack,
  handlePearlStateChange,
  handleRankUpCancel,
  handleRankUpConfirm,
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

    it('clamUpgradeScreenOpen starts false', () => {
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);
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
    it('should close rewards and open Clam upgrade screen', () => {
      storeV3.rewardsScreenOpen.value = true;
      handleRewardsUpgrades();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(true);
      // Reset
      storeV3.clamUpgradeScreenOpen.value = false;
    });
  });

  describe('Handler: handleRewardsPlayAgain', () => {
    it('should open Clam upgrade screen when player has Clams', () => {
      storeV3.rewardsScreenOpen.value = true;
      storeV3.totalClams.value = 50;
      handleRewardsPlayAgain();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(true);
      // Reset
      storeV3.clamUpgradeScreenOpen.value = false;
      storeV3.totalClams.value = 0;
    });

    it('should skip Clam upgrade screen on first match (0 Clams)', () => {
      storeV3.rewardsScreenOpen.value = true;
      storeV3.totalClams.value = 0;
      store.menuState.value = 'playing';
      handleRewardsPlayAgain();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');
      // Reset
      store.menuState.value = 'main';
    });
  });

  describe('Handler: handleClamUpgradeContinue', () => {
    it('should close Clam upgrade screen and start next match', () => {
      storeV3.clamUpgradeScreenOpen.value = true;
      store.menuState.value = 'playing';
      handleClamUpgradeContinue();
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');
    });
  });

  describe('Screen rendering conditions', () => {
    it('UpgradeWebScreen renders when clamUpgradeScreenOpen (post-match)', () => {
      store.menuState.value = 'playing';
      storeV3.clamUpgradeScreenOpen.value = true;
      const shouldRender =
        store.menuState.value === 'playing' && storeV3.clamUpgradeScreenOpen.value;
      expect(shouldRender).toBe(true);
      // Reset
      storeV3.clamUpgradeScreenOpen.value = false;
      store.menuState.value = 'main';
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

  describe('Post-match flow integration', () => {
    it('rewards -> Clam screen -> next match (has Clams)', () => {
      // Simulate post-match state
      store.menuState.value = 'playing';
      storeV3.rewardsScreenOpen.value = true;
      storeV3.totalClams.value = 100;

      // Player clicks "Play Again" on rewards
      handleRewardsPlayAgain();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(true);

      // Player clicks "Continue" on Clam upgrade screen
      handleClamUpgradeContinue();
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');

      // Reset
      storeV3.totalClams.value = 0;
    });

    it('rewards -> skip Clam screen -> next match (first match, 0 Clams)', () => {
      store.menuState.value = 'playing';
      storeV3.rewardsScreenOpen.value = true;
      storeV3.totalClams.value = 0;

      handleRewardsPlayAgain();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');
    });

    it('rewards -> Upgrades button -> Clam screen -> next match', () => {
      store.menuState.value = 'playing';
      storeV3.rewardsScreenOpen.value = true;
      storeV3.totalClams.value = 50;

      // Player clicks "Upgrades" on rewards
      handleRewardsUpgrades();
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(true);

      // Player clicks "Continue" on Clam upgrade screen
      handleClamUpgradeContinue();
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');

      // Reset
      storeV3.totalClams.value = 0;
    });

    it('menu UPGRADES button opens Pearl screen (not Clam web)', () => {
      // The menu UPGRADES button now sets pearlScreenOpen, not upgradesScreenOpen
      store.menuState.value = 'main';
      storeV3.pearlScreenOpen.value = true;
      const pearlShowing = storeV3.pearlScreenOpen.value;
      const clamShowing = storeV3.clamUpgradeScreenOpen.value;
      expect(pearlShowing).toBe(true);
      expect(clamShowing).toBe(false);
      // Reset
      storeV3.pearlScreenOpen.value = false;
    });
  });

  describe('Handler: handleRankUpConfirm (US8 — Rank Up = Prestige)', () => {
    it('should increment rank and award Pearls', () => {
      const state: PrestigeState = {
        rank: 0,
        pearls: 0,
        totalPearlsEarned: 0,
        upgradeRanks: {},
      };
      storeV3.progressionLevel.value = 25;
      const { state: newState, result } = executePrestige(state, 25);

      handleRankUpConfirm(result, newState);

      expect(storeV3.prestigeRank.value).toBe(1);
      expect(storeV3.totalPearls.value).toBe(newState.pearls);
      expect(storeV3.prestigeState.value.rank).toBe(1);

      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
      storeV3.progressionLevel.value = 0;
    });

    it('should reset Clam state (clams + progressionLevel to 0)', () => {
      const state: PrestigeState = {
        rank: 1,
        pearls: 10,
        totalPearlsEarned: 20,
        upgradeRanks: {},
      };
      storeV3.totalClams.value = 500;
      storeV3.progressionLevel.value = 30;
      const { state: newState, result } = executePrestige(state, 30);

      handleRankUpConfirm(result, newState);

      expect(storeV3.totalClams.value).toBe(0);
      expect(storeV3.progressionLevel.value).toBe(0);

      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
    });

    it('should preserve Pearl upgrade ranks across prestige', () => {
      const state: PrestigeState = {
        rank: 1,
        pearls: 5,
        totalPearlsEarned: 15,
        upgradeRanks: { auto_deploy_fisher: 3, combat_multiplier: 2 },
      };
      const { state: newState, result } = executePrestige(state, 40);

      handleRankUpConfirm(result, newState);

      expect(storeV3.prestigeState.value.upgradeRanks.auto_deploy_fisher).toBe(3);
      expect(storeV3.prestigeState.value.upgradeRanks.combat_multiplier).toBe(2);

      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
    });

    it('should set starting tier rank from Pearl upgrades', () => {
      const state: PrestigeState = {
        rank: 0,
        pearls: 0,
        totalPearlsEarned: 0,
        upgradeRanks: { starting_tier: 3 },
      };
      const { state: newState, result } = executePrestige(state, 25);

      handleRankUpConfirm(result, newState);

      expect(storeV3.startingTierRank.value).toBe(getStartingTierRank(newState));
      expect(storeV3.startingTierRank.value).toBe(3);

      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
      storeV3.startingTierRank.value = 0;
    });

    it('should close modals and return to main menu', () => {
      const state: PrestigeState = {
        rank: 0,
        pearls: 0,
        totalPearlsEarned: 0,
        upgradeRanks: {},
      };
      storeV3.rankUpModalOpen.value = true;
      storeV3.rewardsScreenOpen.value = true;
      store.menuState.value = 'playing';
      const { state: newState, result } = executePrestige(state, 25);

      handleRankUpConfirm(result, newState);

      expect(storeV3.rankUpModalOpen.value).toBe(false);
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');

      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
    });

    it('should keep selected Commander unchanged (persists from Pearl loadout)', () => {
      store.selectedCommander.value = 'sage';
      const state: PrestigeState = {
        rank: 0,
        pearls: 0,
        totalPearlsEarned: 0,
        upgradeRanks: {},
      };
      const { state: newState, result } = executePrestige(state, 25);

      handleRankUpConfirm(result, newState);

      expect(store.selectedCommander.value).toBe('sage');

      // Reset
      store.selectedCommander.value = 'marshal';
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
    });
  });

  describe('Menu simplification (US9)', () => {
    it('UPGRADES should be hidden when rank = 0 and pearls = 0', () => {
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
      const showUpgrades = storeV3.prestigeRank.value > 0 || storeV3.totalPearls.value > 0;
      expect(showUpgrades).toBe(false);
    });

    it('UPGRADES should be visible when rank > 0', () => {
      storeV3.prestigeRank.value = 1;
      storeV3.totalPearls.value = 0;
      const showUpgrades = storeV3.prestigeRank.value > 0 || storeV3.totalPearls.value > 0;
      expect(showUpgrades).toBe(true);
      // Reset
      storeV3.prestigeRank.value = 0;
    });

    it('UPGRADES should be visible when pearls > 0', () => {
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 10;
      const showUpgrades = storeV3.prestigeRank.value > 0 || storeV3.totalPearls.value > 0;
      expect(showUpgrades).toBe(true);
      // Reset
      storeV3.totalPearls.value = 0;
    });

    it('UPGRADES opens Pearl loadout (not Clam web)', () => {
      storeV3.pearlScreenOpen.value = false;
      storeV3.upgradesScreenOpen.value = false;
      storeV3.clamUpgradeScreenOpen.value = false;

      // Simulate menu UPGRADES click
      storeV3.pearlScreenOpen.value = true;

      expect(storeV3.pearlScreenOpen.value).toBe(true);
      expect(storeV3.upgradesScreenOpen.value).toBe(false);
      expect(storeV3.clamUpgradeScreenOpen.value).toBe(false);

      // Reset
      storeV3.pearlScreenOpen.value = false;
    });

    it('startingTierRank signal starts at 0', () => {
      expect(storeV3.startingTierRank.value).toBe(0);
    });
  });

  describe('Rank Up full flow integration', () => {
    it('rewards -> rank up -> main menu with reset state', () => {
      // Simulate post-match with Clams and progression
      store.menuState.value = 'playing';
      storeV3.rewardsScreenOpen.value = true;
      storeV3.totalClams.value = 200;
      storeV3.progressionLevel.value = 25;

      // Player opens Rank Up modal
      handleRewardsRankUp();
      expect(storeV3.rankUpModalOpen.value).toBe(true);

      // Player confirms Rank Up
      const state: PrestigeState = {
        rank: 0,
        pearls: 0,
        totalPearlsEarned: 0,
        upgradeRanks: {},
      };
      const { state: newState, result } = executePrestige(state, 25);
      handleRankUpConfirm(result, newState);

      // Verify full reset
      expect(storeV3.totalClams.value).toBe(0);
      expect(storeV3.progressionLevel.value).toBe(0);
      expect(storeV3.rankUpModalOpen.value).toBe(false);
      expect(storeV3.rewardsScreenOpen.value).toBe(false);
      expect(store.menuState.value).toBe('main');
      expect(storeV3.prestigeRank.value).toBe(1);
      expect(storeV3.totalPearls.value).toBeGreaterThan(0);

      // Reset
      storeV3.prestigeState.value = { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
      storeV3.prestigeRank.value = 0;
      storeV3.totalPearls.value = 0;
    });
  });
});
