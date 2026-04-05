/**
 * World Snapshot -- Serialization for between-match save state.
 *
 * Does NOT save mid-match entity positions. Instead captures the run-level
 * state needed to recreate a match at the correct progression/difficulty
 * with the player's current upgrades applied.
 *
 * The current_run SQLite table already stores: clams, upgrades_purchased,
 * lodge_state, progression_level, matches_this_run. This module provides
 * typed helpers to read/write that data through store-v3 signals.
 */

import * as storeV3 from '@/ui/store-v3';

// -- Types ----------------------------------------------------------------

/** Snapshot of the data we persist between matches via current_run. */
export interface WorldSnapshot {
  clams: number;
  progressionLevel: number;
  matchesThisRun: number;
  upgradesPurchased: string[];
  commanderId: string;
}

// -- Serialization --------------------------------------------------------

/** Read current run state from store-v3 signals into a snapshot. */
export function captureRunSnapshot(commanderId: string): WorldSnapshot {
  return {
    clams: storeV3.totalClams.value,
    progressionLevel: storeV3.progressionLevel.value,
    matchesThisRun: 0, // incremented by caller after match
    upgradesPurchased: [], // upgrade web nodes tracked separately via store-v3-persistence
    commanderId,
  };
}

/** Check if the player has an active run (progression > 0 or clams > 0). */
export function hasActiveRun(): boolean {
  return storeV3.progressionLevel.value > 0 || storeV3.totalClams.value > 0;
}

/**
 * Determine whether PLAY should treat this as a fresh start or a continuation.
 * Returns 'continue' if the player has progression, 'fresh' otherwise.
 */
export function getRunState(): 'continue' | 'fresh' {
  if (storeV3.progressionLevel.value > 0) return 'continue';
  return 'fresh';
}
