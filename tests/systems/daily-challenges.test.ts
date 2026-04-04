/**
 * Daily Challenge System Tests
 *
 * Validates deterministic selection, challenge objectives, and key generation.
 */

import { describe, expect, it } from 'vitest';
import {
  dailyChallengeKey,
  daysSinceEpoch,
  type GameEndStats,
  getAllChallenges,
  getDailyChallenge,
} from '@/systems/daily-challenges';
import type { GameStats } from '@/types';

function makeStats(overrides: Partial<GameEndStats> = {}): GameEndStats {
  const gameStats: GameStats = {
    unitsKilled: 0,
    unitsLost: 0,
    unitsTrained: 0,
    resourcesGathered: 0,
    buildingsBuilt: 0,
    buildingsLost: 0,
    peakArmy: 0,
    pearlsEarned: 0,
    totalClamsEarned: 0,
    ...overrides.gameStats,
  };
  return {
    result: 'win',
    difficulty: 'normal',
    commander: 'marshal',
    scenario: 'standard',
    durationSeconds: 600,
    kills: 0,
    unitsLost: 0,
    buildingsBuilt: 0,
    techsResearched: 0,
    nestsDestroyed: 0,
    totalClamsEarned: 0,
    unitsTrained: 0,
    pearlsEarned: 0,
    commanderAbilitiesUsed: 0,
    towersBuilt: 0,
    combatUnitsTrained: 0,
    survivalWaveReached: 0,
    gameStats,
    ...overrides,
  };
}

describe('daily-challenges', () => {
  it('should have at least 19 challenges in the pool', () => {
    expect(getAllChallenges().length).toBeGreaterThanOrEqual(19);
  });

  it('should select challenge deterministically from date', () => {
    const d1 = new Date('2026-03-31T12:00:00Z');
    const d2 = new Date('2026-03-31T23:59:00Z');

    // Same day = same challenge
    expect(getDailyChallenge(d1).id).toBe(getDailyChallenge(d2).id);

    // Different day = possibly different challenge
    const d3 = new Date('2026-04-01T12:00:00Z');
    // They should cycle through the pool
    const c1 = getDailyChallenge(d1);
    const c3 = getDailyChallenge(d3);
    // Adjacent days should differ (unless pool length is 1, which it isn't)
    expect(c1.id !== c3.id || getAllChallenges().length === 1).toBe(true);
  });

  it('daysSinceEpoch returns consistent values', () => {
    const d = new Date('2024-01-01T00:00:00Z');
    const days = daysSinceEpoch(d);
    expect(days).toBe(19723); // 2024-01-01 is day 19723

    // One day later should be +1
    const d2 = new Date('2024-01-02T00:00:00Z');
    expect(daysSinceEpoch(d2)).toBe(days + 1);
  });

  it('dailyChallengeKey generates correct format', () => {
    const d = new Date('2026-03-31T15:30:00Z');
    expect(dailyChallengeKey(d)).toBe('daily_challenge_2026-03-31');
  });

  it('speed_run challenge requires win under 8 minutes', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'speed_run');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    // Win in 7 minutes: passes
    expect(challenge.objective(makeStats({ result: 'win', durationSeconds: 420 }))).toBe(true);
    // Win in 9 minutes: fails
    expect(challenge.objective(makeStats({ result: 'win', durationSeconds: 540 }))).toBe(false);
    // Loss in 5 minutes: fails
    expect(challenge.objective(makeStats({ result: 'loss', durationSeconds: 300 }))).toBe(false);
  });

  it('hard_difficulty challenge requires win on hard+', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'hard_difficulty');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ result: 'win', difficulty: 'hard' }))).toBe(true);
    expect(challenge.objective(makeStats({ result: 'win', difficulty: 'nightmare' }))).toBe(true);
    expect(challenge.objective(makeStats({ result: 'win', difficulty: 'normal' }))).toBe(false);
    expect(challenge.objective(makeStats({ result: 'loss', difficulty: 'hard' }))).toBe(false);
  });

  it('destroy_3_nests challenge checks nest count', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'destroy_3_nests');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ nestsDestroyed: 3 }))).toBe(true);
    expect(challenge.objective(makeStats({ nestsDestroyed: 2 }))).toBe(false);
  });

  it('no_building_loss challenge checks buildingsLost', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'no_building_loss');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    const noLoss: GameStats = {
      unitsKilled: 0,
      unitsLost: 0,
      unitsTrained: 0,
      resourcesGathered: 0,
      buildingsBuilt: 5,
      buildingsLost: 0,
      peakArmy: 0,
      pearlsEarned: 0,
      totalClamsEarned: 0,
    };
    expect(challenge.objective(makeStats({ result: 'win', gameStats: noLoss }))).toBe(true);

    const withLoss = { ...noLoss, buildingsLost: 1 };
    expect(challenge.objective(makeStats({ result: 'win', gameStats: withLoss }))).toBe(false);
  });

  it('all challenges have valid structure with type', () => {
    const validTypes = ['speed', 'no_loss', 'tech', 'economy', 'combat', 'building', 'general'];
    for (const c of getAllChallenges()) {
      expect(c.id).toBeTruthy();
      expect(c.title).toBeTruthy();
      expect(c.description).toBeTruthy();
      expect(typeof c.objective).toBe('function');
      expect(c.xpReward).toBeGreaterThan(0);
      expect(validTypes).toContain(c.type);
    }
  });

  it('speed_run_10 challenge requires win under 10 minutes', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'speed_run_10');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ result: 'win', durationSeconds: 500 }))).toBe(true);
    expect(challenge.objective(makeStats({ result: 'win', durationSeconds: 700 }))).toBe(false);
  });

  it('tech_rush_8 challenge requires 8 techs researched', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'tech_rush_8');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ techsResearched: 8 }))).toBe(true);
    expect(challenge.objective(makeStats({ techsResearched: 7 }))).toBe(false);
  });

  it('economy_only challenge requires win with no combat units', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'economy_only');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ result: 'win', combatUnitsTrained: 0 }))).toBe(true);
    expect(challenge.objective(makeStats({ result: 'win', combatUnitsTrained: 1 }))).toBe(false);
    expect(challenge.objective(makeStats({ result: 'loss', combatUnitsTrained: 0 }))).toBe(false);
  });

  it('survival_15 challenge requires wave 15', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'survival_15');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ survivalWaveReached: 15 }))).toBe(true);
    expect(challenge.objective(makeStats({ survivalWaveReached: 14 }))).toBe(false);
  });

  it('no_unit_loss challenge requires win with zero units lost', () => {
    const challenge = getAllChallenges().find((c) => c.id === 'no_unit_loss');
    expect(challenge).toBeDefined();
    if (!challenge) return;

    expect(challenge.objective(makeStats({ result: 'win', unitsLost: 0 }))).toBe(true);
    expect(challenge.objective(makeStats({ result: 'win', unitsLost: 1 }))).toBe(false);
  });
});
