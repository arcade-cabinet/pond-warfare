/**
 * Adversarial Multiplayer Rules Tests
 *
 * Tests for adversarial win/lose conditions, difficulty scaling,
 * and network message construction.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import {
  ADVERSARIAL_ENEMY_STAT_MULT,
  applyAdversarialDifficultyScaling,
  buildAdversarialCommanderDestroyedMessage,
  buildAdversarialLodgeDestroyedMessage,
  checkAdversarialWinLose,
} from '@/net/adversarial-rules';

describe('adversarial-rules', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  // ---- Win/Lose Conditions ----

  describe('checkAdversarialWinLose', () => {
    it('returns win when opponent Commander is destroyed', () => {
      const result = checkAdversarialWinLose(true, true, false, true);
      expect(result).toBe('win');
    });

    it('returns win when opponent Lodge is destroyed', () => {
      const result = checkAdversarialWinLose(true, true, true, false);
      expect(result).toBe('win');
    });

    it('returns win when both opponent Commander and Lodge destroyed', () => {
      const result = checkAdversarialWinLose(true, true, true, true);
      expect(result).toBe('win');
    });

    it('returns lose when player Lodge is destroyed', () => {
      const result = checkAdversarialWinLose(false, true, false, false);
      expect(result).toBe('lose');
    });

    it('returns lose when player Commander is destroyed', () => {
      const result = checkAdversarialWinLose(true, false, false, false);
      expect(result).toBe('lose');
    });

    it('returns null when both sides still alive (playing)', () => {
      const result = checkAdversarialWinLose(true, true, false, false);
      expect(result).toBeNull();
    });

    it('returns win over lose when both commanders destroyed simultaneously', () => {
      // Opponent destruction takes priority (win)
      const result = checkAdversarialWinLose(true, false, false, true);
      expect(result).toBe('win');
    });
  });

  // ---- Message Construction ----

  describe('message construction', () => {
    it('buildAdversarialLodgeDestroyedMessage returns correct format', () => {
      const msg = buildAdversarialLodgeDestroyedMessage();
      expect(msg).toEqual({ type: 'adversarial-lodge-destroyed' });
    });

    it('buildAdversarialCommanderDestroyedMessage returns correct format', () => {
      const msg = buildAdversarialCommanderDestroyedMessage();
      expect(msg).toEqual({ type: 'adversarial-commander-destroyed' });
    });
  });

  // ---- Difficulty Scaling ----

  describe('difficulty scaling', () => {
    it('applies +25% enemy stat multiplier when adversarialMode is active', () => {
      world.adversarialMode = true;
      world.enemyStatMult = 1.0;

      applyAdversarialDifficultyScaling(world);

      expect(world.enemyStatMult).toBe(ADVERSARIAL_ENEMY_STAT_MULT);
    });

    it('stacks with existing enemy stat multiplier', () => {
      world.adversarialMode = true;
      world.enemyStatMult = 2.0;

      applyAdversarialDifficultyScaling(world);

      expect(world.enemyStatMult).toBe(2.0 * ADVERSARIAL_ENEMY_STAT_MULT);
    });

    it('does not modify enemyStatMult when adversarialMode is false', () => {
      world.adversarialMode = false;
      world.enemyStatMult = 1.0;

      applyAdversarialDifficultyScaling(world);

      expect(world.enemyStatMult).toBe(1.0);
    });

    it('ADVERSARIAL_ENEMY_STAT_MULT is 1.25', () => {
      expect(ADVERSARIAL_ENEMY_STAT_MULT).toBe(1.25);
    });
  });

  // ---- World Defaults ----

  describe('world defaults', () => {
    it('adversarialMode defaults to false', () => {
      expect(world.adversarialMode).toBe(false);
    });

    it('opponentLodgeEid defaults to -1', () => {
      expect(world.opponentLodgeEid).toBe(-1);
    });

    it('opponentCommanderEid defaults to -1', () => {
      expect(world.opponentCommanderEid).toBe(-1);
    });
  });
});
