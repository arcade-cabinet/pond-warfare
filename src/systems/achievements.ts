/**
 * Achievements System
 *
 * Tracks game milestones and persists them in SQLite.
 * Achievements are checked periodically (every ~30 seconds in-game)
 * and on game-over. Newly earned achievements show as floating text.
 */

import { query } from 'bitecs';
import type { TechState } from '@/config/tech-tree';
import { EntityTypeTag, FactionTag, Health, Veterancy } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { getSetting, isDatabaseReady, setSetting } from '@/storage';
import { EntityKind, Faction } from '@/types';

/** Snapshot of world state used by achievement check functions. */
export interface AchievementSnapshot {
  unitsKilled: number;
  unitsLost: number;
  killStreak: number;
  nestsDestroyed: number;
  won: boolean;
  lost: boolean;
  difficulty: string;
  maxVetRank: number;
  commanderAlive: boolean;
  gameMinutes: number;
  peakArmy: number;
  techCount: number;
  totalPearls: number;
  buildingsBuilt: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  check: (s: AchievementSnapshot) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    name: 'First Blood',
    desc: 'Kill your first enemy',
    check: (s) => s.unitsKilled >= 1,
  },
  {
    id: 'triple_kill',
    name: 'Triple Kill',
    desc: 'Get a 3-kill streak',
    check: (s) => s.killStreak >= 3,
  },
  {
    id: 'rampage',
    name: 'Rampage!',
    desc: 'Get a 5-kill streak',
    check: (s) => s.killStreak >= 5,
  },
  {
    id: 'nest_destroyer',
    name: 'Nest Destroyer',
    desc: 'Destroy an enemy nest',
    check: (s) => s.nestsDestroyed >= 1,
  },
  {
    id: 'victory',
    name: 'Victory',
    desc: 'Win a game',
    check: (s) => s.won,
  },
  {
    id: 'hard_victory',
    name: 'Hard Won',
    desc: 'Win on Hard difficulty',
    check: (s) => s.won && s.difficulty === 'hard',
  },
  {
    id: 'nightmare_victory',
    name: 'Nightmare Survivor',
    desc: 'Win on Nightmare',
    check: (s) => s.won && (s.difficulty === 'nightmare' || s.difficulty === 'ultraNightmare'),
  },
  {
    id: 'hero_unit',
    name: 'Hero of the Pond',
    desc: 'Promote a unit to Hero rank',
    check: (s) => s.maxVetRank >= 3,
  },
  {
    id: 'commander_alive',
    name: 'Untouchable',
    desc: 'Win without Commander dying',
    check: (s) => s.won && s.commanderAlive,
  },
  {
    id: 'speedrun_15',
    name: 'Speed Demon',
    desc: 'Win in under 15 minutes',
    check: (s) => s.won && s.gameMinutes < 15,
  },
  {
    id: 'army_20',
    name: 'War Machine',
    desc: 'Have 20+ combat units',
    check: (s) => s.peakArmy >= 20,
  },
  {
    id: 'full_tech',
    name: 'Scholar',
    desc: 'Research all 15 technologies',
    check: (s) => s.techCount >= 15,
  },
  {
    id: 'pearl_master',
    name: 'Pearl Diver',
    desc: 'Collect 100+ pearls',
    check: (s) => s.totalPearls >= 100,
  },
  {
    id: 'builder',
    name: 'Master Builder',
    desc: 'Build 10+ buildings',
    check: (s) => s.buildingsBuilt >= 10,
  },
  {
    id: 'survivor_30',
    name: 'Endurance',
    desc: 'Survive 30+ minutes',
    check: (s) => s.gameMinutes >= 30,
  },
];

/** Set of achievement IDs earned this session (in-memory cache). */
const earnedThisSession = new Set<string>();

/** Set of all earned achievement IDs (loaded from DB). */
const allEarned = new Set<string>();

/** Whether we've loaded from DB yet. */
let loaded = false;

/** Track cumulative pearl income this match. */
let totalPearlsThisMatch = 0;
let lastPearlCount = 0;

/** Track peak kill streak this match. */
let peakKillStreak = 0;

/** Track whether Commander has died this match. */
let commanderDied = false;

/**
 * Load earned achievements from SQLite into memory.
 * Call once at game start (after DB is initialized).
 */
export async function loadAchievements(): Promise<void> {
  if (!isDatabaseReady()) return;
  allEarned.clear();
  for (const ach of ACHIEVEMENTS) {
    const val = await getSetting(`achievement_${ach.id}`, '');
    if (val === 'true') {
      allEarned.add(ach.id);
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
  lastPearlCount = 0;
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
  // Track cumulative pearls (pearls can be spent, so we track income)
  if (world.resources.pearls > lastPearlCount) {
    totalPearlsThisMatch += world.resources.pearls - lastPearlCount;
  }
  lastPearlCount = world.resources.pearls;

  // Track peak kill streak
  if (world.killStreak.count > peakKillStreak) {
    peakKillStreak = world.killStreak.count;
  }

  // Count researched techs
  let techCount = 0;
  for (const val of Object.values(world.tech as TechState)) {
    if (val) techCount++;
  }

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

  // Check if Commander is alive
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
    gameMinutes: world.frameCount / 3600, // real minutes at 60fps
    peakArmy: world.stats.peakArmy,
    techCount,
    totalPearls: totalPearlsThisMatch,
    buildingsBuilt: world.stats.buildingsBuilt,
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
        setSetting(`achievement_${ach.id}`, 'true').catch(() => {
          /* best-effort */
        });
      }
    }
  }

  // Show floating text for newly earned achievements
  for (const name of newlyEarned) {
    // Show at camera center
    const cx = world.camX + world.viewWidth / 2;
    const cy = world.camY + 60;
    world.floatingTexts.push({
      x: cx,
      y: cy,
      text: `Achievement: ${name}!`,
      color: '#fbbf24',
      life: 180,
    });
  }

  return newlyEarned;
}
