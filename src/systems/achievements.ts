/**
 * Achievements System
 *
 * Tracks game milestones and persists them in SQLite.
 * Achievements are checked periodically (every ~30 seconds in-game)
 * and on game-over. Newly earned achievements show as floating text.
 */

import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, Veterancy } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { GameError, logError } from '@/errors';
import { getSetting, isDatabaseReady, setSetting } from '@/storage';
import { EntityKind, Faction } from '@/types';
import { showAchievementToast } from '@/ui/achievement-toast-queue';
import { ACHIEVEMENTS, type AchievementSnapshot } from './achievement-defs';

export type { AchievementDef, AchievementSnapshot } from './achievement-defs';
export { ACHIEVEMENTS } from './achievement-defs';

/** Set of achievement IDs earned this session (in-memory cache). */
const earnedThisSession = new Set<string>();

/** Set of all earned achievement IDs (loaded from DB). */
const allEarned = new Set<string>();

/** Whether we've loaded from DB yet. */
let loaded = false;

/** Track cumulative pearl income this match (read from world.stats.pearlsEarned). */
let totalPearlsThisMatch = 0;

/** Get the cumulative pearl income for the current match. */
export function getTotalPearlsThisMatch(): number {
  return totalPearlsThisMatch;
}

/** Track peak kill streak this match. */
let peakKillStreak = 0;

/** Track whether Commander has died this match. */
let commanderDied = false;

function reportAchievementStorageError(
  action: 'load' | 'save',
  achievementId: string,
  error: unknown,
) {
  logError(
    new GameError(`Failed to ${action} achievement "${achievementId}"`, 'systems/achievements', {
      cause: error,
      context: { action, achievementId },
    }),
  );
}

/**
 * Load earned achievements from SQLite into memory.
 * Call once at game start (after DB is initialized).
 */
export async function loadAchievements(): Promise<void> {
  if (!isDatabaseReady()) return;
  allEarned.clear();
  for (const ach of ACHIEVEMENTS) {
    try {
      const val = await getSetting(`achievement_${ach.id}`, '');
      if (val === 'true') {
        allEarned.add(ach.id);
      }
    } catch (error) {
      reportAchievementStorageError('load', ach.id, error);
    }
  }
  loaded = true;
}

/**
 * Reset per-match tracking. Call when a new game starts.
 */
export function resetAchievementMatchState(): void {
  earnedThisSession.clear();
  totalPearlsThisMatch = 0;
  peakKillStreak = 0;
  commanderDied = false;
}

/**
 * Get all earned achievement IDs.
 */
export function getEarnedAchievements(): ReadonlySet<string> {
  return allEarned;
}

/**
 * Build a snapshot of the current world state for achievement checking.
 */
function buildSnapshot(world: GameWorld): AchievementSnapshot {
  // Use the authoritative pearlsEarned counter from stats (only increments)
  totalPearlsThisMatch = world.stats.pearlsEarned;

  // Track peak kill streak
  if (world.killStreak.count > peakKillStreak) {
    peakKillStreak = world.killStreak.count;
  }

  // Count researched techs (v3.0: in-game research removed, count whatever is truthy).
  let techCount = 0;
  for (const val of Object.values(world.tech)) {
    if (val) techCount++;
  }
  const maxBranchTechCount = 0;
  const hasNonShadowTech = false;

  // Find max veterancy rank among player units
  let maxVetRank = 0;
  const vetUnits = query(world.ecs, [Veterancy, FactionTag, Health]);
  for (let i = 0; i < vetUnits.length; i++) {
    const eid = vetUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (Veterancy.rank[eid] > maxVetRank) {
      maxVetRank = Veterancy.rank[eid];
    }
  }

  // Check if Commander is alive and at full HP
  let commanderAlive = false;
  let commanderFullHp = false;
  const allUnits = query(world.ecs, [EntityTypeTag, FactionTag, Health]);
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (
      FactionTag.faction[eid] === Faction.Player &&
      (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Commander &&
      Health.current[eid] > 0
    ) {
      commanderAlive = true;
      commanderFullHp = Health.current[eid] >= Health.max[eid];
      break;
    }
  }

  // Track Commander death (once dead, stays dead for the match)
  if (!commanderAlive && !commanderDied) {
    // Check if Commander was ever spawned (check for dead Commanders too)
    // If there's no Commander at all, they never had one - don't flag as died
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (
        FactionTag.faction[eid] === Faction.Player &&
        (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Commander
      ) {
        commanderDied = true;
        break;
      }
    }
  }

  // Count destroyed nests
  let aliveNests = 0;
  let totalNests = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.PredatorNest) continue;
    totalNests++;
    if (Health.current[eid] > 0) aliveNests++;
  }

  // Extended stats -- read from world.extendedStats if available, else 0
  const ext = world.extendedStats ?? {};

  return {
    unitsKilled: world.stats.unitsKilled,
    unitsLost: world.stats.unitsLost,
    killStreak: peakKillStreak,
    nestsDestroyed: totalNests - aliveNests,
    won: world.state === 'win',
    lost: world.state === 'lose',
    difficulty: world.difficulty,
    maxVetRank,
    commanderAlive: !commanderDied,
    commanderFullHp: !commanderDied && commanderFullHp,
    gameMinutes: world.frameCount / 3600, // real minutes at 60fps
    peakArmy: world.stats.peakArmy,
    techCount,
    maxBranchTechCount,
    totalPearls: totalPearlsThisMatch,
    totalFish: world.stats.totalFishEarned,
    buildingsBuilt: world.stats.buildingsBuilt,
    buildingsLost: world.stats.buildingsLost,
    onlyShadowTechs: techCount > 0 && !hasNonShadowTech,
    // v2.1.0 -- extended stats
    weatherTypesExperienced: ext.weatherTypesExperienced ?? 0,
    marketTrades: ext.marketTrades ?? 0,
    coopMode: ext.coopMode ?? false,
    dailyChallengesCompleted: ext.dailyChallengesCompleted ?? 0,
    playerLevel: ext.playerLevel ?? 1,
    perfectPuzzleCount: ext.perfectPuzzleCount ?? 0,
    randomEventsExperienced: ext.randomEventsExperienced ?? 0,
    wallsBuilt: ext.wallsBuilt ?? 0,
  };
}

/**
 * Check achievements and award newly earned ones.
 * Call every ~30 seconds (1800 frames) and on game-over.
 *
 * Returns list of newly earned achievement names for UI display.
 */
export async function checkAchievements(world: GameWorld): Promise<string[]> {
  if (!loaded) return [];

  const snapshot = buildSnapshot(world);
  const newlyEarned: string[] = [];

  for (const ach of ACHIEVEMENTS) {
    // Skip already earned (globally or this session)
    if (allEarned.has(ach.id)) continue;
    if (earnedThisSession.has(ach.id)) continue;

    if (ach.check(snapshot)) {
      earnedThisSession.add(ach.id);
      allEarned.add(ach.id);
      newlyEarned.push(ach.name);

      // Persist to SQLite (fire-and-forget)
      if (isDatabaseReady()) {
        setSetting(`achievement_${ach.id}`, 'true').catch((error) => {
          reportAchievementStorageError('save', ach.id, error);
        });
      }
    }
  }

  // Show prominent toast for newly earned achievements
  for (const ach of ACHIEVEMENTS) {
    if (newlyEarned.includes(ach.name)) {
      showAchievementToast(ach.name, ach.desc);
    }
  }

  return newlyEarned;
}
