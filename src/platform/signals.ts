/**
 * Device Signals — Reactive Preact signals for device state.
 *
 * UI components consume these signals for layout decisions.
 * Listens to CSS media queries, resize events, and orientation
 * changes. Detects foldable fold/unfold via aspect ratio shifts.
 *
 * Call `initDeviceSignals()` once at app startup.
 */

import { signal } from '@preact/signals';
import type { DeviceInfo, FormFactor, ScreenInfo } from './device';
import { classifyFormFactor, getDeviceInfo } from './device';

// ---------------------------------------------------------------------------
// Exported reactive signals
// ---------------------------------------------------------------------------

/** Primary device classification. */
export const formFactor = signal<FormFactor>('laptop');

/** How the user interacts — derived from CSS pointer media query. */
export const inputMode = signal<'touch' | 'pointer'>('pointer');

/** True when viewport supports a docked sidebar (width > 1100 AND not phone). */
export const canDockPanels = signal(false);

/** Layout bucket for CSS / component decisions. */
export const screenClass = signal<'compact' | 'medium' | 'large'>('large');

/** True when viewport height < 500px (landscape phones, small windows). */
export const isCompactHeight = signal(false);

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let lastAspectRatio = 0;
let lastAspectTime = 0;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let deviceInfo: DeviceInfo | null = null;

// ---------------------------------------------------------------------------
// Derived calculations
// ---------------------------------------------------------------------------

function buildScreenInfo(): ScreenInfo {
  const pointerCoarse = matchMedia('(pointer: coarse)').matches;
  const hoverCapable = matchMedia('(hover: hover)').matches;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    dpr: window.devicePixelRatio ?? 1,
    pointerCoarse,
    hoverCapable,
  };
}

function updateSignals(): void {
  const screen = buildScreenInfo();
  const w = screen.width;
  const h = screen.height;

  // Foldable detection: rapid aspect ratio shift > 0.4 within 500ms
  const aspect = w / Math.max(h, 1);
  const now = Date.now();
  const aspectDelta = Math.abs(aspect - lastAspectRatio);
  const timeDelta = now - lastAspectTime;
  const _isFoldEvent = lastAspectRatio > 0 && aspectDelta > 0.4 && timeDelta < 500;

  lastAspectRatio = aspect;
  lastAspectTime = now;

  // Classify form factor (fold events are handled implicitly — the changed
  // aspect ratio in screen dims causes classifyFormFactor to return the
  // correct foldable vs phone result for known foldable models)
  const device = deviceInfo ?? {
    model: '',
    manufacturer: '',
    platform: 'web' as const,
    isNative: false,
  };
  formFactor.value = classifyFormFactor(device, screen);

  // Input mode from CSS pointer media query
  inputMode.value = screen.pointerCoarse ? 'touch' : 'pointer';

  // Compact height
  isCompactHeight.value = h < 500;

  // Screen class
  if (w < 768 || h < 500) {
    screenClass.value = 'compact';
  } else if (w < 1280) {
    screenClass.value = 'medium';
  } else {
    screenClass.value = 'large';
  }

  // Can dock panels: wide enough AND not phone
  canDockPanels.value = w > 1100 && formFactor.value !== 'phone';

  // Sync CSS custom properties
  syncCSSProperties();
}

// ---------------------------------------------------------------------------
// CSS custom property sync
// ---------------------------------------------------------------------------

function syncCSSProperties(): void {
  const root = document.documentElement.style;
  root.setProperty('--pw-touch-target', inputMode.value === 'touch' ? '44px' : '32px');
  root.setProperty('--pw-panel-width', canDockPanels.value ? '300px' : '0px');
  root.setProperty('--pw-screen-class', screenClass.value);
}

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

function debouncedResize(): void {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(updateSignals, 150);
}

function onOrientationChange(): void {
  updateSignals();
}

function setupMediaQueryListeners(): void {
  const pointerQuery = matchMedia('(pointer: coarse)');
  if (pointerQuery.addEventListener) {
    pointerQuery.addEventListener('change', updateSignals);
  }

  const hoverQuery = matchMedia('(hover: hover)');
  if (hoverQuery.addEventListener) {
    hoverQuery.addEventListener('change', updateSignals);
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/** Initialize device signals. Call once from app init. */
export async function initDeviceSignals(): Promise<void> {
  deviceInfo = await getDeviceInfo();

  // Initial signal values
  updateSignals();

  // Resize listener (debounced)
  window.addEventListener('resize', debouncedResize);

  // Orientation change (immediate)
  window.addEventListener('orientationchange', onOrientationChange);

  // CSS media query change listeners
  setupMediaQueryListeners();
}

/** Exposed for testing — trigger a signal update without waiting for events. */
export function _testUpdateSignals(): void {
  updateSignals();
}

/** Exposed for testing — reset internal state between test cases. */
export function _testReset(): void {
  lastAspectRatio = 0;
  lastAspectTime = 0;
  deviceInfo = null;
}
