/**
 * v3 Store <-> SQLite Persistence Bridge
 *
 * Hydrates store-v3 signals from SQLite on app startup, and
 * provides save helpers called after match rewards and prestige.
 */

import { createPrestigeState, getStartingTierRank } from '@/config/prestige-logic';
import { getPlayerProfile } from '@/storage/database';
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
import { selectedCommander } from './store';
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

    const prestigeState = {
      rank: prestige.rank,
      pearls: prestige.pearls,
      totalPearlsEarned: prestige.total_clams_earned,
      upgradeRanks,
    };
    storeV3.prestigeState.value = prestigeState;
    storeV3.startingTierRank.value = getStartingTierRank(prestigeState);
  }

  const run = await loadCurrentRun();
  if (run) {
    storeV3.totalClams.value = run.clams;
    storeV3.progressionLevel.value = run.progression_level;
  }

  const commander = await loadSelectedCommander();
  selectedCommander.value = commander;

  try {
    storeV3.playerProfile.value = await getPlayerProfile();
  } catch {
    // Non-critical -- default profile is fine
  }
}

/**
 * Persist selected commander to SQLite. Call when commander selection changes.
 */
export async function persistSelectedCommander(): Promise<void> {
  if (!isDatabaseReady()) return;
  await saveSelectedCommander(selectedCommander.value);
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

  // Load existing run to increment matches_this_run correctly
  const existing = await loadCurrentRun();
  const matchCount = existing ? existing.matches_this_run + 1 : 1;

  await saveCurrentRun({
    clams: storeV3.totalClams.value,
    upgrades_purchased: existing?.upgrades_purchased ?? '{}',
    lodge_state: existing?.lodge_state ?? '{}',
    progression_level: storeV3.progressionLevel.value,
    matches_this_run: matchCount,
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
