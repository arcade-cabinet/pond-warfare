/**
 * Water Ripple Tests
 *
 * Validates frame cycling intervals and initialization.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  _getCurrentFrame,
  _getCycleIntervals,
  resetWaterRipples,
  updateWaterRipples,
} from '@/rendering/water-ripple';

describe('water ripple frame cycling', () => {
  beforeEach(() => {
    resetWaterRipples();
  });

  afterEach(() => {
    resetWaterRipples();
  });

  it('should expose correct cycle interval constants', () => {
    const intervals = _getCycleIntervals();
    expect(intervals.water).toBe(90);
    expect(intervals.shallows).toBe(60);
  });

  it('should start at frame 0 for both terrain types', () => {
    expect(_getCurrentFrame('water')).toBe(0);
    expect(_getCurrentFrame('shallows')).toBe(0);
  });

  it('should not change frame when textures are not initialised', () => {
    // Without calling initWaterRipples, updateWaterRipples is a no-op
    updateWaterRipples(90);
    expect(_getCurrentFrame('water')).toBe(0);
    updateWaterRipples(60);
    expect(_getCurrentFrame('shallows')).toBe(0);
  });
});

describe('water ripple cycle intervals', () => {
  it('deep water cycles every 90 frames', () => {
    const { water } = _getCycleIntervals();
    expect(water).toBe(90);
  });

  it('shallows cycles every 60 frames', () => {
    const { shallows } = _getCycleIntervals();
    expect(shallows).toBe(60);
  });

  it('shallows cycles faster than deep water', () => {
    const { water, shallows } = _getCycleIntervals();
    expect(shallows).toBeLessThan(water);
  });
});
