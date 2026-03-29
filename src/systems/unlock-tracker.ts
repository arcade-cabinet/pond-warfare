/**
 * Unlock Tracker System
 *
 * Updates the player profile at game end and checks all unlock definitions
 * against the new profile to award newly earned unlocks. Shows floating text
 * notifications for each new unlock.
 *
 * Profile updates and unlock checks are fire-and-forget async (never block gameplay).
 */

import { query } from 'bitecs';
import { UNLOCKS } from '@/config/unlocks';
import { EntityTypeTag, FactionTag, Health, Veterancy } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import {
  getPlayerProfile,
  getUnlock,
  isDatabaseReady,
  setUnlock,
  updatePlayerProfile,
  type PlayerProfile,
} from '@/storage';
import { EntityKind, Faction } from '@/types';

/** Difficulty ranking for highest_difficulty_won comparisons. */
const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
  nightmare: 3,
  ultraNightmare: 4,
};

/** In-memory cache of unlocked IDs so we don't re-query SQLite every frame. */
const unlockedIds = new Set<string>();
let cacheLoaded = false;

/** In-memory cache of the player profile. */
let cachedProfile: PlayerProfile | null = null;

/**
 * Load existing unlocks from SQLite into memory.
 * Call once at app startup (after DB init).
 */
export async function loadUnlocks(): Promise<void> {
  if (!isDatabaseReady()) return;
  unlockedIds.clear();
  for (const def of UNLOCKS) {
    const isUnlocked = await getUnlock(def.id);
    if (isUnlocked) {
      unlockedIds.add(def.id);
    }
  }
  cachedProfile = await getPlayerProfile();
  cacheLoaded = true;
}

/** Check whether a specific unlock has been earned. */
export function isUnlocked(id: string): boolean {
  return unlockedIds.has(id);
}

/** Get the set of all unlocked IDs. */
export function getUnlockedIds(): ReadonlySet<string> {
  return unlockedIds;
}

/** Get the cached player profile (returns default values if not loaded yet). */
export function getCachedProfile(): PlayerProfile {
  return (
    cachedProfile ?? {
      total_wins: 0,
      total_losses: 0,
      total_kills: 0,
      total_games: 0,
      total_playtime_seconds: 0,
      highest_difficulty_won: '',
      longest_survival_seconds: 0,
      fastest_win_seconds: 0,
      total_buildings_built: 0,
      hero_units_earned: 0,
      wins_commander_alive: 0,
    }
  );
}

/**
 * Update the player profile based on the completed game and check for
 * newly earned unlocks. Fire-and-forget -- never blocks gameplay.
 *
 * Returns the list of newly unlocked names (for UI notification).
 */
export async function updateProfileAndCheckUnlocks(world: GameWorld): Promise<string[]> {
  if (!isDatabaseReady() || !cacheLoaded) return [];

  const profile = await getPlayerProfile();
  const won = world.state === 'win';
  const durationSeconds = Math.round(world.frameCount / 60);

  // Compute per-match stats
  const updates: Partial<PlayerProfile> = {
    total_games: profile.total_games + 1,
    total_kills: profile.total_kills + world.stats.unitsKilled,
    total_playtime_seconds: profile.total_playtime_seconds + durationSeconds,
    total_buildings_built: profile.total_buildings_built + world.stats.buildingsBuilt,
  };

  if (won) {
    updates.total_wins = profile.total_wins + 1;

    // Highest difficulty won
    const currentRank = DIFFICULTY_RANK[profile.highest_difficulty_won] ?? -1;
    const matchRank = DIFFICULTY_RANK[world.difficulty] ?? -1;
    if (matchRank > currentRank) {
      updates.highest_difficulty_won = world.difficulty;
    }

    // Fastest win
    if (
      profile.fastest_win_seconds === 0 ||
      durationSeconds < profile.fastest_win_seconds
    ) {
      updates.fastest_win_seconds = durationSeconds;
    }

    // Commander alive win
    let commanderAlive = false;
    const allUnits = query(world.ecs, [EntityTypeTag, FactionTag, Health]);
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (
        FactionTag.faction[eid] === Faction.Player &&
        (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Commander &&
        Health.current[eid] > 0
      ) {
        commanderAlive = true;
        break;
      }
    }
    if (commanderAlive) {
      updates.wins_commander_alive = profile.wins_commander_alive + 1;
    }
  } else {
    updates.total_losses = profile.total_losses + 1;
  }

  // Longest survival
  if (durationSeconds > profile.longest_survival_seconds) {
    updates.longest_survival_seconds = durationSeconds;
  }

  // Hero units earned (veterancy rank >= 3)
  let heroCount = 0;
  const vetUnits = query(world.ecs, [Veterancy, FactionTag, Health]);
  for (let i = 0; i < vetUnits.length; i++) {
    const eid = vetUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Veterancy.rank[eid] >= 3) heroCount++;
  }
  if (heroCount > 0) {
    updates.hero_units_earned = profile.hero_units_earned + heroCount;
  }

  // Write profile updates
  await updatePlayerProfile(updates);

  // Re-read updated profile for unlock checks
  const newProfile = await getPlayerProfile();
  cachedProfile = newProfile;

  // Check all unlocks
  const newlyUnlocked: string[] = [];
  for (const def of UNLOCKS) {
    if (unlockedIds.has(def.id)) continue;
    if (def.check(newProfile)) {
      await setUnlock(def.id, def.category);
      unlockedIds.add(def.id);
      newlyUnlocked.push(def.name);
    }
  }

  // Show floating text for new unlocks
  for (const name of newlyUnlocked) {
    const cx = world.camX + world.viewWidth / 2;
    const cy = world.camY + 90;
    world.floatingTexts.push({
      x: cx,
      y: cy,
      text: `Unlocked: ${name}!`,
      color: '#a78bfa',
      life: 240,
    });
  }

  return newlyUnlocked;
}
