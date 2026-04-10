/**
 * v3 Screen Event Handlers
 *
 * Extracted from app.tsx to keep it under 300 LOC.
 * Provides callback factories for upgrade web, Pearl upgrades,
 * rank-up modal, and rewards screen navigation.
 */

import {
  getStartingTierRank,
  type PrestigeResult,
  type PrestigeState,
} from '@/config/prestige-logic';
import * as store from './store';
import * as storeV3 from './store-v3';
import {
  persistPrestigeState,
  persistCurrentRun,
  persistSelectedCommander,
  resetCurrentRunOnPrestige,
} from './store-v3-persistence';
import type { CurrentRunUpgradeSnapshot } from './current-run-upgrades';

export function handleUpgradesBack() {
  storeV3.upgradesScreenOpen.value = false;
}

export function handleClamsChange(newClams: number) {
  storeV3.totalClams.value = newClams;
}

export function handlePearlBack() {
  storeV3.pearlScreenOpen.value = false;
}

export function handleCommanderSelect(commanderId: string) {
  store.selectedCommander.value = commanderId;
  void persistSelectedCommander();
}

export function handlePearlStateChange(newState: PrestigeState) {
  storeV3.prestigeState.value = newState;
  storeV3.totalPearls.value = newState.pearls;
  storeV3.prestigeRank.value = newState.rank;
  storeV3.startingTierRank.value = getStartingTierRank(newState);
  void persistPrestigeState();
}

export function handleCurrentRunUpgradeStateChange(
  snapshot: CurrentRunUpgradeSnapshot,
  newClams: number,
) {
  storeV3.currentRunPurchasedNodeIds.value = snapshot.nodes;
  storeV3.currentRunPurchasedDiamondIds.value = snapshot.diamonds;
  storeV3.totalClams.value = newClams;
  void persistCurrentRun({ incrementMatchCount: false });
}

export function handleRankUpCancel() {
  storeV3.rankUpModalOpen.value = false;
}

export function handleRankUpConfirm(_result: PrestigeResult, newState: PrestigeState) {
  // 1. Update prestige signals (rank incremented, Pearls awarded by executePrestige)
  storeV3.prestigeState.value = newState;
  storeV3.totalPearls.value = newState.pearls;
  storeV3.prestigeRank.value = newState.rank;

  // 2. Reset Clam upgrades — clear current_run, zero out Clams + progression
  storeV3.totalClams.value = 0;
  storeV3.progressionLevel.value = 0;

  // 3. Starting tier auto-fill rank is stored in Pearl upgradeRanks.
  //    The actual auto-fill happens at match init when the Clam web is created,
  //    reading getStartingTierRank(). We store it in a signal so game init can read it.
  storeV3.startingTierRank.value = getStartingTierRank(newState);

  // 4. Selected Commander persists from Pearl loadout (no action needed —
  //    store.selectedCommander is untouched by prestige).

  // 5. Close modals, return to main menu for fresh run
  storeV3.rankUpModalOpen.value = false;
  storeV3.rewardsScreenOpen.value = false;
  store.menuState.value = 'main';

  // 6. Persist prestige state and reset current run in SQLite
  void resetCurrentRunOnPrestige();
  void persistPrestigeState();
}

export function handleRewardsRankUp() {
  storeV3.rankUpModalOpen.value = true;
}

export function handleRewardsUpgrades() {
  storeV3.rewardsScreenOpen.value = false;
  // Show Clam upgrade screen inline (post-match flow)
  storeV3.clamUpgradeScreenOpen.value = true;
}

export function handleRewardsPlayAgain() {
  storeV3.rewardsScreenOpen.value = false;
  // Skip Clam upgrade screen if no Clams to spend (first match of a run)
  if (storeV3.totalClams.value === 0) {
    startNextMatch();
    return;
  }
  storeV3.clamUpgradeScreenOpen.value = true;
}

/** Continue from Clam upgrade screen -> start next match. */
export function handleClamUpgradeContinue() {
  storeV3.clamUpgradeScreenOpen.value = false;
  startNextMatch();
}

/** Start next match from post-match flow. */
function startNextMatch() {
  store.menuState.value = 'main';
}
