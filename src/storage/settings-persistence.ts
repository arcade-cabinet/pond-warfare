/**
 * Settings Persistence
 *
 * Bridges store signals to Capacitor Preferences so that user settings
 * (volume, game speed, accessibility, commander) survive app restarts.
 */

import { loadPreference, savePreference } from '@/platform';
import * as store from '@/ui/store';

const SETTINGS_KEYS = {
  masterVolume: 'setting-master-volume',
  musicVolume: 'setting-music-volume',
  sfxVolume: 'setting-sfx-volume',
  gameSpeed: 'setting-game-speed',
  autoSaveEnabled: 'setting-auto-save',
  colorBlindMode: 'setting-color-blind',
  uiScale: 'setting-ui-scale',
  screenShakeEnabled: 'setting-screen-shake',
  reduceVisualNoise: 'setting-reduce-noise',
  selectedCommander: 'setting-commander',
} as const;

export type SettingKey = keyof typeof SETTINGS_KEYS;

/** Load all persisted settings into store signals. Call once at app startup. */
export async function loadPersistedSettings(): Promise<void> {
  const entries = Object.entries(SETTINGS_KEYS) as [SettingKey, string][];
  const results = await Promise.all(entries.map(([, prefKey]) => loadPreference(prefKey)));

  for (let i = 0; i < entries.length; i++) {
    const [key] = entries[i];
    const raw = results[i];
    if (raw === null) continue;

    switch (key) {
      case 'masterVolume':
      case 'musicVolume':
      case 'sfxVolume': {
        const n = Number(raw);
        if (!Number.isNaN(n)) store[key].value = n;
        break;
      }
      case 'gameSpeed': {
        const n = Number(raw);
        if (!Number.isNaN(n) && n >= 1 && n <= 3) store.gameSpeed.value = n;
        break;
      }
      case 'uiScale': {
        const n = Number(raw);
        if (!Number.isNaN(n) && [1, 1.5, 2].includes(n)) {
          store.uiScale.value = n;
          document.documentElement.style.fontSize = `${16 * n}px`;
        }
        break;
      }
      case 'autoSaveEnabled':
      case 'colorBlindMode':
      case 'screenShakeEnabled':
      case 'reduceVisualNoise':
        store[key].value = raw === 'true';
        break;
      case 'selectedCommander':
        store.selectedCommander.value = raw;
        break;
    }
  }
}

/** Save a single setting to persistent storage. */
export async function persistSetting(key: SettingKey, value: string | number | boolean): Promise<void> {
  await savePreference(SETTINGS_KEYS[key], String(value));
}
