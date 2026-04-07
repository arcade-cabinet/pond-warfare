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
import {
  createEmptyCurrentRunUpgradeSnapshot,
  parseCurrentRunUpgradeSnapshot,
  serializeCurrentRunUpgradeSnapshot,
} from './current-run-upgrades';
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
      totalPearlsEarned: prestige.total_pearls_earned,
      upgradeRanks,
    };
    storeV3.prestigeState.value = prestigeState;
    storeV3.startingTierRank.value = getStartingTierRank(prestigeState);
  }

  const run = await loadCurrentRun();
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
    total_pearls_earned: state.totalPearlsEarned,
    highest_progression: storeV3.progressionLevel.value,
  });
}

/**
 * Persist current run state from store-v3 signals to SQLite.
 * Call after match rewards are applied and progression incremented.
 */
export async function persistCurrentRun(options: { incrementMatchCount?: boolean } = {}): Promise<void> {
  if (!isDatabaseReady()) return;

  // Load existing run to increment matches_this_run correctly
  const existing = await loadCurrentRun();
  const incrementMatchCount = options.incrementMatchCount ?? true;
  const matchCount = incrementMatchCount
    ? existing
      ? existing.matches_this_run + 1
      : 1
    : existing?.matches_this_run ?? 0;
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
}

/**
 * Reset current run in both store and SQLite (called on prestige).
 */
export async function resetCurrentRunOnPrestige(): Promise<void> {
  storeV3.totalClams.value = 0;
  storeV3.progressionLevel.value = 0;
  storeV3.currentRunPurchasedNodeIds.value = [];
  storeV3.currentRunPurchasedDiamondIds.value = [];

  if (!isDatabaseReady()) return;
  await resetCurrentRun();
}

/**
 * Convenience: create a fresh prestige state from defaults.
 */
export function freshPrestigeState() {
  return createPrestigeState();
}
