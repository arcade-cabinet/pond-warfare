/**
 * Daily Challenge System
 *
 * A pool of challenge templates that rotate daily. The active challenge
 * is selected deterministically from the date so every player sees the same
 * one. Completion and streaks are tracked in the SQLite settings table.
 */

import type { GameStats } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChallengeType =
  | 'speed'
  | 'no_loss'
  | 'tech'
  | 'economy'
  | 'combat'
  | 'building'
  | 'general';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  /** Return true when the challenge objective is met. */
  objective: (stats: GameEndStats) => boolean;
  xpReward: number;
}

/** Stats snapshot available at game end for challenge evaluation. */
export interface GameEndStats {
  result: 'win' | 'loss';
  difficulty: string;
  commander: string;
  scenario: string;
  durationSeconds: number;
  kills: number;
  unitsLost: number;
  buildingsBuilt: number;
  techsResearched: number;
  nestsDestroyed: number;
  totalFishEarned: number;
  unitsTrained: number;
  pearlsEarned: number;
  /** Number of distinct commander abilities used this game. */
  commanderAbilitiesUsed: number;
  /** Number of towers built. */
  towersBuilt: number;
  /** Number of non-Mudpaw units trained. */
  combatUnitsTrained: number;
  /** Highest survival wave reached (0 if not survival mode). */
  survivalWaveReached: number;
  gameStats: GameStats;
}

// ---------------------------------------------------------------------------
// Challenge pool
// ---------------------------------------------------------------------------

const CHALLENGES: DailyChallenge[] = [
  {
    id: 'basic_units_only',
    title: 'Back to Basics',
    description:
      'Win with Mudpaws and buildings only (no Medics, Sappers, Saboteurs, or specialists)',
    type: 'general',
    objective: (s) => s.result === 'win' && s.combatUnitsTrained === 0,
    xpReward: 250,
  },
  {
    id: 'destroy_3_nests',
    title: 'Nest Breaker',
    description: 'Destroy 3 enemy nests in one game',
    type: 'combat',
    objective: (s) => s.nestsDestroyed >= 3,
    xpReward: 200,
  },
  {
    id: 'speed_run',
    title: 'Speed Run',
    description: 'Win in under 8 minutes',
    type: 'speed',
    objective: (s) => s.result === 'win' && s.durationSeconds < 480,
    xpReward: 300,
  },
  {
    id: 'speed_run_10',
    title: 'Against the Clock',
    description: 'Win in under 10 minutes',
    type: 'speed',
    objective: (s) => s.result === 'win' && s.durationSeconds < 600,
    xpReward: 200,
  },
  {
    id: 'tech_rush',
    title: 'Scholar Rush',
    description: 'Research at least 5 techs in one game',
    type: 'tech',
    objective: (s) => s.techsResearched >= 5,
    xpReward: 200,
  },
  {
    id: 'tech_rush_8',
    title: 'Knowledge Seeker',
    description: 'Research 8 techs in one game',
    type: 'tech',
    objective: (s) => s.techsResearched >= 8,
    xpReward: 350,
  },
  {
    id: 'no_building_loss',
    title: 'Fortress',
    description: 'Win without losing a building',
    type: 'no_loss',
    objective: (s) => s.result === 'win' && s.gameStats.buildingsLost === 0,
    xpReward: 250,
  },
  {
    id: 'accumulate_fish',
    title: 'Fish Hoarder',
    description: 'Accumulate 3000 fish in a single game',
    type: 'economy',
    objective: (s) => s.totalFishEarned >= 3000,
    xpReward: 150,
  },
  {
    id: 'economy_only',
    title: 'Economic Victory',
    description: 'Win after earning at least 4000 fish in one game',
    type: 'economy',
    objective: (s) => s.result === 'win' && s.totalFishEarned >= 4000,
    xpReward: 400,
  },
  {
    id: 'train_20_units',
    title: 'Mass Mobilization',
    description: 'Train 20 units in a single game',
    type: 'general',
    objective: (s) => s.unitsTrained >= 20,
    xpReward: 150,
  },
  {
    id: 'hard_difficulty',
    title: 'Hardened Warrior',
    description: 'Win on Hard difficulty or higher',
    type: 'combat',
    objective: (s) =>
      s.result === 'win' && ['hard', 'nightmare', 'ultraNightmare'].includes(s.difficulty),
    xpReward: 250,
  },
  {
    id: 'commander_abilities',
    title: 'Ability Master',
    description: 'Use 3 different commander abilities in one game',
    type: 'general',
    objective: (s) => s.commanderAbilitiesUsed >= 3,
    xpReward: 200,
  },
  {
    id: 'build_5_towers',
    title: 'Tower Defense',
    description: 'Build 5 Towers in a single game',
    type: 'building',
    objective: (s) => s.towersBuilt >= 5,
    xpReward: 200,
  },
  {
    id: 'win_ironpaw',
    title: 'Iron Will',
    description: 'Win with the Ironpaw commander',
    type: 'general',
    objective: (s) => s.result === 'win' && s.commander === 'ironpaw',
    xpReward: 200,
  },
  {
    id: 'kill_20',
    title: 'Predator Hunter',
    description: 'Defeat 20 enemies in a single game',
    type: 'combat',
    objective: (s) => s.kills >= 20,
    xpReward: 150,
  },
  {
    id: 'build_10_buildings',
    title: 'Master Builder',
    description: 'Build 10 or more buildings in one game',
    type: 'building',
    objective: (s) => s.buildingsBuilt >= 10,
    xpReward: 150,
  },
  {
    id: 'no_unit_loss',
    title: 'Untouchable',
    description: 'Win without losing any units',
    type: 'no_loss',
    objective: (s) => s.result === 'win' && s.unitsLost === 0,
    xpReward: 300,
  },
  {
    id: 'pearl_collector',
    title: 'Pearl Diver',
    description: 'Earn 100 pearls in a single game',
    type: 'economy',
    objective: (s) => s.pearlsEarned >= 100,
    xpReward: 200,
  },
  {
    id: 'survival_15',
    title: 'Endurance',
    description: 'Reach wave 15 in survival mode',
    type: 'combat',
    objective: (s) => s.survivalWaveReached >= 15,
    xpReward: 350,
  },
];

// ---------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------

/** Milliseconds in one day. */
const MS_PER_DAY = 86_400_000;

/** Days since Unix epoch (UTC). */
export function daysSinceEpoch(date: Date = new Date()): number {
  return Math.floor(date.getTime() / MS_PER_DAY);
}

/** Get today's daily challenge (deterministic from UTC date). */
export function getDailyChallenge(date: Date = new Date()): DailyChallenge {
  const idx = daysSinceEpoch(date) % CHALLENGES.length;
  return CHALLENGES[idx];
}

/** Get the full challenge pool (for tests). */
export function getAllChallenges(): readonly DailyChallenge[] {
  return CHALLENGES;
}

// ---------------------------------------------------------------------------
// Persistence helpers (settings table key format)
// ---------------------------------------------------------------------------

/** Settings key for a given date's challenge completion. */
export function dailyChallengeKey(date: Date = new Date()): string {
  const iso = date.toISOString().slice(0, 10); // YYYY-MM-DD
  return `daily_challenge_${iso}`;
}

/** Milliseconds in one day (re-exported for streak module). */
export { MS_PER_DAY };
