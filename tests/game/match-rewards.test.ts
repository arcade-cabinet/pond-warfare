/**
 * Match Rewards Calculator Tests (v3.0 — US13)
 *
 * Validates post-match Clam reward calculation from rewards.json:
 * - Base + kill + event + survival bonuses
 * - Prestige multiplier application
 * - Loss penalty (50%)
 * - Stat line generation for display
 * - Rank up threshold detection
 */

import { describe, expect, it } from 'vitest';
import { getRewardFormula } from '@/config/config-loader';
import {
  calculateMatchReward,
  checkRankUpAvailable,
  formatDuration,
  generateRewardStatLines,
  getResultTitle,
  type MatchStats,
} from '@/game/match-rewards';

// ── Helper ────────────────────────────────────────────────────────

function makeStats(overrides: Partial<MatchStats> = {}): MatchStats {
  return {
    result: 'win',
    durationSeconds: 600, // 10 minutes
    kills: 20,
    resourcesGathered: 150,
    eventsCompleted: 2,
    prestigeRank: 0,
    ...overrides,
  };
}

// ── Config validation ─────────────────────────────────────────────

describe('Rewards config', () => {
  it('should have positive reward values', () => {
    const config = getRewardFormula();
    expect(config.base_clams).toBeGreaterThan(0);
    expect(config.kill_bonus).toBeGreaterThan(0);
    expect(config.event_bonus).toBeGreaterThan(0);
    expect(config.survival_bonus_per_minute).toBeGreaterThan(0);
    expect(config.prestige_multiplier_per_rank).toBeGreaterThan(0);
  });
});

// ── Reward calculation tests ──────────────────────────────────────

describe('Match reward calculation', () => {
  it('should calculate base reward correctly', () => {
    const stats = makeStats({ kills: 0, eventsCompleted: 0, durationSeconds: 0 });
    const reward = calculateMatchReward(stats);

    expect(reward.base).toBe(20); // from config
    expect(reward.killBonus).toBe(0);
    expect(reward.eventBonus).toBe(0);
    expect(reward.resourceBonus).toBe(8);
    expect(reward.survivalBonus).toBe(0);
    expect(reward.totalClams).toBe(28);
  });

  it('should add kill bonus', () => {
    const stats = makeStats({ kills: 10 });
    const reward = calculateMatchReward(stats);

    // kill_bonus = 2 per kill
    expect(reward.killBonus).toBe(20);
  });

  it('should add event bonus', () => {
    const stats = makeStats({ eventsCompleted: 3 });
    const reward = calculateMatchReward(stats);

    // event_bonus = 6 per event
    expect(reward.eventBonus).toBe(18);
  });

  it('should add resource bonus based on gathered resources', () => {
    const stats = makeStats({ resourcesGathered: 250 });
    const reward = calculateMatchReward(stats);

    // resource_bonus_per_100 = 8, 250 resources = 2 steps
    expect(reward.resourceBonus).toBe(16);
  });

  it('should add survival bonus based on duration', () => {
    const stats = makeStats({ durationSeconds: 600 }); // 10 minutes
    const reward = calculateMatchReward(stats);

    // survival_bonus_per_minute = 4, 10 minutes = 40
    expect(reward.survivalBonus).toBe(40);
  });

  it('should apply prestige multiplier', () => {
    const stats0 = makeStats({ prestigeRank: 0 });
    const stats3 = makeStats({ prestigeRank: 3 });

    const reward0 = calculateMatchReward(stats0);
    const reward3 = calculateMatchReward(stats3);

    expect(reward0.prestigeMultiplier).toBe(1.0);
    // prestige_multiplier_per_rank = 0.1, rank 3: 1 + 3 * 0.1 = 1.3
    expect(reward3.prestigeMultiplier).toBeCloseTo(1.3);
    expect(reward3.totalClams).toBeGreaterThan(reward0.totalClams);
  });

  it('should apply earnings multiplier after prestige', () => {
    const stats = makeStats({ prestigeRank: 2, earningsMultiplier: 1.25 });
    const reward = calculateMatchReward(stats);

    expect(reward.earningsMultiplier).toBeCloseTo(1.25);
    expect(reward.totalClams).toBe(Math.floor(reward.subtotal * reward.prestigeMultiplier * 1.25));
  });

  it('should apply loss penalty (50%)', () => {
    const winStats = makeStats({ result: 'win' });
    const loseStats = makeStats({ result: 'loss' });

    const winReward = calculateMatchReward(winStats);
    const loseReward = calculateMatchReward(loseStats);

    expect(loseReward.isWin).toBe(false);
    expect(loseReward.totalClams).toBe(Math.floor(winReward.totalClams * 0.5));
  });

  it('should calculate a full example correctly', () => {
    // Base 20 + 20 kills * 2 + 2 events * 6 + resource bonus 8 + 10 minutes * 4 = 120
    // Prestige rank 0: multiplier 1.0
    // Win: no penalty
    // Total: 120
    const stats = makeStats({
      kills: 20,
      eventsCompleted: 2,
      durationSeconds: 600,
      prestigeRank: 0,
      result: 'win',
    });

    const reward = calculateMatchReward(stats);
    expect(reward.subtotal).toBe(120);
    expect(reward.totalClams).toBe(120);
  });

  it('should floor all values (no fractional Clams)', () => {
    const stats = makeStats({ durationSeconds: 90 }); // 1.5 minutes
    const reward = calculateMatchReward(stats);

    expect(Number.isInteger(reward.survivalBonus)).toBe(true);
    expect(Number.isInteger(reward.totalClams)).toBe(true);
  });

  it('should handle zero-length match', () => {
    const stats = makeStats({
      durationSeconds: 0,
      kills: 0,
      eventsCompleted: 0,
      resourcesGathered: 0,
    });
    const reward = calculateMatchReward(stats);
    expect(reward.totalClams).toBe(20); // Just base
  });

  it('should scale with high prestige rank', () => {
    const stats = makeStats({ prestigeRank: 10 });
    const reward = calculateMatchReward(stats);

    // 1 + 10 * 0.1 = 2.0x multiplier
    expect(reward.prestigeMultiplier).toBeCloseTo(2.0);
    expect(reward.totalClams).toBe(Math.floor(reward.subtotal * 2.0));
  });
});

