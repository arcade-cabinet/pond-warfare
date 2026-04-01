/**
 * Device Detection & Form Factor Classification
 *
 * Wraps @capacitor/device (lazy, optional) and provides a pure
 * classifyFormFactor() function for multi-signal device classification.
 * See docs/superpowers/specs/2026-03-31-responsive-advisors-command-center-design.md
 */

import { Capacitor } from '@capacitor/core';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormFactor = 'phone' | 'foldable' | 'tablet' | 'laptop' | 'desktop';

export interface DeviceInfo {
  model: string;
  manufacturer: string;
  platform: 'web' | 'android' | 'ios';
  isNative: boolean;
}

export interface ScreenInfo {
  width: number;
  height: number;
  dpr: number;
  pointerCoarse: boolean;
  hoverCapable: boolean;
}

// ---------------------------------------------------------------------------
// Known Foldable Models
// ---------------------------------------------------------------------------

const FOLDABLE_PREFIXES: readonly string[] = [
  // Samsung Z Fold series
  'SM-F946',
  'SM-F936',
  'SM-F926',
  // OnePlus Open / Open 2
  'CPH2551',
  'CPH2611',
  // Google Pixel Fold / Pixel 9 Pro Fold
  'G0B96',
  'GGH4X',
];

/** Check whether a device model string matches a known foldable. */
export function isFoldableModel(model: string): boolean {
  const upper = model.toUpperCase();
  return FOLDABLE_PREFIXES.some((prefix) => upper.startsWith(prefix));
}

// ---------------------------------------------------------------------------
// Device Info (Capacitor wrapper with web fallback)
// ---------------------------------------------------------------------------

/** Retrieve device info via Capacitor Device plugin, falling back to web defaults. */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const platform = Capacitor.getPlatform() as 'web' | 'android' | 'ios';
  const isNative = Capacitor.isNativePlatform();

  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return {
      model: info.model ?? '',
      manufacturer: info.manufacturer ?? '',
      platform,
      isNative,
    };
  } catch {
    return { model: '', manufacturer: '', platform, isNative };
  }
}

// ---------------------------------------------------------------------------
// Form Factor Classification (pure function)
// ---------------------------------------------------------------------------

const ASPECT_RATIO_SQUARE_THRESHOLD = 1.3;

/** Classify form factor from device info and screen measurements. */
export function classifyFormFactor(device: DeviceInfo, screen: ScreenInfo): FormFactor {
  if (device.isNative) {
    return classifyNative(device, screen);
  }
  return classifyWeb(screen);
}

function classifyNative(device: DeviceInfo, screen: ScreenInfo): FormFactor {
  const maxDim = Math.max(screen.width, screen.height);
  const minDim = Math.min(screen.width, screen.height);
  const aspectRatio = maxDim / Math.max(minDim, 1);

  if (isFoldableModel(device.model)) {
    // Unfolded: aspect ratio close to 1:1 (square-ish)
    if (aspectRatio < ASPECT_RATIO_SQUARE_THRESHOLD) {
      return 'foldable';
    }
    // Folded: narrow aspect = phone
    return 'phone';
  }

  return maxDim < 1100 ? 'phone' : 'tablet';
}

function classifyWeb(screen: ScreenInfo): FormFactor {
  const minDim = Math.min(screen.width, screen.height);

  if (screen.pointerCoarse && !screen.hoverCapable) {
    // Touch device
    if (minDim < 500) return 'phone';
    return 'tablet';
  }

  if (!screen.pointerCoarse && screen.hoverCapable) {
    // Mouse/trackpad with hover
    return screen.width < 1600 ? 'laptop' : 'desktop';
  }

  // Fine pointer without hover (stylus, trackpad without hover)
  return 'laptop';
}
