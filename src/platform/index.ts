// Native Capacitor integration (init, haptics, preferences)

// Device classification types
export type { DeviceInfo, FormFactor, ScreenInfo } from './device';
export {
  hapticImpact,
  initNativePlatform,
  isNative,
  loadPreference,
  platformType,
  savePreference,
} from './native';

// Reactive device signals
export {
  canDockPanels,
  cleanupDeviceSignals,
  formFactor,
  initDeviceSignals,
  inputMode,
  isCompactHeight,
  screenClass,
} from './signals';
