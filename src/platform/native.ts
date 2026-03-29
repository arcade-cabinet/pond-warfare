/**
 * Native Platform Abstraction
 *
 * Provides Capacitor native plugin integration for mobile builds.
 * Falls back gracefully to web equivalents on non-native platforms.
 */

import { Capacitor } from '@capacitor/core';

/** Whether the app is running as a native mobile app. */
export const isNative = Capacitor.isNativePlatform();

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
  const { Preferences } = await import('@capacitor/preferences');
  await Preferences.set({ key, value });
}

/** Load a preference via Capacitor Preferences (works on all platforms). */
export async function loadPreference(key: string): Promise<string | null> {
  const { Preferences } = await import('@capacitor/preferences');
  const { value } = await Preferences.get({ key });
  return value;
}
