/**
 * Leaderboard & Ranked Progression System
 *
 * Tracks personal bests and computes rank from total wins.
 * All data is derived from the SQLite game_history and player_profile tables.
 *
 * Rank tiers:
 *   Bronze   — 0-4 wins
 *   Silver   — 5-14 wins
 *   Gold     — 15-29 wins
 *   Diamond  — 30+ wins
 */

import { getPlayerProfile } from '@/storage';

// ---------------------------------------------------------------------------
// Rank definitions
// ---------------------------------------------------------------------------

export type RankTier = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface RankInfo {
  tier: RankTier;
  label: string;
  color: string;
  icon: string;
  minWins: number;
}

const RANKS: RankInfo[] = [
  { tier: 'bronze', label: 'Bronze', color: '#cd7f32', icon: '\u25C6', minWins: 0 },
  { tier: 'silver', label: 'Silver', color: '#c0c0c0', icon: '\u25C6', minWins: 5 },
  { tier: 'gold', label: 'Gold', color: '#ffd700', icon: '\u25C6', minWins: 15 },
  { tier: 'diamond', label: 'Diamond', color: '#b9f2ff', icon: '\u2666', minWins: 30 },
];

/** Compute rank from total wins. */
export function getRank(totalWins: number): RankInfo {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalWins >= RANKS[i].minWins) return RANKS[i];
  }
  return RANKS[0];
}

/** Wins needed to reach the next rank, or 0 if at max. */
export function winsToNextRank(totalWins: number): number {
  const current = getRank(totalWins);
  const idx = RANKS.indexOf(current);
  if (idx >= RANKS.length - 1) return 0;
  return RANKS[idx + 1].minWins - totalWins;
}

// ---------------------------------------------------------------------------
// Leaderboard data (personal bests derived from player_profile)
// ---------------------------------------------------------------------------

export interface LeaderboardData {
  rank: RankInfo;
  totalWins: number;
  totalLosses: number;
  totalGames: number;
  totalKills: number;
  fastestWinSeconds: number;
  longestSurvivalSeconds: number;
  totalPlaytimeSeconds: number;
  highestDifficultyWon: string;
  winStreak: number;
  bestWinStreak: number;
}

/**
 * Load leaderboard data from SQLite. Reads player_profile and
 * computes win streaks from game_history.
 */
export async function loadLeaderboardData(): Promise<LeaderboardData> {
  const profile = await getPlayerProfile();
  const { currentStreak, bestStreak } = await computeWinStreaks();

  return {
    rank: getRank(profile.total_wins),
    totalWins: profile.total_wins,
    totalLosses: profile.total_losses,
    totalGames: profile.total_games,
    totalKills: profile.total_kills,
    fastestWinSeconds: profile.fastest_win_seconds,
    longestSurvivalSeconds: profile.longest_survival_seconds,
    totalPlaytimeSeconds: profile.total_playtime_seconds,
    highestDifficultyWon: profile.highest_difficulty_won,
    winStreak: currentStreak,
    bestWinStreak: bestStreak,
  };
}

// ---------------------------------------------------------------------------
// Win streak computation
// ---------------------------------------------------------------------------

/**
 * Compute current and best win streaks from the player_profile.
 *
 * We use a simple heuristic: the current streak is the lesser of
 * total_wins (in case they haven't lost yet) and total_games - total_losses
 * at the tail. For a more accurate approach we would need game_history
 * ordered rows, but the profile gives us a solid approximation.
 *
 * To get accurate streaks we store them in the settings table.
 */
async function computeWinStreaks(): Promise<{ currentStreak: number; bestStreak: number }> {
  // Win streaks are tracked via settings keys for accuracy
  const { getSetting } = await import('@/storage');
  const current = Number(await getSetting('win_streak_current', '0'));
  const best = Number(await getSetting('win_streak_best', '0'));
  return { currentStreak: current, bestStreak: best };
}

/**
 * Update win streak after a game ends. Call from the game-over handler.
 *
 * @param won Whether the player won
 */
export async function updateWinStreak(won: boolean): Promise<void> {
  const { getSetting, setSetting } = await import('@/storage');
  let current = Number(await getSetting('win_streak_current', '0'));
  let best = Number(await getSetting('win_streak_best', '0'));

  if (won) {
    current += 1;
    if (current > best) best = current;
  } else {
    current = 0;
  }

  await setSetting('win_streak_current', String(current));
  await setSetting('win_streak_best', String(best));
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Format seconds as "Xm Ys" or "--" if zero. */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Format playtime as hours/minutes. */
export function formatPlaytime(seconds: number): string {
  if (seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
