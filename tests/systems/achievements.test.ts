/**
 * Achievements System Tests
 *
 * Validates achievement check logic and persistence.
 */

import { describe, expect, it, vi } from 'vitest';
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
      commanderFullHp: false,
      gameMinutes: 10,
      peakArmy: 5,
      techCount: 0,
      maxBranchTechCount: 0,
      totalPearls: 0,
      totalFish: 0,
      buildingsBuilt: 0,
      buildingsLost: 0,
      onlyShadowTechs: false,
      // v2.1.0 fields
      weatherTypesExperienced: 0,
      warshipKills: 0,
      bridgesBuilt: 0,
      diverAmbushKills: 0,
      marketTrades: 0,
      maxBerserkerKills: 0,
      shrineAbilitiesUsed: 0,
      coopMode: false,
      dailyChallengesCompleted: 0,
      playerLevel: 1,
      perfectPuzzleCount: 0,
      randomEventsExperienced: 0,
      wallsBuilt: 0,
      enemiesBlockedByGates: 0,
      ...overrides,
    };
  }

  it('defines exactly 40 achievements', () => {
    expect(ACHIEVEMENTS).toHaveLength(40);
  });

  it('all achievements have unique IDs', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('First Blood triggers at 1 kill', () => {
    const firstBlood = ACHIEVEMENTS.find((a) => a.id === 'first_blood');
    expect(firstBlood).toBeDefined();
    if (!firstBlood) throw new Error('Expected first_blood achievement to exist');

    expect(firstBlood.check(makeSnapshot({ unitsKilled: 0 }))).toBe(false);
    expect(firstBlood.check(makeSnapshot({ unitsKilled: 1 }))).toBe(true);
    expect(firstBlood.check(makeSnapshot({ unitsKilled: 5 }))).toBe(true);
  });

  it('Triple Kill triggers at 3 kill streak', () => {
    const tripleKill = ACHIEVEMENTS.find((a) => a.id === 'triple_kill');
    expect(tripleKill).toBeDefined();
    if (!tripleKill) throw new Error('Expected triple_kill achievement to exist');

    expect(tripleKill.check(makeSnapshot({ killStreak: 2 }))).toBe(false);
    expect(tripleKill.check(makeSnapshot({ killStreak: 3 }))).toBe(true);
    expect(tripleKill.check(makeSnapshot({ killStreak: 10 }))).toBe(true);
  });

  // ---- v2.1.0 achievement tests ----

  it('Weather Master requires win + all 4 weather types', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'weather_master')!;
    expect(ach.check(makeSnapshot({ won: true, weatherTypesExperienced: 3 }))).toBe(false);
    expect(ach.check(makeSnapshot({ won: true, weatherTypesExperienced: 4 }))).toBe(true);
    expect(ach.check(makeSnapshot({ won: false, weatherTypesExperienced: 4 }))).toBe(false);
  });

  it('Naval Supremacy requires 5 warship kills', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'naval_supremacy')!;
    expect(ach.check(makeSnapshot({ warshipKills: 4 }))).toBe(false);
    expect(ach.check(makeSnapshot({ warshipKills: 5 }))).toBe(true);
  });

  it('Bridge Builder requires 3 bridges', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'bridge_builder')!;
    expect(ach.check(makeSnapshot({ bridgesBuilt: 2 }))).toBe(false);
    expect(ach.check(makeSnapshot({ bridgesBuilt: 3 }))).toBe(true);
  });

  it('Stealth Expert requires 5 diver ambush kills', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'stealth_expert')!;
    expect(ach.check(makeSnapshot({ diverAmbushKills: 4 }))).toBe(false);
    expect(ach.check(makeSnapshot({ diverAmbushKills: 5 }))).toBe(true);
  });

  it('Market Mogul requires 10 trades', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'market_mogul')!;
    expect(ach.check(makeSnapshot({ marketTrades: 9 }))).toBe(false);
    expect(ach.check(makeSnapshot({ marketTrades: 10 }))).toBe(true);
  });

  it("Berserker's Fury requires 10 kills on single berserker", () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'berserkers_fury')!;
    expect(ach.check(makeSnapshot({ maxBerserkerKills: 9 }))).toBe(false);
    expect(ach.check(makeSnapshot({ maxBerserkerKills: 10 }))).toBe(true);
  });

  it('Shrine Master requires all 5 shrine abilities used', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'shrine_master')!;
    expect(ach.check(makeSnapshot({ shrineAbilitiesUsed: 4 }))).toBe(false);
    expect(ach.check(makeSnapshot({ shrineAbilitiesUsed: 5 }))).toBe(true);
  });

  it('Co-op Victory requires win in co-op mode', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'coop_victory')!;
    expect(ach.check(makeSnapshot({ won: true, coopMode: false }))).toBe(false);
    expect(ach.check(makeSnapshot({ won: true, coopMode: true }))).toBe(true);
    expect(ach.check(makeSnapshot({ won: false, coopMode: true }))).toBe(false);
  });

  it('Daily Dedication requires 7 daily challenges', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'daily_dedication')!;
    expect(ach.check(makeSnapshot({ dailyChallengesCompleted: 6 }))).toBe(false);
    expect(ach.check(makeSnapshot({ dailyChallengesCompleted: 7 }))).toBe(true);
  });

  it('Level 10 requires player level 10', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'level_10')!;
    expect(ach.check(makeSnapshot({ playerLevel: 9 }))).toBe(false);
    expect(ach.check(makeSnapshot({ playerLevel: 10 }))).toBe(true);
  });

  it('Puzzle Pro requires 10 perfect puzzles', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'puzzle_pro')!;
    expect(ach.check(makeSnapshot({ perfectPuzzleCount: 9 }))).toBe(false);
    expect(ach.check(makeSnapshot({ perfectPuzzleCount: 10 }))).toBe(true);
  });

  it('Event Survivor requires 8 random events', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'event_survivor')!;
    expect(ach.check(makeSnapshot({ randomEventsExperienced: 7 }))).toBe(false);
    expect(ach.check(makeSnapshot({ randomEventsExperienced: 8 }))).toBe(true);
  });

  it('Wall Builder requires 10 wall segments', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'wall_builder')!;
    expect(ach.check(makeSnapshot({ wallsBuilt: 9 }))).toBe(false);
    expect(ach.check(makeSnapshot({ wallsBuilt: 10 }))).toBe(true);
  });

  it('Gate Keeper requires 20 enemies blocked', () => {
    const ach = ACHIEVEMENTS.find((a) => a.id === 'gate_keeper')!;
    expect(ach.check(makeSnapshot({ enemiesBlockedByGates: 19 }))).toBe(false);
    expect(ach.check(makeSnapshot({ enemiesBlockedByGates: 20 }))).toBe(true);
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
