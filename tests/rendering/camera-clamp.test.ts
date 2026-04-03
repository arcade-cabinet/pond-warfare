/**
 * Tests: Camera clamp centering behavior
 *
 * When the map is smaller than the viewport, the camera should center
 * the map rather than pinning it to the top-left corner.
 */

import { describe, expect, it } from 'vitest';
import { clampCamera } from '@/rendering/camera';

function makeWorld(overrides: Partial<{
  worldWidth: number;
  worldHeight: number;
  viewWidth: number;
  viewHeight: number;
  camX: number;
  camY: number;
}>) {
  return {
    worldWidth: 1600,
    worldHeight: 2400,
    viewWidth: 1920,
    viewHeight: 1080,
    camX: 0,
    camY: 0,
    ...overrides,
  } as any;
}

describe('clampCamera', () => {
  it('centers map horizontally when map is narrower than viewport', () => {
    // Map: 800px wide, Viewport: 1920px wide -> should center
    const world = makeWorld({ worldWidth: 800, viewWidth: 1920, camX: 0 });
    clampCamera(world);
    // Expected: -(1920 - 800) / 2 = -560
    expect(world.camX).toBe(-560);
  });

  it('centers map vertically when map is shorter than viewport', () => {
    const world = makeWorld({ worldHeight: 600, viewHeight: 1080, camY: 0 });
    clampCamera(world);
    expect(world.camY).toBe(-240);
  });

  it('clamps normally when map is wider than viewport', () => {
    const world = makeWorld({
      worldWidth: 2400,
      viewWidth: 1920,
      camX: 600,
    });
    clampCamera(world);
    // Max camX = 2400 - 1920 = 480; camX=600 should clamp to 480
    expect(world.camX).toBe(480);
  });

  it('clamps normally when map is taller than viewport', () => {
    const world = makeWorld({
      worldHeight: 2400,
      viewHeight: 1080,
      camY: 1400,
    });
    clampCamera(world);
    // Max camY = 2400 - 1080 = 1320; camY=1400 should clamp to 1320
    expect(world.camY).toBe(1320);
  });

  it('does not go below zero when map is larger than viewport', () => {
    const world = makeWorld({
      worldWidth: 2400,
      viewWidth: 1920,
      camX: -100,
    });
    clampCamera(world);
    expect(world.camX).toBe(0);
  });

  it('handles exact match (map == viewport) by locking at zero', () => {
    const world = makeWorld({
      worldWidth: 1920,
      viewWidth: 1920,
      camX: 50,
    });
    clampCamera(world);
    // worldWidth == viewWidth => centering path: -(0)/2 = -0 which is ~0
    expect(Math.abs(world.camX)).toBe(0);
  });

  it('allows vertical scrolling when map is taller but narrower', () => {
    // Narrow but tall map (vertical map scenario)
    const world = makeWorld({
      worldWidth: 1600,
      worldHeight: 2400,
      viewWidth: 1920,
      viewHeight: 1080,
      camX: 500,
      camY: 800,
    });
    clampCamera(world);
    // Horizontal: map narrower -> center: -(1920-1600)/2 = -160
    expect(world.camX).toBe(-160);
    // Vertical: map taller -> clamp normally: 0 <= 800 <= 2400-1080=1320
    expect(world.camY).toBe(800);
  });
});
