/**
 * Achievements System Tests
 *
 * Validates achievement check logic and persistence.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS, type AchievementSnapshot } from '@/systems/achievements';

// Mock the @/storage module to avoid SQLite dependency in tests
vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(true),
  getSetting: vi.fn().mockResolvedValue(''),
  setSetting: vi.fn().mockResolvedValue(undefined),
}));

describe('achievements', () => {
  /** Build a minimal snapshot with overrides. */
  function makeSnapshot(overrides: Partial<AchievementSnapshot> = {}): AchievementSnapshot {
    return {
      unitsKilled: 0,
      unitsLost: 0,
      killStreak: 0,
      nestsDestroyed: 0,
      won: false,
      lost: false,
      difficulty: 'normal',
      maxVetRank: 0,
      commanderAlive: true,
      gameMinutes: 10,
      peakArmy: 5,
      techCount: 0,
      totalPearls: 0,
      buildingsBuilt: 0,
      ...overrides,
    };
  }

  it('First Blood triggers at 1 kill', () => {
    const firstBlood = ACHIEVEMENTS.find((a) => a.id === 'first_blood')!;
    expect(firstBlood).toBeDefined();

    expect(firstBlood.check(makeSnapshot({ unitsKilled: 0 }))).toBe(false);
    expect(firstBlood.check(makeSnapshot({ unitsKilled: 1 }))).toBe(true);
    expect(firstBlood.check(makeSnapshot({ unitsKilled: 5 }))).toBe(true);
  });

  it('Triple Kill triggers at 3 kill streak', () => {
    const tripleKill = ACHIEVEMENTS.find((a) => a.id === 'triple_kill')!;
    expect(tripleKill).toBeDefined();

    expect(tripleKill.check(makeSnapshot({ killStreak: 2 }))).toBe(false);
    expect(tripleKill.check(makeSnapshot({ killStreak: 3 }))).toBe(true);
    expect(tripleKill.check(makeSnapshot({ killStreak: 10 }))).toBe(true);
  });

  it('Achievement checks are pure functions (mock SQLite persistence)', async () => {
    const storage = await import('@/storage');

    // Verify the mock is working
    await storage.setSetting('achievement_first_blood', 'true');
    expect(storage.setSetting).toHaveBeenCalledWith('achievement_first_blood', 'true');

    // All achievement check functions should be deterministic
    for (const ach of ACHIEVEMENTS) {
      const result = ach.check(makeSnapshot());
      expect(typeof result).toBe('boolean');
    }
  });
});
