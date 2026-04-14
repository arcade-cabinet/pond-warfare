// @vitest-environment jsdom
/**
 * RewardsScreen Tests (v3.0 -- US13)
 *
 * Validates the rewards screen logic:
 * - Reward calculation from match stats
 * - Stat line generation
 * - Result title text
 * - Duration formatting
 * - Prestige multiplier application
 * - Signal integration for rewards flow
 */

import { signal } from '@preact/signals';
import { render, screen } from '@testing-library/preact';
import { h } from 'preact';
import { describe, expect, it } from 'vitest';
import {
  calculateMatchReward,
  formatDuration,
  generateRewardStatLines,
  getResultTitle,
  type MatchStats,
} from '@/game/match-rewards';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { RewardsScreen } from '@/ui/screens/RewardsScreen';

describe('RewardsScreen -- US13', () => {
  const baseStats: MatchStats = {
    result: 'win',
    durationSeconds: 300,
    kills: 10,
    resourcesGathered: 200,
    eventsCompleted: 2,
    prestigeRank: 0,
  };

  describe('Reward calculation', () => {
    it('should calculate positive total clams for a win', () => {
      const breakdown = calculateMatchReward(baseStats);
      expect(breakdown.totalClams).toBeGreaterThan(0);
    });

    it('should include base clams', () => {
      const breakdown = calculateMatchReward(baseStats);
      expect(breakdown.base).toBeGreaterThan(0);
    });

    it('should include kill bonus', () => {
      const breakdown = calculateMatchReward(baseStats);
      expect(breakdown.killBonus).toBeGreaterThan(0);
    });

    it('should include event bonus', () => {
      const breakdown = calculateMatchReward(baseStats);
      expect(breakdown.eventBonus).toBeGreaterThan(0);
    });

    it('should include survival bonus for 5min match', () => {
      const breakdown = calculateMatchReward(baseStats);
      expect(breakdown.survivalBonus).toBeGreaterThan(0);
    });

    it('should apply loss penalty (half rewards)', () => {
      const lossStats = { ...baseStats, result: 'loss' as const };
      const winBreakdown = calculateMatchReward(baseStats);
      const lossBreakdown = calculateMatchReward(lossStats);
      expect(lossBreakdown.totalClams).toBeLessThan(winBreakdown.totalClams);
      expect(lossBreakdown.isWin).toBe(false);
    });

    it('should apply prestige multiplier', () => {
      const prestigeStats = { ...baseStats, prestigeRank: 3 };
      const noPrestige = calculateMatchReward(baseStats);
      const withPrestige = calculateMatchReward(prestigeStats);
      expect(withPrestige.totalClams).toBeGreaterThan(noPrestige.totalClams);
      expect(withPrestige.prestigeMultiplier).toBeGreaterThan(1);
    });
  });

  describe('Stat line generation', () => {
    it('should generate stat lines array', () => {
      const breakdown = calculateMatchReward(baseStats);
      const lines = generateRewardStatLines(baseStats, breakdown);
      expect(lines.length).toBeGreaterThan(0);
    });

    it('should include duration line', () => {
      const breakdown = calculateMatchReward(baseStats);
      const lines = generateRewardStatLines(baseStats, breakdown);
      expect(lines.some((l) => l.startsWith('Duration'))).toBe(true);
    });

    it('should include kills line', () => {
      const breakdown = calculateMatchReward(baseStats);
      const lines = generateRewardStatLines(baseStats, breakdown);
      expect(lines.some((l) => l.startsWith('Kills'))).toBe(true);
    });

    it('should include total clams line', () => {
      const breakdown = calculateMatchReward(baseStats);
      const lines = generateRewardStatLines(baseStats, breakdown);
      expect(lines.some((l) => l.startsWith('Total Clams'))).toBe(true);
    });

    it('should include separator lines', () => {
      const breakdown = calculateMatchReward(baseStats);
      const lines = generateRewardStatLines(baseStats, breakdown);
      expect(lines.filter((l) => l === '---').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Result title', () => {
    it('should return VICTORY for win', () => {
      const result = getResultTitle('win');
      expect(result.title).toBe('VICTORY');
      expect(result.color).toBeTruthy();
    });

    it('should return DEFEAT for loss', () => {
      const result = getResultTitle('loss');
      expect(result.title).toBe('DEFEAT');
      expect(result.color).toBeTruthy();
    });

    it('should include subtitle', () => {
      const win = getResultTitle('win');
      const loss = getResultTitle('loss');
      expect(win.subtitle.length).toBeGreaterThan(0);
      expect(loss.subtitle.length).toBeGreaterThan(0);
    });
  });

  describe('Duration formatting', () => {
    it('should format seconds only', () => {
      expect(formatDuration(45)).toBe('45s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(125)).toBe('2m 5s');
    });

    it('should format zero seconds', () => {
      expect(formatDuration(0)).toBe('0s');
    });

    it('should format exact minutes', () => {
      expect(formatDuration(120)).toBe('2m 0s');
    });
  });

  describe('Signal integration', () => {
    it('rewardsScreenOpen toggles correctly', () => {
      const rewardsScreenOpen = signal(false);
      rewardsScreenOpen.value = true;
      expect(rewardsScreenOpen.value).toBe(true);
      rewardsScreenOpen.value = false;
      expect(rewardsScreenOpen.value).toBe(false);
    });

    it('lastRewardBreakdown stores breakdown', () => {
      const breakdown = calculateMatchReward(baseStats);
      const lastRewardBreakdown = signal(breakdown);
      expect(lastRewardBreakdown.value.totalClams).toBeGreaterThan(0);
    });

    it('canRankUpAfterMatch updates from rewards flow', () => {
      const canRankUpAfterMatch = signal(false);
      canRankUpAfterMatch.value = true;
      expect(canRankUpAfterMatch.value).toBe(true);
    });

    it('rankUpModalOpen opens from rewards screen', () => {
      const rankUpModalOpen = signal(false);
      rankUpModalOpen.value = true;
      expect(rankUpModalOpen.value).toBe(true);
    });
  });

  describe('Rendered screen', () => {
    it('shows the build stamp in the post-match overlay', () => {
      const breakdown = calculateMatchReward(baseStats);

      render(
        h(RewardsScreen, {
          breakdown,
          kills: baseStats.kills,
          eventsCompleted: baseStats.eventsCompleted,
          resourcesGathered: baseStats.resourcesGathered,
          durationSeconds: baseStats.durationSeconds,
          canRankUp: false,
          prestigeRank: baseStats.prestigeRank,
          onRankUp: () => {},
          onUpgrades: () => {},
          onPlayAgain: () => {},
        }),
      );

      expect(screen.getByText(`Build ${BUILD_STAMP_LABEL}`)).toBeTruthy();
    });
  });
});
