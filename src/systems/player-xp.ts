/**
 * Player XP & Level System
 *
 * Every game awards XP based on performance. XP accumulates across games
 * and determines the player's level. Stored in the player_profile table.
 */

import type { GameEndStats } from './daily-challenges';

// ---------------------------------------------------------------------------
// XP Calculation
// ---------------------------------------------------------------------------

/** Difficulty XP bonuses. */
const DIFFICULTY_XP: Record<string, number> = {
  easy: 0,
  normal: 50,
  hard: 100,
  nightmare: 200,
  ultraNightmare: 300,
};

export interface XpBreakdown {
  base: number;
  winBonus: number;
  difficultyBonus: number;
  killBonus: number;
  buildingBonus: number;
  techBonus: number;
  dailyChallengeBonus: number;
  total: number;
}

/**
 * Calculate XP earned from a single game.
 *
 * @param stats - End-of-game stats snapshot
 * @param dailyChallengeXp - XP from daily challenge completion (0 if not completed)
 */
export function calculateXp(stats: GameEndStats, dailyChallengeXp: number = 0): XpBreakdown {
  const base = 100;
  const winBonus = stats.result === 'win' ? 200 : 0;
  const difficultyBonus = DIFFICULTY_XP[stats.difficulty] ?? 0;
  const killBonus = stats.kills * 2;
  const buildingBonus = stats.buildingsBuilt * 5;
  const techBonus = stats.techsResearched * 10;
  const dailyChallengeBonus = dailyChallengeXp;

  const total =
    base + winBonus + difficultyBonus + killBonus + buildingBonus + techBonus + dailyChallengeBonus;

  return {
    base,
    winBonus,
    difficultyBonus,
    killBonus,
    buildingBonus,
    techBonus,
    dailyChallengeBonus,
    total,
  };
}

// ---------------------------------------------------------------------------
// Level Calculation
// ---------------------------------------------------------------------------

/**
 * Level N requires N * 500 cumulative XP.
 * Level 0 = 0 XP, Level 1 = 500 XP, Level 2 = 1000 XP, etc.
 */
export function getLevel(totalXp: number): number {
  if (totalXp <= 0) return 0;
  return Math.floor(totalXp / 500);
}

/** XP needed to reach the next level from current total XP. */
export function xpToNextLevel(totalXp: number): number {
  const nextLevelXp = (getLevel(totalXp) + 1) * 500;
  return nextLevelXp - totalXp;
}

/** XP progress within the current level (0 to 499). */
export function xpInCurrentLevel(totalXp: number): number {
  return totalXp % 500;
}

/** XP required for the current level boundary (start of current level). */
export function currentLevelXp(totalXp: number): number {
  return getLevel(totalXp) * 500;
}

/** XP required for the next level boundary. */
export function nextLevelXp(totalXp: number): number {
  return (getLevel(totalXp) + 1) * 500;
}

/** Progress fraction within the current level (0.0 to 1.0). */
export function levelProgress(totalXp: number): number {
  return xpInCurrentLevel(totalXp) / 500;
}
