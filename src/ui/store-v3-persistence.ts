/**
 * v3 Store <-> SQLite Persistence Bridge
 *
 * Hydrates store-v3 signals from SQLite on app startup, and
 * provides save helpers called after match rewards and prestige.
 */

import { createPrestigeState } from '@/config/prestige-logic';
import {
  isDatabaseReady,
  loadCurrentRun,
  loadPrestigeState,
  resetCurrentRun,
  saveCurrentRun,
  savePrestigeState,
} from '@/storage/schema';
import * as storeV3 from './store-v3';

/**
 * Load prestige state and current run from SQLite into store-v3 signals.
 * Call once at app startup after initDatabase().
 */
export async function hydrateV3StoreFromDb(): Promise<void> {
  if (!isDatabaseReady()) return;

  const prestige = await loadPrestigeState();
  if (prestige) {
    storeV3.prestigeRank.value = prestige.rank;
    storeV3.totalPearls.value = prestige.pearls;

    let upgradeRanks: Record<string, number> = {};
    try {
      upgradeRanks = JSON.parse(prestige.pearl_upgrades);
    } catch {
      upgradeRanks = {};
    }

    storeV3.prestigeState.value = {
      rank: prestige.rank,
      pearls: prestige.pearls,
      totalPearlsEarned: prestige.total_clams_earned,
      upgradeRanks,
    };
  }

  const run = await loadCurrentRun();
  if (run) {
    storeV3.totalClams.value = run.clams;
    storeV3.progressionLevel.value = run.progression_level;
  }
}

/**
 * Persist prestige state from store-v3 signals to SQLite.
 * Call after match rewards are applied.
 */
export async function persistPrestigeState(): Promise<void> {
  if (!isDatabaseReady()) return;

  const state = storeV3.prestigeState.value;
  await savePrestigeState({
    rank: state.rank,
    pearls: state.pearls,
    pearl_upgrades: JSON.stringify(state.upgradeRanks),
    total_matches: 0,
    total_clams_earned: state.totalPearlsEarned,
    highest_progression: storeV3.progressionLevel.value,
  });
}

/**
 * Persist current run state from store-v3 signals to SQLite.
 * Call after match rewards are applied and progression incremented.
 */
export async function persistCurrentRun(): Promise<void> {
  if (!isDatabaseReady()) return;

  await saveCurrentRun({
    clams: storeV3.totalClams.value,
    upgrades_purchased: '{}',
    lodge_state: '{}',
    progression_level: storeV3.progressionLevel.value,
    matches_this_run: 0,
  });
}

/**
 * Reset current run in both store and SQLite (called on prestige).
 */
export async function resetCurrentRunOnPrestige(): Promise<void> {
  storeV3.totalClams.value = 0;
  storeV3.progressionLevel.value = 0;

  if (!isDatabaseReady()) return;
  await resetCurrentRun();
}

/**
 * Convenience: create a fresh prestige state from defaults.
 */
export function freshPrestigeState() {
  return createPrestigeState();
}
