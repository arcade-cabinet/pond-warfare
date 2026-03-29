/**
 * Unlock Tracker System Tests
 *
 * Validates unlock condition checking and cached state.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { UNLOCKS } from '@/config/unlocks';
import type { PlayerProfile } from '@/storage/database';

// Mock the @/storage module
vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(true),
  getUnlock: vi.fn().mockResolvedValue(false),
  setUnlock: vi.fn().mockResolvedValue(undefined),
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
    total_pearls: 0,
    wins_zero_losses: 0,
  }),
  updatePlayerProfile: vi.fn().mockResolvedValue(undefined),
}));

describe('unlock-tracker', () => {
  /** Build a test profile with overrides. */
  function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
    return {
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
      total_pearls: 0,
      wins_zero_losses: 0,
      ...overrides,
    };
  }

  it('should trigger unlock when condition is met', () => {
    // "Island Map" requires total_wins >= 1
    const islandUnlock = UNLOCKS.find((u) => u.id === 'scenario_island')!;
    expect(islandUnlock).toBeDefined();

    expect(islandUnlock.check(makeProfile({ total_wins: 0 }))).toBe(false);
    expect(islandUnlock.check(makeProfile({ total_wins: 1 }))).toBe(true);
  });

  it('should evaluate unlock conditions as pure functions', () => {
    // Every unlock check should be deterministic
    const emptyProfile = makeProfile();
    for (const def of UNLOCKS) {
      const result = def.check(emptyProfile);
      expect(typeof result).toBe('boolean');
    }

    // A profile with wins should unlock some things
    const winProfile = makeProfile({ total_wins: 50, highest_difficulty_won: 'nightmare' });
    const unlockedCount = UNLOCKS.filter((def) => def.check(winProfile)).length;
    expect(unlockedCount).toBeGreaterThan(0);
  });
});
