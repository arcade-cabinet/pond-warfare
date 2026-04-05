// @vitest-environment jsdom
/** Device Signals — Unit Tests */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform/device', () => ({
  classifyFormFactor: vi.fn(() => 'laptop' as const),
  getDeviceInfo: vi.fn(async () => null),
}));

import { classifyFormFactor } from '@/platform/device';

import { _testReset } from '@/platform/signals';

const mockClassify = vi.mocked(classifyFormFactor);
type MQLListener = (e: { matches: boolean }) => void;
const mediaListeners = new Map<string, MQLListener[]>();

function mockMatchMedia(query: string) {
  if (!mediaListeners.has(query)) mediaListeners.set(query, []);
  const matches =
    query === '(pointer: coarse)'
      ? ((globalThis as any).__pointerCoarse ?? false)
      : query === '(hover: hover)'
        ? ((globalThis as any).__hoverCapable ?? true)
        : false;
  return {
    matches,
    addEventListener(_event: string, cb: MQLListener) {
      mediaListeners.get(query)?.push(cb);
    },
    removeEventListener() {},
  };
}

let origMatchMedia: typeof window.matchMedia, origW: number, origH: number;

beforeEach(() => {
  mediaListeners.clear();
  (globalThis as any).__pointerCoarse = false;
  (globalThis as any).__hoverCapable = true;
  origMatchMedia = window.matchMedia;
  origW = window.innerWidth;
  origH = window.innerHeight;
  window.matchMedia = mockMatchMedia as any;
  mockClassify.mockReset();
  mockClassify.mockReturnValue('laptop');
  _testReset();
});

afterEach(() => {
  window.matchMedia = origMatchMedia;
  Object.defineProperty(window, 'innerWidth', { value: origW, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: origH, configurable: true });
  document.documentElement.style.removeProperty('--pw-touch-target');
  document.documentElement.style.removeProperty('--pw-panel-width');
  document.documentElement.style.removeProperty('--pw-screen-class');
  vi.restoreAllMocks();
});

function setViewport(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
}

