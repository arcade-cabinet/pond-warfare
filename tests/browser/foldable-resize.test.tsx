/**
 * Browser Foldable Resize Tests
 *
 * Validates that device signals update correctly when the viewport
 * changes between phone-sized and foldable-unfolded dimensions,
 * simulating a foldable device fold/unfold cycle.
 *
 * Runs in browser mode via vitest + Playwright.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  _testReset,
  _testUpdateSignals,
  canDockPanels,
  initDeviceSignals,
  screenClass,
} from '@/platform/signals';

function resizeTo(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
  _testUpdateSignals();
}

describe('Foldable resize transitions', () => {
  beforeAll(async () => {
    _testReset();
    await initDeviceSignals();
  });

  afterAll(() => {
    resizeTo(1280, 720);
  });

  it('phone viewport (400x800): compact, no docking', () => {
    resizeTo(400, 800);
    expect(screenClass.value).toBe('compact');
    expect(canDockPanels.value).toBe(false);
  });

  it('foldable unfolded (1800x1600): large, docking enabled', () => {
    resizeTo(1800, 1600);
    expect(screenClass.value).toBe('large');
    expect(canDockPanels.value).toBe(true);
  });

  it('fold back to phone: signals revert to compact', () => {
    // Start unfolded
    resizeTo(1800, 1600);
    expect(screenClass.value).toBe('large');
    expect(canDockPanels.value).toBe(true);

    // Fold back
    resizeTo(400, 800);
    expect(screenClass.value).toBe('compact');
    expect(canDockPanels.value).toBe(false);
  });

  it('intermediate tablet size is medium', () => {
    resizeTo(900, 1200);
    expect(screenClass.value).toBe('medium');
    expect(canDockPanels.value).toBe(false);
  });
});
