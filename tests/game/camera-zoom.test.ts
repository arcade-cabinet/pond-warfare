/**
 * Camera Zoom Tests
 *
 * Verifies computeInitialZoom produces correct zoom levels for various
 * map/viewport combinations so pixel-art sprites remain visible and tappable.
 */

import { describe, expect, it } from 'vitest';
import { computeInitialZoom } from '@/rendering/camera';

describe('computeInitialZoom', () => {
  it('zooms in when map is narrower than viewport (1600w map on 1920 viewport)', () => {
    const zoom = computeInitialZoom(1600, 1920);
    // 1920/1600 = 1.2, matches MIN_PLAYABLE_ZOOM
    expect(zoom).toBe(1.2);
  });

  it('uses MIN_PLAYABLE_ZOOM when width ratio is below the floor', () => {
    // 800px viewport on 1600px map: ratio = 0.5, should use MIN_PLAYABLE_ZOOM 1.2
    const zoom = computeInitialZoom(1600, 800);
    expect(zoom).toBe(1.2);
  });

  it('uses width ratio when it exceeds MIN_PLAYABLE_ZOOM', () => {
    // 2400px viewport on 1600px map: ratio = 1.5
    const zoom = computeInitialZoom(1600, 2400);
    expect(zoom).toBe(1.5);
  });

  it('clamps to max zoom of 2.0', () => {
    // 4000px viewport on 1600px map: ratio = 2.5, clamped to 2.0
    const zoom = computeInitialZoom(1600, 4000);
    expect(zoom).toBe(2.0);
  });

  it('handles progression level 2 map (2400w) on 1920 viewport', () => {
    // 1920/2400 = 0.8, below MIN_PLAYABLE_ZOOM 1.2
    const zoom = computeInitialZoom(2400, 1920);
    expect(zoom).toBe(1.2);
  });

  it('handles mobile viewport (375w) on 1600w map', () => {
    // 375/1600 = 0.234, below MIN_PLAYABLE_ZOOM -> 1.2
    const zoom = computeInitialZoom(1600, 375);
    expect(zoom).toBe(1.2);
  });

  it('never returns below 0.5', () => {
    // This shouldn't happen with MIN_PLAYABLE_ZOOM at 1.2, but verify clamp
    const zoom = computeInitialZoom(10000, 100);
    expect(zoom).toBeGreaterThanOrEqual(0.5);
  });

  it('never returns above 2.0', () => {
    const zoom = computeInitialZoom(100, 10000);
    expect(zoom).toBeLessThanOrEqual(2.0);
  });

  it('handles exact match viewport = map width', () => {
    // 1600/1600 = 1.0, below MIN_PLAYABLE_ZOOM -> 1.2
    const zoom = computeInitialZoom(1600, 1600);
    expect(zoom).toBe(1.2);
  });

  it('progression level 1 map (2000w) on 1920 viewport', () => {
    // 1920/2000 = 0.96, below MIN_PLAYABLE_ZOOM 1.2
    const zoom = computeInitialZoom(2000, 1920);
    expect(zoom).toBe(1.2);
  });
});
