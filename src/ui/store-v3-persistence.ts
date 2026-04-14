/**
 * v3 Store <-> SQLite Persistence Bridge
 *
 * Hydrates store-v3 signals from SQLite on app startup, and
 * provides save helpers called after match rewards and prestige.
 */

import { createPrestigeState, getStartingTierRank } from '@/config/prestige-logic';
import { GameError, logError } from '@/errors';
import { getPlayerProfile } from '@/storage';
import {
  isDatabaseReady,
  loadCurrentRun,
  loadPrestigeState,
  loadSelectedCommander,
  resetCurrentRun,
  saveCurrentRun,
  savePrestigeState,
  saveSelectedCommander,
} from '@/storage/schema';
import {
  createEmptyCurrentRunUpgradeSnapshot,
  parseCurrentRunUpgradeSnapshot,
  serializeCurrentRunUpgradeSnapshot,
} from './current-run-upgrades';
import { selectedCommander } from './store';
import * as storeV3 from './store-v3';

function reportStoreV3PersistenceError(
  action: 'load' | 'save' | 'reset',
  scope: string,
  error: unknown,
): void {
  logError(
    new GameError(`Failed to ${action} ${scope}`, 'store-v3-persistence', {
      cause: error,
      context: { action, scope },
    }),
  );
}

/**
 * Load prestige state and current run from SQLite into store-v3 signals.
 * Call once at app startup after initDatabase().
 */
export async function hydrateV3StoreFromDb(): Promise<void> {
  if (!isDatabaseReady()) return;

  let prestige = null;
  try {
    prestige = await loadPrestigeState();
  } catch (error) {
    reportStoreV3PersistenceError('load', 'prestige state', error);
  }
  if (prestige) {
    storeV3.prestigeRank.value = prestige.rank;
    storeV3.totalPearls.value = prestige.pearls;

    let upgradeRanks: Record<string, number> = {};
    try {
      upgradeRanks = JSON.parse(prestige.pearl_upgrades);
    } catch {
      upgradeRanks = {};
    }

    const prestigeState = {
      rank: prestige.rank,
      pearls: prestige.pearls,
      totalPearlsEarned: prestige.total_pearls_earned,
      upgradeRanks,
    };
    storeV3.prestigeState.value = prestigeState;
    storeV3.startingTierRank.value = getStartingTierRank(prestigeState);
  }

  let run = null;
  try {
    run = await loadCurrentRun();
  } catch (error) {
    reportStoreV3PersistenceError('load', 'current run', error);
  }
  if (run) {
    const snapshot = parseCurrentRunUpgradeSnapshot(run.upgrades_purchased);
    storeV3.totalClams.value = run.clams;
    storeV3.progressionLevel.value = run.progression_level;
    storeV3.currentRunPurchasedNodeIds.value = snapshot.nodes;
    storeV3.currentRunPurchasedDiamondIds.value = snapshot.diamonds;
  } else {
    const snapshot = createEmptyCurrentRunUpgradeSnapshot();
    storeV3.currentRunPurchasedNodeIds.value = snapshot.nodes;
    storeV3.currentRunPurchasedDiamondIds.value = snapshot.diamonds;
  }

  try {
    selectedCommander.value = await loadSelectedCommander();
  } catch (error) {
    reportStoreV3PersistenceError('load', 'selected commander', error);
  }

  try {
    storeV3.playerProfile.value = await getPlayerProfile();
  } catch (error) {
    reportStoreV3PersistenceError('load', 'player profile', error);
  }
}

/**
 * Persist selected commander to SQLite. Call when commander selection changes.
 */
export async function persistSelectedCommander(): Promise<boolean> {
  if (!isDatabaseReady()) return false;
  try {
    await saveSelectedCommander(selectedCommander.value);
    return true;
  } catch (error) {
    reportStoreV3PersistenceError('save', 'selected commander', error);
    return false;
  }
}

/**
 * Persist prestige state from store-v3 signals to SQLite.
 * Call after match rewards are applied.
 */
export async function persistPrestigeState(): Promise<boolean> {
  if (!isDatabaseReady()) return false;

  const state = storeV3.prestigeState.value;
  try {
    await savePrestigeState({
      rank: state.rank,
      pearls: state.pearls,
      pearl_upgrades: JSON.stringify(state.upgradeRanks),
      total_matches: 0,
      total_pearls_earned: state.totalPearlsEarned,
      highest_progression: storeV3.progressionLevel.value,
    });
    return true;
  } catch (error) {
    reportStoreV3PersistenceError('save', 'prestige state', error);
    return false;
  }
}

/**
 * Persist current run state from store-v3 signals to SQLite.
 * Call after match rewards are applied and progression incremented.
 */
export async function persistCurrentRun(
  options: { incrementMatchCount?: boolean } = {},
): Promise<boolean> {
  if (!isDatabaseReady()) return false;

  try {
    // Load existing run to increment matches_this_run correctly
    const existing = await loadCurrentRun();
    const incrementMatchCount = options.incrementMatchCount ?? true;
    const matchCount = incrementMatchCount
      ? existing
        ? existing.matches_this_run + 1
        : 1
      : (existing?.matches_this_run ?? 0);
    const snapshot = serializeCurrentRunUpgradeSnapshot({
      nodes: storeV3.currentRunPurchasedNodeIds.value,
      diamonds: storeV3.currentRunPurchasedDiamondIds.value,
    });

    await saveCurrentRun({
      clams: storeV3.totalClams.value,
      upgrades_purchased: snapshot,
      lodge_state: existing?.lodge_state ?? '{}',
      progression_level: storeV3.progressionLevel.value,
      matches_this_run: matchCount,
    });
    return true;
  } catch (error) {
    reportStoreV3PersistenceError('save', 'current run', error);
    return false;
  }
}

/**
 * Reset current run in both store and SQLite (called on prestige).
 */
export async function resetCurrentRunOnPrestige(): Promise<boolean> {
  storeV3.totalClams.value = 0;
  storeV3.progressionLevel.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  if (!isDatabaseReady()) return false;
  try {
    await resetCurrentRun();
    return true;
  } catch (error) {
    reportStoreV3PersistenceError('reset', 'current run', error);
    return false;
  }
}

/**
 * Convenience: create a fresh prestige state from defaults.
 */
export function freshPrestigeState() {
  return createPrestigeState();
}
