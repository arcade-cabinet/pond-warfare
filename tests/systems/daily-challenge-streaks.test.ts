/**
 * Daily Challenge Streak Tests
 *
 * Validates streak calculation, reset on missed days, bonus tier selection,
 * and 7-day history builder.
 */

import { describe, expect, it } from 'vitest';
import {
  buildRecentHistory,
  type ChallengeHistoryEntry,
  calculateStreak,
  getStreakBonus,
  STREAK_BONUSES,
} from '@/systems/daily-challenge-streaks';

/** Build a simple history array from date strings and completion booleans. */
function makeHistory(entries: Array<[string, boolean]>): ChallengeHistoryEntry[] {
  return entries.map(([date, completed]) => ({
    date,
    challengeId: 'test',
    challengeTitle: 'Test',
    completed,
  }));
}

describe('daily-challenge-streaks', () => {
  describe('calculateStreak', () => {
    it('returns 0 for empty history', () => {
      expect(calculateStreak([], new Date('2026-04-02T12:00:00Z'))).toBe(0);
    });

    it('returns 0 when no challenges completed', () => {
      const history = makeHistory([
        ['2026-04-01', false],
        ['2026-04-02', false],
      ]);
      expect(calculateStreak(history, new Date('2026-04-02T12:00:00Z'))).toBe(0);
    });

    it('returns 1 when only today is completed', () => {
      const history = makeHistory([
        ['2026-04-01', false],
        ['2026-04-02', true],
      ]);
      expect(calculateStreak(history, new Date('2026-04-02T12:00:00Z'))).toBe(1);
    });

    it('counts consecutive days including today', () => {
      const history = makeHistory([
        ['2026-03-30', true],
        ['2026-03-31', true],
        ['2026-04-01', true],
        ['2026-04-02', true],
      ]);
      expect(calculateStreak(history, new Date('2026-04-02T12:00:00Z'))).toBe(4);
    });

    it('keeps streak alive when today is incomplete but yesterday was done', () => {
      const history = makeHistory([
        ['2026-03-31', true],
        ['2026-04-01', true],
        ['2026-04-02', false],
      ]);
      expect(calculateStreak(history, new Date('2026-04-02T12:00:00Z'))).toBe(2);
    });

    it('resets streak when a day is missed', () => {
      const history = makeHistory([
        ['2026-03-29', true],
        ['2026-03-30', false], // missed
        ['2026-03-31', true],
        ['2026-04-01', true],
        ['2026-04-02', true],
      ]);
      // Streak should be 3 (Mar 31, Apr 1, Apr 2), not 4
      expect(calculateStreak(history, new Date('2026-04-02T12:00:00Z'))).toBe(3);
    });

    it('returns 0 when last completion was 2+ days ago', () => {
      const history = makeHistory([
        ['2026-03-29', true],
        ['2026-03-30', true],
        ['2026-03-31', false],
        ['2026-04-01', false],
        ['2026-04-02', false],
      ]);
      expect(calculateStreak(history, new Date('2026-04-02T12:00:00Z'))).toBe(0);
    });
  });

  describe('getStreakBonus', () => {
    it('returns null for streak under 3', () => {
      expect(getStreakBonus(0)).toBeNull();
      expect(getStreakBonus(1)).toBeNull();
      expect(getStreakBonus(2)).toBeNull();
    });

    it('returns 3-day bonus for streak of 3-6', () => {
      const bonus = getStreakBonus(3);
      expect(bonus).toBeDefined();
      expect(bonus?.days).toBe(3);
      expect(bonus?.xp).toBe(100);

      expect(getStreakBonus(5)?.days).toBe(3);
    });

    it('returns 7-day bonus for streak of 7+', () => {
      const bonus = getStreakBonus(7);
      expect(bonus).toBeDefined();
      expect(bonus?.days).toBe(7);
      expect(bonus?.xp).toBe(500);
      expect(bonus?.cosmeticUnlock).toBe(true);

      // Streak above 7 still gets the 7-day bonus
      expect(getStreakBonus(10)?.days).toBe(7);
    });
  });

  describe('STREAK_BONUSES', () => {
    it('has at least 2 tiers', () => {
      expect(STREAK_BONUSES.length).toBeGreaterThanOrEqual(2);
    });

    it('tiers are ordered by ascending days', () => {
      for (let i = 1; i < STREAK_BONUSES.length; i++) {
        expect(STREAK_BONUSES[i].days).toBeGreaterThan(STREAK_BONUSES[i - 1].days);
      }
    });
  });

  describe('buildRecentHistory', () => {
    it('returns 7 entries', () => {
      const history = buildRecentHistory(new Set(), new Date('2026-04-02T12:00:00Z'));
      expect(history.length).toBe(7);
    });

    it('marks completed dates correctly', () => {
      const completed = new Set(['2026-04-01', '2026-04-02']);
      const history = buildRecentHistory(completed, new Date('2026-04-02T12:00:00Z'));

      const apr1 = history.find((h) => h.date === '2026-04-01');
      const apr2 = history.find((h) => h.date === '2026-04-02');
      const mar27 = history.find((h) => h.date === '2026-03-27');

      expect(apr1?.completed).toBe(true);
      expect(apr2?.completed).toBe(true);
      expect(mar27?.completed).toBe(false);
    });

    it('spans 7 consecutive days ending at endDate', () => {
      const endDate = new Date('2026-04-02T12:00:00Z');
      const history = buildRecentHistory(new Set(), endDate);

      expect(history[0].date).toBe('2026-03-27');
      expect(history[6].date).toBe('2026-04-02');
    });

    it('each entry has a valid challenge title', () => {
      const history = buildRecentHistory(new Set(), new Date('2026-04-02T12:00:00Z'));
      for (const entry of history) {
        expect(entry.challengeTitle).toBeTruthy();
        expect(entry.challengeId).toBeTruthy();
      }
    });
  });
});
