/**
 * Design Tokens Tests
 *
 * Tests the design token constants: COLORS, FONTS, FRAME, and CSS_VAR_MAP.
 * Ensures the visual identity source of truth has all expected keys and values.
 */

import { describe, expect, it } from 'vitest';
import { COLORS, CSS_VAR_MAP, FONTS, FRAME } from '@/ui/design-tokens';

describe('COLORS', () => {
  it('has all expected keys', () => {
    const expectedKeys = [
      'grittyGold',
      'goldDim',
      'mossGreen',
      'mossDark',
      'weatheredSteel',
      'woodDark',
      'woodBase',
      'woodHighlight',
      'vineBase',
      'vineHighlight',
      'swampWater',
      'sepiaText',
      'bgPanel',
      'bloodRed',
      'muzzleFlash',
      'feedbackSuccess',
      'feedbackError',
      'feedbackInfo',
      'feedbackWarn',
    ];
    for (const key of expectedKeys) {
      expect(COLORS).toHaveProperty(key);
    }
  });

  it('grittyGold is "#C5A059"', () => {
    expect(COLORS.grittyGold).toBe('#C5A059');
  });

  it('feedback tokens have correct values', () => {
    expect(COLORS.feedbackSuccess).toBe('#4ade80');
    expect(COLORS.feedbackError).toBe('#f87171');
    expect(COLORS.feedbackInfo).toBe('#38bdf8');
    expect(COLORS.feedbackWarn).toBe('#f59e0b');
  });
});

describe('FONTS', () => {
  it('header contains "IM Fell English SC"', () => {
    expect(FONTS.header).toContain('IM Fell English SC');
  });

  it('body contains "Open Sans"', () => {
    expect(FONTS.body).toContain('Open Sans');
  });
});

describe('FRAME', () => {
  it('cornerSize is 60', () => {
    expect(FRAME.cornerSize).toBe(60);
  });
});

describe('CSS_VAR_MAP', () => {
  it('has --pw-gold key', () => {
    expect(CSS_VAR_MAP).toHaveProperty('--pw-gold');
  });
});
