/**
 * Tests: Lodge HP Bar (T37)
 *
 * Validates:
 * - Lodge HP/MaxHP store-v3 signals exist and sync correctly
 * - lodgeHpPercent computed signal returns correct 0-1 fraction
 * - lodgeHpColor changes at different HP percentage thresholds
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { COLORS } from '@/ui/design-tokens';
import { lodgeHp, lodgeHpColor, lodgeHpPercent, lodgeMaxHp } from '@/ui/store-v3';

describe('Lodge HP signals', () => {
  beforeEach(() => {
    lodgeHp.value = 0;
    lodgeMaxHp.value = 0;
  });

  it('lodgeHp and lodgeMaxHp are writable signals', () => {
    lodgeHp.value = 500;
    lodgeMaxHp.value = 1000;

    expect(lodgeHp.value).toBe(500);
    expect(lodgeMaxHp.value).toBe(1000);
  });

  it('lodgeHpPercent returns 1 when maxHp is 0 (no lodge)', () => {
    lodgeHp.value = 0;
    lodgeMaxHp.value = 0;

    expect(lodgeHpPercent.value).toBe(1);
  });

  it('lodgeHpPercent computes correct fraction', () => {
    lodgeMaxHp.value = 1000;
    lodgeHp.value = 750;
    expect(lodgeHpPercent.value).toBeCloseTo(0.75);

    lodgeHp.value = 500;
    expect(lodgeHpPercent.value).toBeCloseTo(0.5);

    lodgeHp.value = 100;
    expect(lodgeHpPercent.value).toBeCloseTo(0.1);

    lodgeHp.value = 1000;
    expect(lodgeHpPercent.value).toBeCloseTo(1.0);
  });

  it('lodgeHpPercent is 0 when HP is 0 but max is positive', () => {
    lodgeMaxHp.value = 1000;
    lodgeHp.value = 0;
    expect(lodgeHpPercent.value).toBe(0);
  });
});

describe('Lodge HP color thresholds', () => {
  beforeEach(() => {
    lodgeMaxHp.value = 1000;
  });

  it('returns success green when HP > 60%', () => {
    lodgeHp.value = 700;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackSuccess);

    lodgeHp.value = 610;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackSuccess);
  });

  it('returns warning amber when HP is 30-60%', () => {
    lodgeHp.value = 600;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackWarn);

    lodgeHp.value = 310;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackWarn);

    lodgeHp.value = 500;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackWarn);
  });

  it('returns red when HP <= 30%', () => {
    lodgeHp.value = 300;
    expect(lodgeHpColor.value).toBe('#ef4444');

    lodgeHp.value = 100;
    expect(lodgeHpColor.value).toBe('#ef4444');

    lodgeHp.value = 0;
    expect(lodgeHpColor.value).toBe('#ef4444');
  });

  it('color transitions at exact boundary values', () => {
    // Exactly 60% -> green (> 0.6)
    lodgeHp.value = 601;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackSuccess);

    // Exactly 60% -> warn (not > 0.6)
    lodgeHp.value = 600;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackWarn);

    // Exactly 30% -> warn (not <= 0.3, it's > 0.3)
    lodgeHp.value = 301;
    expect(lodgeHpColor.value).toBe(COLORS.feedbackWarn);

    // Just at 30% -> red (not > 0.3)
    lodgeHp.value = 300;
    expect(lodgeHpColor.value).toBe('#ef4444');
  });
});
