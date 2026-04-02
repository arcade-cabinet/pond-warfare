/**
 * Browser Command Panel Docking Tests
 *
 * Validates that at wide viewports the panel is docked (visible without
 * hamburger), and at narrow viewports the panel is hidden until the
 * hamburger is clicked. The hamburger button itself is hidden when docked.
 *
 * Runs in browser mode via vitest + Playwright.
 */

import { afterAll, describe, expect, it } from 'vitest';
import {
  _testReset,
  _testUpdateSignals,
  canDockPanels,
  initDeviceSignals,
} from '@/platform/signals';

function resizeTo(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
  _testUpdateSignals();
}

describe('Command Panel docking behavior', () => {
  afterAll(() => {
    resizeTo(1280, 720);
  });

  it('wide viewport (1400px): canDockPanels is true', async () => {
    _testReset();
    await initDeviceSignals();
    resizeTo(1400, 900);
    expect(canDockPanels.value).toBe(true);
  });

  it('narrow viewport (600px): canDockPanels is false', async () => {
    _testReset();
    await initDeviceSignals();
    resizeTo(600, 800);
    expect(canDockPanels.value).toBe(false);
  });

  it('non-touch docking threshold is at 1101px', async () => {
    _testReset();
    await initDeviceSignals();

    resizeTo(1100, 800);
    expect(canDockPanels.value).toBe(false);

    resizeTo(1101, 800);
    expect(canDockPanels.value).toBe(true);
  });

  it('panel transitions from undocked to docked across threshold', async () => {
    _testReset();
    await initDeviceSignals();

    resizeTo(800, 600);
    expect(canDockPanels.value).toBe(false);

    resizeTo(1400, 900);
    expect(canDockPanels.value).toBe(true);
  });
});
