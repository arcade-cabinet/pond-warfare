/**
 * Daily Challenge Streaks
 *
 * Streak tracking, bonus calculation, and 7-day history builder.
 * Split from daily-challenges.ts for file size compliance.
 */

import { getDailyChallenge, MS_PER_DAY } from './daily-challenges';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StreakBonus {
  days: number;
  xp: number;
  label: string;
  /** If true, this tier also unlocks an exclusive cosmetic. */
  cosmeticUnlock?: boolean;
}

export interface ChallengeHistoryEntry {
  date: string; // YYYY-MM-DD
  challengeId: string;
  challengeTitle: string;
  completed: boolean;
}

// ---------------------------------------------------------------------------
// Streak bonuses
// ---------------------------------------------------------------------------

export const STREAK_BONUSES: readonly StreakBonus[] = [
  { days: 3, xp: 100, label: '3-day streak bonus' },
  { days: 7, xp: 500, label: '7-day streak + cosmetic unlock', cosmeticUnlock: true },
];

/** Get the best applicable streak bonus for a given streak count. */
export function getStreakBonus(streak: number): StreakBonus | null {
  let best: StreakBonus | null = null;
  for (const b of STREAK_BONUSES) {
    if (streak >= b.days && (!best || b.days > best.days)) best = b;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Streak calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the current streak from a history of challenge entries.
 * Streak counts consecutive completed days ending at today or yesterday.
 * If today is incomplete but yesterday was completed, streak is still live.
 */
export function calculateStreak(
  history: ChallengeHistoryEntry[],
  today: Date = new Date(),
): number {
  const completed = history.filter((h) => h.completed).map((h) => h.date);
  if (completed.length === 0) return 0;

  const todayStr = today.toISOString().slice(0, 10);
  const yesterdayStr = new Date(today.getTime() - MS_PER_DAY).toISOString().slice(0, 10);

  const completedSet = new Set(completed);
  // Streak must include today or yesterday to be live
  if (!completedSet.has(todayStr) && !completedSet.has(yesterdayStr)) return 0;

  // Count backwards from the most recent completed day
  const startStr = completedSet.has(todayStr) ? todayStr : yesterdayStr;
  let streak = 0;
  let checkDate = new Date(`${startStr}T00:00:00Z`);

  while (completedSet.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate = new Date(checkDate.getTime() - MS_PER_DAY);
  }

  return streak;
}

// ---------------------------------------------------------------------------
// History builder
// ---------------------------------------------------------------------------

/**
 * Build a 7-day challenge history array ending at the given date.
 * Each entry shows which challenge was active and whether it was completed.
 */
export function buildRecentHistory(
  completedDates: Set<string>,
  endDate: Date = new Date(),
): ChallengeHistoryEntry[] {
  const entries: ChallengeHistoryEntry[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(endDate.getTime() - i * MS_PER_DAY);
    const dateStr = d.toISOString().slice(0, 10);
    const challenge = getDailyChallenge(d);
    entries.push({
      date: dateStr,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      completed: completedDates.has(dateStr),
    });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Persistence keys
// ---------------------------------------------------------------------------

/** Settings key for streak count. */
export const STREAK_KEY = 'daily_challenge_streak';
