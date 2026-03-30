/**
 * Native Platform Abstraction
 *
 * Provides Capacitor native plugin integration for mobile builds.
 * Falls back gracefully to web equivalents on non-native platforms.
 *
 * Exports reactive platform signals (isMobile, isTablet, etc.) that
 * UI components can use for layout decisions beyond CSS breakpoints.
 */

import { Capacitor } from '@capacitor/core';
import { signal } from '@preact/signals';

/** Whether the app is running as a native mobile app. */
export const isNative = Capacitor.isNativePlatform();

/** The Capacitor platform: 'web', 'android', or 'ios'. */
export const platformType = Capacitor.getPlatform() as 'web' | 'android' | 'ios';

// ---------------------------------------------------------------------------
// Reactive device classification signals
// ---------------------------------------------------------------------------

/** True when the device has a touch screen (native OR mobile web). */
export const isTouchDevice = signal(
  isNative || ('ontouchstart' in globalThis) || navigator.maxTouchPoints > 0,
);

/** True on phones (native mobile OR small-screen touch web). */
export const isMobile = signal(false);

/** True on tablets (medium touch screens). */
export const isTablet = signal(false);

/** True on desktop browsers (non-touch or large screens). */
export const isDesktop = signal(false);

/** True when viewport is too short for full desktop layouts (landscape phones, small windows). */
export const isCompactHeight = signal(false);

/** Recalculate device class from screen dimensions. */
function updateDeviceClass(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  const touch = isTouchDevice.peek();

  // Height-based compactness (landscape phones, small windows)
  isCompactHeight.value = h < 500;

  if (platformType === 'android' || platformType === 'ios') {
    // Native: classify by screen size
    isMobile.value = maxDim < 1100;
    isTablet.value = maxDim >= 1100;
    isDesktop.value = false;
  } else if (touch && minDim < 500) {
    // Small touch screen = phone-class (landscape phone is ~360-414 height)
    isMobile.value = true;
    isTablet.value = false;
    isDesktop.value = false;
  } else if (touch && minDim < 820) {
    // Medium touch screen = tablet-class
    isMobile.value = false;
    isTablet.value = true;
    isDesktop.value = false;
  } else if (!touch && h < 500) {
    // Non-touch but very short viewport = treat as compact/mobile-like
    isMobile.value = true;
    isTablet.value = false;
    isDesktop.value = false;
  } else {
    // Large screen or non-touch = desktop
    isMobile.value = false;
    isTablet.value = false;
    isDesktop.value = true;
  }
}

// Initial classification + listen for resize/orientation changes
updateDeviceClass();
window.addEventListener('resize', updateDeviceClass);
window.addEventListener('orientationchange', updateDeviceClass);

/** Initialize native platform features (StatusBar, ScreenOrientation, back button, app state). */
export async function initNativePlatform(): Promise<void> {
  if (!isNative) return;

  try {
    const { StatusBar } = await import('@capacitor/status-bar');
    await StatusBar.hide();
  } catch {
    /* StatusBar plugin not available */
  }

  try {
    const { ScreenOrientation } = await import('@capacitor/screen-orientation');
    await ScreenOrientation.lock({ orientation: 'landscape' });
  } catch {
    /* Screen orientation plugin not available */
  }

  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', () => {
      window.dispatchEvent(new CustomEvent('native-back'));
    });
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) window.dispatchEvent(new CustomEvent('native-pause'));
    });
  } catch {
    /* App plugin not available */
  }
}

/** Trigger haptic feedback on native devices. */
export async function hapticImpact(style: 'light' | 'medium' | 'heavy' = 'light'): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
  } catch {
    /* Haptics not available */
  }
}

/** Save a preference via Capacitor Preferences (works on all platforms). */
export async function savePreference(key: string, value: string): Promise<void> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  } catch {
    /* Preferences plugin not available - preference not persisted */
  }
}

/** Load a preference via Capacitor Preferences (works on all platforms). */
export async function loadPreference(key: string): Promise<string | null> {
  try {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value;
  } catch {
    /* Preferences plugin not available */
    return null;
  }
}
