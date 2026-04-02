/**
 * AI Personality Differentiation Tests
 *
 * Verifies that each AI personality produces measurably different
 * configuration values, ensuring distinct gameplay experiences.
 */

import { describe, expect, it } from 'vitest';
import {
  AI_PERSONALITIES,
  type AIPersonality,
  RANDOM_SWITCH_INTERVAL,
  resolvePersonality,
} from '@/config/ai-personalities';

describe('AI Personality Differentiation', () => {
  it('turtle builds 2x+ towers and waits for army >= 10', () => {
    const turtle = AI_PERSONALITIES.turtle;
    expect(turtle.towerBuildRate).toBeGreaterThanOrEqual(2.0);
    expect(turtle.minArmyForAttack).toBeGreaterThanOrEqual(10);
    expect(turtle.buildPriority).toBe('defense');
  });

  it('rush attacks with minimal army and skips economy', () => {
    const rush = AI_PERSONALITIES.rush;
    expect(rush.attackThresholdMult).toBeLessThan(0.5);
    expect(rush.minArmyForAttack).toBeLessThanOrEqual(3);
    expect(rush.towerBuildRate).toBe(0);
    expect(rush.expansionRate).toBe(0);
    expect(rush.gathererRate).toBeLessThan(0.5);
    expect(rush.trainingPreference).toBe('melee');
  });

  it('economic expands to 3+ nests with 2x gatherers', () => {
    const economic = AI_PERSONALITIES.economic;
    expect(economic.targetNestCount).toBeGreaterThanOrEqual(3);
    expect(economic.gathererRate).toBeGreaterThanOrEqual(2.0);
    expect(economic.expansionRate).toBeGreaterThanOrEqual(2.0);
    expect(economic.buildPriority).toBe('economy');
  });

  it('balanced has neutral multipliers', () => {
    const balanced = AI_PERSONALITIES.balanced;
    expect(balanced.attackThresholdMult).toBe(1.0);
    expect(balanced.towerBuildRate).toBe(1.0);
    expect(balanced.expansionRate).toBe(1.0);
    expect(balanced.gathererRate).toBe(1.0);
  });

  it('each personality has unique combination of values', () => {
    const personalities = Object.values(AI_PERSONALITIES);
    for (let i = 0; i < personalities.length; i++) {
      for (let j = i + 1; j < personalities.length; j++) {
        const a = personalities[i];
        const b = personalities[j];
        // At least 3 fields must differ between any two personalities
        let differences = 0;
        if (a.attackThresholdMult !== b.attackThresholdMult) differences++;
        if (a.towerBuildRate !== b.towerBuildRate) differences++;
        if (a.expansionRate !== b.expansionRate) differences++;
        if (a.trainingPreference !== b.trainingPreference) differences++;
        if (a.gathererRate !== b.gathererRate) differences++;
        if (a.minArmyForAttack !== b.minArmyForAttack) differences++;
        expect(differences).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('random personality cycles every 3 minutes', () => {
    // 3 minutes at 60fps = 10800 frames
    expect(RANDOM_SWITCH_INTERVAL).toBe(10800);
  });

  it('random resolves to different personalities over time', () => {
    const personality: AIPersonality = 'random';
    const names = new Set<string>();
    for (let frame = 0; frame < RANDOM_SWITCH_INTERVAL * 4; frame += RANDOM_SWITCH_INTERVAL) {
      const config = resolvePersonality(personality, frame);
      names.add(config.name);
    }
    // Should cycle through all 4 concrete personalities
    expect(names.size).toBe(4);
  });

  it('resolvePersonality returns concrete config for non-random', () => {
    const result = resolvePersonality('turtle', 0);
    expect(result.name).toBe('Turtle');
    expect(result.minArmyForAttack).toBe(10);
  });
});
