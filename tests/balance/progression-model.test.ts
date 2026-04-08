import { describe, expect, it } from 'vitest';
import {
  getBaselinePressureScore,
  getCombatPressureScore,
  getDifficultyShiftPercent,
  getMetaProgressionScore,
  getPerformanceScore,
  getPowerScore,
  getRewardScore,
  getSustainScore,
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

  it('credits retained stockpile as in-match power', () => {
    const baseline = {
      resourcesGathered: 120,
      resourcesStockpiled: 15,
      unitsTrained: 3,
      kills: 2,
      playerUnits: 6,
      lodgeHpRatio: 0.75,
    };
    const stocked = {
      ...baseline,
      resourcesStockpiled: 70,
    };

    expect(getPowerScore(stocked)).toBeGreaterThan(getPowerScore(baseline));
    expect(getRewardScore(stocked)).toBe(getRewardScore(baseline));
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

  it('credits healthier armies in the broad power score', () => {
    const brittleArmy = {
      resourcesGathered: 150,
      unitsTrained: 4,
      kills: 3,
      playerUnits: 6,
      playerUnitHpPool: 95,
      playerUnitHpRatio: 0.24,
      lodgeHpRatio: 0.7,
    };
    const durableArmy = {
      ...brittleArmy,
      playerUnitHpPool: 220,
      playerUnitHpRatio: 0.76,
    };

    expect(getPowerScore(durableArmy)).toBeGreaterThan(getPowerScore(brittleArmy));
  });

  it('credits map exploration in the broad power score', () => {
    const cautiousRun = {
      resourcesGathered: 150,
      unitsTrained: 4,
      kills: 3,
      playerUnits: 6,
      lodgeHpRatio: 0.7,
      exploredPercent: 18,
    };
    const scoutedRun = {
      ...cautiousRun,
      exploredPercent: 56,
    };

    expect(getPowerScore(scoutedRun)).toBeGreaterThan(getPowerScore(cautiousRun));
  });

  it('credits enemy nest pressure in the broad power score', () => {
    const untouchedNests = {
      resourcesGathered: 150,
      unitsTrained: 4,
      kills: 3,
      playerUnits: 6,
      lodgeHpRatio: 0.7,
      enemyNestHpRemovedRatio: 0,
    };
    const pressuredNests = {
      ...untouchedNests,
      enemyNestHpRemovedRatio: 0.45,
    };

    expect(getPowerScore(pressuredNests)).toBeGreaterThan(getPowerScore(untouchedNests));
  });

  it('captures retained army health for sustain scenarios', () => {
    const brittleHold = {
      resourcesGathered: 0,
      unitsTrained: 0,
      kills: 4,
      playerUnits: 5,
      playerUnitHpPool: 95,
      playerUnitHpRatio: 0.22,
      lodgeHpRatio: 0.62,
    };
    const stableHold = {
      resourcesGathered: 0,
      unitsTrained: 0,
      kills: 3,
      playerUnits: 5,
      playerUnitHpPool: 220,
      playerUnitHpRatio: 0.78,
      lodgeHpRatio: 0.68,
    };

    expect(getSustainScore(stableHold)).toBeGreaterThan(getSustainScore(brittleHold));
  });

  it('summarizes min/mean/max difficulty shifts', () => {
    expect(summarizeShiftPercents([4, 10, 16])).toEqual({
      min: 4,
      mean: 10,
      max: 16,
    });
  });
});
