import { describe, expect, it } from 'vitest';
import {
  getBaselinePressureScore,
  getCombatPressureScore,
  getDifficultyShiftPercent,
  getMetaProgressionScore,
  getPerformanceScore,
  getPowerScore,
  getRewardScore,
  summarizeShiftPercents,
} from '@/balance/progression-model';

describe('progression model', () => {
  it('uses a logarithmic match-pressure curve', () => {
    const stageThreeMatchOne = getBaselinePressureScore(3, 1);
    const stageThreeMatchTwo = getBaselinePressureScore(3, 2);
    const stageThreeMatchThree = getBaselinePressureScore(3, 3);
    const stageThreeMatchEight = getBaselinePressureScore(3, 8);
    const stageThreeMatchNine = getBaselinePressureScore(3, 9);

    expect(stageThreeMatchTwo - stageThreeMatchOne).toBeGreaterThan(stageThreeMatchThree - stageThreeMatchTwo);
    expect(stageThreeMatchThree - stageThreeMatchTwo).toBeGreaterThan(
      stageThreeMatchNine - stageThreeMatchEight,
    );
  });

  it('increases baseline pressure as panel stages expand', () => {
    expect(getBaselinePressureScore(6, 1)).toBeGreaterThan(getBaselinePressureScore(1, 1));
    expect(getBaselinePressureScore(6, 4)).toBeGreaterThan(getBaselinePressureScore(3, 4));
  });

  it('translates stronger snapshots into higher performance scores', () => {
    const baseline = getPerformanceScore({
      resourcesGathered: 120,
      unitsTrained: 3,
      kills: 2,
      playerUnits: 6,
      lodgeHpRatio: 0.7,
    });
    const improved = getPerformanceScore({
      resourcesGathered: 180,
      unitsTrained: 5,
      kills: 4,
      playerUnits: 8,
      lodgeHpRatio: 0.85,
    });

    expect(improved).toBeGreaterThan(baseline);
    expect(getDifficultyShiftPercent(baseline, improved)).toBeGreaterThan(0);
  });

  it('separates reward acceleration from in-match power', () => {
    const baseline = {
      resourcesGathered: 160,
      unitsTrained: 4,
      kills: 3,
      playerUnits: 7,
      lodgeHpRatio: 0.8,
      matchClamsEarned: 40,
    };
    const higherReward = { ...baseline, matchClamsEarned: 60 };

    expect(getPowerScore(higherReward)).toBe(getPowerScore(baseline));
    expect(getRewardScore(higherReward)).toBeGreaterThan(getRewardScore(baseline));
    expect(getMetaProgressionScore(higherReward)).toBeGreaterThan(getMetaProgressionScore(baseline));
  });

  it('weights survival more heavily for combat-pressure scenarios', () => {
    const riskyEconomy = {
      resourcesGathered: 220,
      unitsTrained: 5,
      kills: 2,
      playerUnits: 3,
      lodgeHpRatio: 0.2,
    };
    const stableDefense = {
      resourcesGathered: 120,
      unitsTrained: 3,
      kills: 4,
      playerUnits: 6,
      lodgeHpRatio: 0.8,
    };

    expect(getPowerScore(riskyEconomy)).toBeGreaterThan(0);
    expect(getCombatPressureScore(stableDefense)).toBeGreaterThan(getCombatPressureScore(riskyEconomy));
  });

  it('summarizes min/mean/max difficulty shifts', () => {
    expect(summarizeShiftPercents([4, 10, 16])).toEqual({
      min: 4,
      mean: 10,
      max: 16,
    });
  });
});
