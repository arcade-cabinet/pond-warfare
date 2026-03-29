/**
 * Leaderboard System Tests
 *
 * Validates rank computation and win streak tracking.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  getRank,
  winsToNextRank,
} from '@/systems/leaderboard';

// Mock the @/storage module to avoid SQLite dependency
vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(true),
  getSetting: vi.fn().mockResolvedValue('0'),
  setSetting: vi.fn().mockResolvedValue(undefined),
  getPlayerProfile: vi.fn().mockResolvedValue({
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
  }),
}));

describe('leaderboard', () => {
  it('should compute rank correctly from wins', () => {
    // Bronze: 0-4 wins
    expect(getRank(0).tier).toBe('bronze');
    expect(getRank(4).tier).toBe('bronze');

    // Silver: 5-14 wins
    expect(getRank(5).tier).toBe('silver');
    expect(getRank(14).tier).toBe('silver');

    // Gold: 15-29 wins
    expect(getRank(15).tier).toBe('gold');
    expect(getRank(29).tier).toBe('gold');

    // Diamond: 30+ wins
    expect(getRank(30).tier).toBe('diamond');
    expect(getRank(100).tier).toBe('diamond');
  });

  it('should track wins needed for next rank correctly', () => {
    // At 0 wins (bronze), need 5 to reach silver
    expect(winsToNextRank(0)).toBe(5);

    // At 4 wins (bronze), need 1 to reach silver
    expect(winsToNextRank(4)).toBe(1);

    // At 5 wins (silver), need 10 to reach gold
    expect(winsToNextRank(5)).toBe(10);

    // At 14 wins (silver), need 1 to reach gold
    expect(winsToNextRank(14)).toBe(1);

    // At 30 wins (diamond, max rank), no more ranks
    expect(winsToNextRank(30)).toBe(0);
  });
});
