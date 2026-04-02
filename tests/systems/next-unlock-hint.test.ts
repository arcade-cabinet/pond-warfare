/**
 * Next Unlock Hint Tests
 *
 * Validates that the hint system picks the closest unmet requirement
 * and returns appropriate hint text.
 */

import { describe, expect, it } from 'vitest';
import type { PlayerProfile } from '@/storage/database';
import { getNextUnlockHint } from '@/systems/next-unlock-hint';

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
    total_xp: 0,
    player_level: 0,
    ...overrides,
  };
}

describe('getNextUnlockHint', () => {
  it('should return a hint for a fresh profile', () => {
    const result = getNextUnlockHint(makeProfile());
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected hint');
    expect(result.text).toContain('to unlock');
    expect(result.progress).toBeGreaterThanOrEqual(0);
  });

  it('should pick the closest unlock based on progress', () => {
    const result = getNextUnlockHint(makeProfile({ total_games: 2 }));
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected hint');
    // Should pick sandbox (2/3 = 0.667 progress) over island (0/1 = 0)
    expect(result.text).toContain('Sandbox');
    expect(result.progress).toBeCloseTo(2 / 3, 1);
  });

  it('should skip already-unlocked items', () => {
    const result = getNextUnlockHint(makeProfile({ total_wins: 1 }));
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected hint');
    // Should NOT suggest Island Map since it's already unlocked
    expect(result.text).not.toContain('Island Map');
  });

  it('should return null when all unlocks are earned', () => {
    const result = getNextUnlockHint(
      makeProfile({
        total_wins: 50,
        total_games: 100,
        total_kills: 1000,
        highest_difficulty_won: 'ultraNightmare',
        longest_survival_seconds: 5400,
        fastest_win_seconds: 600,
        total_buildings_built: 100,
        hero_units_earned: 10,
        wins_commander_alive: 10,
        total_pearls: 200,
        wins_zero_losses: 5,
      }),
    );
    expect(result).toBeNull();
  });

  it('should handle difficulty-based unlocks correctly', () => {
    const result = getNextUnlockHint(
      makeProfile({
        total_wins: 5,
        total_games: 10,
        total_kills: 60,
        total_buildings_built: 12,
        highest_difficulty_won: 'normal',
      }),
    );
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected hint');
    expect(result.progress).toBeGreaterThan(0);
    expect(result.progress).toBeLessThan(1);
  });

  it('should report progress as a ratio between 0 and 1', () => {
    const result = getNextUnlockHint(makeProfile({ total_kills: 25 }));
    expect(result).not.toBeNull();
    if (!result) throw new Error('Expected hint');
    expect(result.progress).toBeGreaterThanOrEqual(0);
    expect(result.progress).toBeLessThanOrEqual(1);
  });
});
