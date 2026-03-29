/**
 * HUD Component Tests
 *
 * Validates HUD formatting helpers against their production implementations.
 */

import { describe, expect, it } from 'vitest';
import { formatRate, formatTime, frameToDay } from '@/ui/hud';

describe('HUD helpers', () => {
  it('formatTime should produce HH:MM from minutes', () => {
    expect(formatTime(8 * 60 + 30)).toBe('08:30');
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(23 * 60 + 59)).toBe('23:59');
  });

  it('frameToDay should compute day number from frame count', () => {
    const DAY_FRAMES = 28800;
    expect(frameToDay(0, DAY_FRAMES)).toBe(1);
    expect(frameToDay(28800, DAY_FRAMES)).toBe(2);
    expect(frameToDay(57599, DAY_FRAMES)).toBe(2);
  });

  it('formatRate should prefix positive with + and negative with -', () => {
    expect(formatRate(10)).toBe('+10');
    expect(formatRate(-5)).toBe('-5');
    expect(formatRate(0)).toBe('+0');
  });
});
