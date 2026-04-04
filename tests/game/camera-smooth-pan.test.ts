/**
 * Tests: Camera smooth-pan (T23)
 *
 * Validates that smoothPanTo in game/camera.ts moves the camera
 * toward a target position. Since anime.js runs asynchronously,
 * we mock it to test the target computation and clamping.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock animejs to capture the animation target and callbacks
let _capturedTarget: Record<string, number> = {};
let capturedProps: any = {};

vi.mock('animejs', () => ({
  animate: vi.fn((target: any, props: any) => {
    _capturedTarget = target;
    capturedProps = props;
    // Simulate immediate completion by calling onUpdate then onComplete
    if (props.onUpdate) {
      target.camX = props.camX;
      target.camY = props.camY;
      props.onUpdate();
    }
    if (props.onComplete) {
      props.onComplete();
    }
    return { pause: vi.fn() };
  }),
}));

// Mock rendering/camera for clampCamera
vi.mock('@/rendering/camera', () => ({
  clampCamera: vi.fn(),
  computeMinZoom: vi.fn(() => 0.5),
  PANEL_MAX_ZOOM: 1.5,
}));

// Mock rendering/pixi-app
vi.mock('@/rendering/pixi-app', () => ({
  resizePixiApp: vi.fn(),
}));

import type { GameWorld } from '@/ecs/world';
import { type PanAnimHandle, setZoom, smoothPanTo } from '@/game/camera';
import { clampCamera } from '@/rendering/camera';

function makeWorld(overrides: Partial<GameWorld> = {}): GameWorld {
  return {
    camX: 0,
    camY: 0,
    viewWidth: 960,
    viewHeight: 540,
    isTracking: true,
    panelGrid: null,
    zoomLevel: 1.0,
    ...overrides,
  } as GameWorld;
}

describe('smoothPanTo', () => {
  beforeEach(() => {
    _capturedTarget = {};
    capturedProps = {};
    vi.clearAllMocks();
  });

  it('sets camera target to center the given world position', () => {
    const world = makeWorld({ camX: 0, camY: 0 });
    const handle: PanAnimHandle = { anim: null };

    smoothPanTo(world, 500, 300, handle);

    // Target: camX = 500 - 960/2 = 20, camY = 300 - 540/2 = 30
    expect(capturedProps.camX).toBe(500 - 960 / 2);
    expect(capturedProps.camY).toBe(300 - 540 / 2);
  });

  it('disables tracking when panning', () => {
    const world = makeWorld({ isTracking: true });
    const handle: PanAnimHandle = { anim: null };

    smoothPanTo(world, 100, 100, handle);

    expect(world.isTracking).toBe(false);
  });

  it('calls clampCamera during update', () => {
    const world = makeWorld();
    const handle: PanAnimHandle = { anim: null };

    smoothPanTo(world, 200, 200, handle);

    expect(clampCamera).toHaveBeenCalled();
  });

  it('updates world.camX and camY to target on completion', () => {
    const world = makeWorld({ camX: 0, camY: 0, viewWidth: 960, viewHeight: 540 });
    const handle: PanAnimHandle = { anim: null };

    smoothPanTo(world, 1440, 810, handle);

    // After mock completion, world should have the new values
    expect(world.camX).toBe(1440 - 480);
    expect(world.camY).toBe(810 - 270);
  });

  it('pauses previous animation before starting new one', () => {
    const mockPause = vi.fn();
    const handle: PanAnimHandle = { anim: { pause: mockPause } };
    const world = makeWorld();

    smoothPanTo(world, 100, 100, handle);

    expect(mockPause).toHaveBeenCalledOnce();
  });

  it('clears handle.anim on completion', () => {
    const world = makeWorld();
    const handle: PanAnimHandle = { anim: null };

    smoothPanTo(world, 100, 100, handle);

    // In production, onComplete fires asynchronously and clears handle.anim.
    // Our mock fires onComplete synchronously but then smoothPanTo assigns
    // the return value of animate() to handle.anim AFTER onComplete runs.
    // The key behavior: onComplete callback sets handle.anim = null.
    // Verify the callback exists and would clear it.
    expect(capturedProps.onComplete).toBeDefined();
    handle.anim = { pause: vi.fn() }; // simulate post-assignment state
    capturedProps.onComplete();
    expect(handle.anim).toBeNull();
  });

  it('uses 400ms duration and outQuad easing', () => {
    const world = makeWorld();
    const handle: PanAnimHandle = { anim: null };

    smoothPanTo(world, 100, 100, handle);

    expect(capturedProps.duration).toBe(400);
    expect(capturedProps.ease).toBe('outQuad');
  });
});

describe('setZoom', () => {
  it('clamps zoom to min and max bounds', () => {
    const world = makeWorld({ panelGrid: null });

    setZoom(world, 0.1);
    expect(world.zoomLevel).toBe(0.5); // fallback min

    setZoom(world, 3.0);
    expect(world.zoomLevel).toBe(1.5); // PANEL_MAX_ZOOM
  });

  it('sets zoom within valid range', () => {
    const world = makeWorld({ panelGrid: null });

    setZoom(world, 1.2);
    expect(world.zoomLevel).toBe(1.2);
  });
});
