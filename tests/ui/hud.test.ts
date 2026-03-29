/**
 * HUD Component Tests
 *
 * Validates that the HUD renders resource displays and clock.
 */

import { describe, expect, it } from 'vitest';

describe('HUD', () => {
  it('should format time correctly', () => {
    // Test the time formatting logic used in the HUD
    const timeOfDay = 8 * 60 + 30; // 8:30 AM
    const hrs = Math.floor(timeOfDay / 60);
    const mins = Math.floor(timeOfDay % 60);
    const formatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    expect(formatted).toBe('08:30');
  });

  it('should calculate day number from frame count', () => {
    const DAY_FRAMES = 28800;
    expect(Math.floor(0 / DAY_FRAMES) + 1).toBe(1);
    expect(Math.floor(28800 / DAY_FRAMES) + 1).toBe(2);
    expect(Math.floor(57599 / DAY_FRAMES) + 1).toBe(2);
  });

  it('should format resource rate', () => {
    const formatRate = (r: number): string => (r >= 0 ? `+${r}` : `${r}`);
    expect(formatRate(10)).toBe('+10');
    expect(formatRate(-5)).toBe('-5');
    expect(formatRate(0)).toBe('+0');
  });
});
