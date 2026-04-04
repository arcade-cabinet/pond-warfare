/**
 * Player XP System Tests
 *
 * Validates XP calculation formula and level computation.
 */

import { describe, expect, it } from 'vitest';
import type { GameEndStats } from '@/systems/daily-challenges';
import {
  calculateXp,
  currentLevelXp,
  getLevel,
  levelProgress,
  nextLevelXp,
  xpInCurrentLevel,
  xpToNextLevel,
} from '@/systems/player-xp';
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
  };
  return {
    result: 'loss',
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

describe('player-xp', () => {
  describe('calculateXp', () => {
    it('gives base 100 XP for any game', () => {
      const xp = calculateXp(makeStats());
      expect(xp.base).toBe(100);
      expect(xp.total).toBeGreaterThanOrEqual(100);
    });

    it('adds 200 win bonus', () => {
      const loss = calculateXp(makeStats({ result: 'loss' }));
      const win = calculateXp(makeStats({ result: 'win' }));
      expect(win.winBonus).toBe(200);
      expect(loss.winBonus).toBe(0);
      expect(win.total - loss.total).toBe(200);
    });

    it('adds difficulty bonus', () => {
      const easy = calculateXp(makeStats({ difficulty: 'easy' }));
      const hard = calculateXp(makeStats({ difficulty: 'hard' }));
      const ultra = calculateXp(makeStats({ difficulty: 'ultraNightmare' }));
      expect(easy.difficultyBonus).toBe(0);
      expect(hard.difficultyBonus).toBe(100);
      expect(ultra.difficultyBonus).toBe(300);
    });

    it('adds kill bonus at 2 per kill', () => {
      const xp = calculateXp(makeStats({ kills: 10 }));
      expect(xp.killBonus).toBe(20);
    });

    it('adds building bonus at 5 per building', () => {
      const xp = calculateXp(makeStats({ buildingsBuilt: 4 }));
      expect(xp.buildingBonus).toBe(20);
    });

    it('adds tech bonus at 10 per tech', () => {
      const xp = calculateXp(makeStats({ techsResearched: 3 }));
      expect(xp.techBonus).toBe(30);
    });

    it('includes daily challenge bonus', () => {
      const xp = calculateXp(makeStats(), 250);
      expect(xp.dailyChallengeBonus).toBe(250);
    });

    it('sums all components correctly', () => {
      // Win on hard, 10 kills, 3 buildings, 2 techs, daily 200
      const xp = calculateXp(
        makeStats({
          result: 'win',
          difficulty: 'hard',
          kills: 10,
          buildingsBuilt: 3,
          techsResearched: 2,
        }),
        200,
      );
      // base(100) + win(200) + hard(100) + kills(20) + buildings(15) + techs(20) + daily(200)
      expect(xp.total).toBe(655);
    });
  });

  describe('getLevel', () => {
    it('level 0 at 0 XP', () => {
      expect(getLevel(0)).toBe(0);
    });

    it('level 0 at 499 XP', () => {
      expect(getLevel(499)).toBe(0);
    });

    it('level 1 at 500 XP', () => {
      expect(getLevel(500)).toBe(1);
    });

    it('level 2 at 1000 XP', () => {
      expect(getLevel(1000)).toBe(2);
    });

    it('level 10 at 5000 XP', () => {
      expect(getLevel(5000)).toBe(10);
    });
  });

  describe('xpToNextLevel', () => {
    it('needs 500 XP from 0', () => {
      expect(xpToNextLevel(0)).toBe(500);
    });

    it('needs 1 XP from 499', () => {
      expect(xpToNextLevel(499)).toBe(1);
    });

    it('needs 500 XP from 500 (just hit level 1)', () => {
      expect(xpToNextLevel(500)).toBe(500);
    });
  });

  describe('xpInCurrentLevel', () => {
    it('0 at level boundary', () => {
      expect(xpInCurrentLevel(500)).toBe(0);
    });

    it('250 halfway through a level', () => {
      expect(xpInCurrentLevel(750)).toBe(250);
    });
  });

  describe('levelProgress', () => {
    it('0 at level boundary', () => {
      expect(levelProgress(500)).toBe(0);
    });

    it('0.5 halfway', () => {
      expect(levelProgress(750)).toBe(0.5);
    });
  });

  describe('currentLevelXp and nextLevelXp', () => {
    it('correct boundaries at level 2', () => {
      expect(currentLevelXp(1200)).toBe(1000);
      expect(nextLevelXp(1200)).toBe(1500);
    });
  });
});