// ── Stat line generation tests ────────────────────────────────────

describe('Reward stat lines', () => {
  it('should generate stat lines for display', () => {
    const stats = makeStats();
    const breakdown = calculateMatchReward(stats);
    const lines = generateRewardStatLines(stats, breakdown);

    expect(lines.length).toBeGreaterThan(5);
    expect(lines.some((l) => l.includes('Duration'))).toBe(true);
    expect(lines.some((l) => l.includes('Kills'))).toBe(true);
    expect(lines.some((l) => l.includes('Total Clams'))).toBe(true);
  });

  it('should include kill bonus when present', () => {
    const stats = makeStats({ kills: 10 });
    const breakdown = calculateMatchReward(stats);
    const lines = generateRewardStatLines(stats, breakdown);

    expect(lines.some((l) => l.includes('Kill Bonus'))).toBe(true);
  });

  it('should exclude kill bonus when zero', () => {
    const stats = makeStats({ kills: 0 });
    const breakdown = calculateMatchReward(stats);
    const lines = generateRewardStatLines(stats, breakdown);

    expect(lines.some((l) => l.includes('Kill Bonus'))).toBe(false);
  });

  it('should include prestige multiplier when rank > 0', () => {
    const stats = makeStats({ prestigeRank: 2 });
    const breakdown = calculateMatchReward(stats);
    const lines = generateRewardStatLines(stats, breakdown);

    expect(lines.some((l) => l.includes('Prestige'))).toBe(true);
  });

  it('should include earnings multiplier when present', () => {
    const stats = makeStats({ earningsMultiplier: 1.5 });
    const breakdown = calculateMatchReward(stats);
    const lines = generateRewardStatLines(stats, breakdown);

    expect(lines.some((l) => l.includes('Earnings x1.50'))).toBe(true);
  });

  it('should include loss penalty when lost', () => {
    const stats = makeStats({ result: 'loss' });
    const breakdown = calculateMatchReward(stats);
    const lines = generateRewardStatLines(stats, breakdown);

    expect(lines.some((l) => l.includes('Loss Penalty'))).toBe(true);
  });
});

// ── Rank up check tests ──────────────────────────────────────────

describe('Rank up availability', () => {
  it('should not allow rank up below threshold', () => {
    const info = checkRankUpAvailable(15, 0, 20);
    expect(info.canRankUp).toBe(false);
    expect(info.progress).toBe(0.75);
  });

  it('should allow rank up at threshold', () => {
    const info = checkRankUpAvailable(20, 0, 20);
    expect(info.canRankUp).toBe(true);
    expect(info.progress).toBe(1.0);
  });

  it('should allow rank up above threshold', () => {
    const info = checkRankUpAvailable(50, 0, 20);
    expect(info.canRankUp).toBe(true);
    expect(info.progress).toBeGreaterThan(1.0);
  });

  it('should handle zero threshold', () => {
    const info = checkRankUpAvailable(10, 0, 0);
    expect(info.canRankUp).toBe(true);
    expect(info.progress).toBe(0);
  });
});

// ── Duration formatting tests ─────────────────────────────────────

describe('Duration formatting', () => {
  it('should format seconds only', () => {
    expect(formatDuration(45)).toBe('45s');
  });

  it('should format minutes and seconds', () => {
    expect(formatDuration(125)).toBe('2m 5s');
  });

  it('should format exact minutes', () => {
    expect(formatDuration(600)).toBe('10m 0s');
  });

  it('should format zero', () => {
    expect(formatDuration(0)).toBe('0s');
  });
});

// ── Result title tests ────────────────────────────────────────────

describe('Result title', () => {
  it('should return victory title for win', () => {
    const result = getResultTitle('win');
    expect(result.title).toBe('VICTORY');
    expect(result.subtitle).toBeTruthy();
    expect(result.color).toBeTruthy();
  });

  it('should return defeat title for loss', () => {
    const result = getResultTitle('loss');
    expect(result.title).toBe('DEFEAT');
    expect(result.subtitle).toBeTruthy();
    expect(result.color).toBeTruthy();
  });

  it('titles should have different colors', () => {
    const win = getResultTitle('win');
    const loss = getResultTitle('loss');
    expect(win.color).not.toBe(loss.color);
  });
});
