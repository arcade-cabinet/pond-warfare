/**
 * Browser Device Detection — signal values at common viewport sizes.
 * Runs in a REAL browser via vitest browser mode + Playwright.
 * Does NOT mount the full game — only tests the signal module.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  _testReset, _testUpdateSignals,
  canDockPanels, formFactor, initDeviceSignals,
  inputMode, isCompactHeight, screenClass,
} from '@/platform/signals';

/** Resize viewport and synchronously recalculate signals. */
function resizeTo(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
  _testUpdateSignals();
}

describe('Device detection signals at common viewports', () => {
  beforeAll(async () => {
    _testReset();
    await initDeviceSignals();
  });

  afterAll(() => { resizeTo(1280, 720); });

  // screenClass breakpoints
  it('screenClass is compact at phone width (375x667)', () => {
    resizeTo(375, 667);
    expect(screenClass.value).toBe('compact');
  });

  it('screenClass is compact at narrow landscape (700x400)', () => {
    resizeTo(700, 400);
    expect(screenClass.value).toBe('compact');
  });

  it('screenClass is medium at tablet portrait (768x1024)', () => {
    resizeTo(768, 1024);
    expect(screenClass.value).toBe('medium');
  });

  it('screenClass is medium at 1024x768 landscape tablet', () => {
    resizeTo(1024, 768);
    expect(screenClass.value).toBe('medium');
  });

  it('screenClass is large at laptop width (1280x800)', () => {
    resizeTo(1280, 800);
    expect(screenClass.value).toBe('large');
  });

  it('screenClass is large at desktop width (1920x1080)', () => {
    resizeTo(1920, 1080);
    expect(screenClass.value).toBe('large');
  });

  // compact height
  it('isCompactHeight true when height < 500, forces compact screenClass', () => {
    resizeTo(800, 400);
    expect(isCompactHeight.value).toBe(true);
    expect(screenClass.value).toBe('compact');
  });

  it('isCompactHeight false when height >= 500', () => {
    resizeTo(800, 600);
    expect(isCompactHeight.value).toBe(false);
  });

  // canDockPanels
  it('canDockPanels is false at phone widths', () => {
    resizeTo(375, 667);
    expect(canDockPanels.value).toBe(false);
  });

  it('canDockPanels is false below 1100px threshold', () => {
    resizeTo(1000, 768);
    expect(canDockPanels.value).toBe(false);
  });

  it('canDockPanels is true at desktop widths', () => {
    resizeTo(1280, 800);
    expect(canDockPanels.value).toBe(true);
    resizeTo(1920, 1080);
    expect(canDockPanels.value).toBe(true);
  });

  // formFactor (web context: pointer:fine + hover:hover = laptop/desktop)
  it('formFactor is laptop at 1280 and desktop at 1920', () => {
    resizeTo(1280, 800);
    expect(formFactor.value).toBe('laptop');
    resizeTo(1920, 1080);
    expect(formFactor.value).toBe('desktop');
  });

  // inputMode (browser test always has fine pointer)
  it('inputMode is pointer in desktop browser', () => {
    resizeTo(1280, 800);
    expect(inputMode.value).toBe('pointer');
  });

  // breakpoint transitions
  it('transitions compact -> medium at 768px width boundary', () => {
    resizeTo(767, 600);
    expect(screenClass.value).toBe('compact');
    resizeTo(768, 600);
    expect(screenClass.value).toBe('medium');
  });

  it('transitions medium -> large at 1280px width boundary', () => {
    resizeTo(1279, 800);
    expect(screenClass.value).toBe('medium');
    resizeTo(1280, 800);
    expect(screenClass.value).toBe('large');
  });

  it('canDockPanels transitions at 1100px width boundary', () => {
    resizeTo(1100, 800);
    expect(canDockPanels.value).toBe(false);
    resizeTo(1101, 800);
    expect(canDockPanels.value).toBe(true);
  });
});
