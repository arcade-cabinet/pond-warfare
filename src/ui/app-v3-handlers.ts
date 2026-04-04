/**
 * v3 Screen Event Handlers
 *
 * Extracted from app.tsx to keep it under 300 LOC.
 * Provides callback factories for upgrade web, Pearl upgrades,
 * rank-up modal, and rewards screen navigation.
 */

import type { PrestigeResult, PrestigeState } from '@/config/prestige-logic';
import * as store from './store';
import * as storeV3 from './store-v3';
import { persistPrestigeState, resetCurrentRunOnPrestige } from './store-v3-persistence';

export function handleUpgradesBack() {
  storeV3.upgradesScreenOpen.value = false;
}

export function handleClamsChange(newClams: number) {
  storeV3.totalClams.value = newClams;
}

export function handlePearlBack() {
  storeV3.pearlScreenOpen.value = false;
}

export function handlePearlStateChange(newState: PrestigeState) {
  storeV3.prestigeState.value = newState;
  storeV3.totalPearls.value = newState.pearls;
  storeV3.prestigeRank.value = newState.rank;
}

export function handleRankUpCancel() {
  storeV3.rankUpModalOpen.value = false;
}

export function handleRankUpConfirm(_result: PrestigeResult, newState: PrestigeState) {
  storeV3.prestigeState.value = newState;
  storeV3.totalPearls.value = newState.pearls;
  storeV3.prestigeRank.value = newState.rank;
  storeV3.rankUpModalOpen.value = false;
  storeV3.rewardsScreenOpen.value = false;
  store.menuState.value = 'main';

  // Persist prestige state and reset current run in SQLite
  resetCurrentRunOnPrestige().catch(() => {});
  persistPrestigeState().catch(() => {});
}

export function handleRewardsRankUp() {
  storeV3.rankUpModalOpen.value = true;
}

export function handleRewardsUpgrades() {
  storeV3.rewardsScreenOpen.value = false;
  storeV3.upgradesScreenOpen.value = true;
  store.menuState.value = 'main';
}

export function handleRewardsPlayAgain() {
  storeV3.rewardsScreenOpen.value = false;
  store.menuState.value = 'main';
}