describe('Device Signals', () => {
  const loadSignals = () => import('@/platform/signals');

  it('initDeviceSignals sets initial signal values', async () => {
    setViewport(1400, 900);
    const mod = await loadSignals();
    await mod.initDeviceSignals();
    expect(mod.formFactor.value).toBe('laptop');
    expect(mod.inputMode.value).toBe('pointer');
    expect(mod.canDockPanels.value).toBe(true);
    expect(mod.screenClass.value).toBe('large');
    expect(mod.isCompactHeight.value).toBe(false);
  });
  it('screenClass is compact when width < 768', async () => {
    mockClassify.mockReturnValue('phone');
    setViewport(600, 900);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.screenClass.value).toBe('compact');
  });
  it('screenClass is compact when height < 500', async () => {
    mockClassify.mockReturnValue('phone');
    setViewport(1000, 400);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.screenClass.value).toBe('compact');
    expect(mod.isCompactHeight.value).toBe(true);
  });
  it('screenClass is medium for widths 768-1279', async () => {
    mockClassify.mockReturnValue('tablet');
    setViewport(1024, 768);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.screenClass.value).toBe('medium');
  });
  it('screenClass is large for widths >= 1280', async () => {
    mockClassify.mockReturnValue('desktop');
    setViewport(1920, 1080);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.screenClass.value).toBe('large');
  });
  it('canDockPanels true for laptop when width > 1100', async () => {
    mockClassify.mockReturnValue('laptop');
    setViewport(1200, 800);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(true);
  });
  it('canDockPanels false for non-touch when width <= 1100', async () => {
    // Non-touch (pointerCoarse=false) requires > 1100 to dock
    mockClassify.mockReturnValue('laptop');
    setViewport(1000, 768);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(false);
  });
  it('canDockPanels false for phone even if wide', async () => {
    mockClassify.mockReturnValue('phone');
    setViewport(1200, 800);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(false);
  });
  // --- Tablet docking (US4) ---
  it('canDockPanels true for touch tablet at 768px (iPad Mini landscape)', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('tablet');
    setViewport(768, 1024);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(true);
  });
  it('canDockPanels true for touch tablet at 1024px (iPad Mini)', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('tablet');
    setViewport(1024, 768);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(true);
  });
  it('canDockPanels true for touch tablet at 1180px (iPad Air)', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('tablet');
    setViewport(1180, 820);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(true);
  });
  it('canDockPanels false for touch phone at 375px', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('phone');
    setViewport(375, 812);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(false);
  });
  it('canDockPanels false for touch at 600px (large phone)', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('phone');
    setViewport(600, 900);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.canDockPanels.value).toBe(false);
  });
  it('inputMode is touch when pointer:coarse matches', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('tablet');
    setViewport(1024, 768);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(mod.inputMode.value).toBe('touch');
  });
  it('CSS --pw-touch-target is 44px for touch, 32px for pointer', async () => {
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('tablet');
    setViewport(1024, 768);
    const mod = await loadSignals();
    mod._testUpdateSignals();
    expect(document.documentElement.style.getPropertyValue('--pw-touch-target')).toBe('44px');

    (globalThis as any).__pointerCoarse = false;
    mockClassify.mockReturnValue('laptop');
    setViewport(1400, 900);
    mod._testUpdateSignals();
    expect(document.documentElement.style.getPropertyValue('--pw-touch-target')).toBe('32px');
  });
  it('CSS --pw-panel-width is 300px for large docked, 250px for medium docked, 0px undocked', async () => {
    const mod = await loadSignals();

    // Large screen: 300px
    mockClassify.mockReturnValue('laptop');
    setViewport(1400, 900);
    mod._testUpdateSignals();
    expect(document.documentElement.style.getPropertyValue('--pw-panel-width')).toBe('300px');

    // Medium screen (touch tablet at 1024px): 250px
    (globalThis as any).__pointerCoarse = true;
    mockClassify.mockReturnValue('tablet');
    setViewport(1024, 768);
    mod._testUpdateSignals();
    expect(document.documentElement.style.getPropertyValue('--pw-panel-width')).toBe('250px');

    // Undocked (phone): 0px
    mockClassify.mockReturnValue('phone');
    setViewport(600, 400);
    mod._testUpdateSignals();
    expect(document.documentElement.style.getPropertyValue('--pw-panel-width')).toBe('0px');
  });
  it('CSS --pw-screen-class matches screenClass signal at each viewport', async () => {
    const mod = await loadSignals();
    const root = document.documentElement.style;

    // compact (width < 768)
    mockClassify.mockReturnValue('phone');
    setViewport(600, 900);
    mod._testUpdateSignals();
    expect(root.getPropertyValue('--pw-screen-class')).toBe('compact');

    // medium (768 <= width < 1280)
    mockClassify.mockReturnValue('tablet');
    setViewport(1024, 768);
    mod._testUpdateSignals();
    expect(root.getPropertyValue('--pw-screen-class')).toBe('medium');

    // large (width >= 1280)
    mockClassify.mockReturnValue('desktop');
    setViewport(1920, 1080);
    mod._testUpdateSignals();
    expect(root.getPropertyValue('--pw-screen-class')).toBe('large');
  });
  it('reclassifies when aspect ratio changes > 0.4 within 500ms (fold event)', async () => {
    mockClassify.mockReturnValue('phone');
    setViewport(400, 800);
    const mod = await loadSignals();

    // First call establishes baseline aspect ratio
    mod._testUpdateSignals();
    expect(mockClassify).toHaveBeenCalled();

    // Simulate unfold: drastic aspect ratio change
    mockClassify.mockReturnValue('foldable');
    setViewport(1800, 1600);
    mod._testUpdateSignals();
    // 400/800=0.5 vs 1800/1600=1.125 => delta=0.625 > 0.4 — triggers reclassification
    expect(mod.formFactor.value).toBe('foldable');
  });
  it('no fold event when aspect ratio change is small', async () => {
    mockClassify.mockReturnValue('laptop');
    setViewport(1400, 900);
    const mod = await loadSignals();
    mod._testUpdateSignals();

    setViewport(1350, 900);
    mod._testUpdateSignals();
    // 1400/900=1.556 vs 1350/900=1.500 => delta=0.056 < 0.4 — no fold event
    expect(mod.formFactor.value).toBe('laptop');
  });
});
