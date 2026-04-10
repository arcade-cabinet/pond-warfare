/**
 * Settings Persistence
 *
 * Bridges store signals to Capacitor Preferences so that user settings
 * (volume, game speed, accessibility, commander) survive app restarts.
 */

import { loadPreference, savePreference } from '@/platform';
import { GameError, logError } from '@/errors';
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
  autoPlayEnabled: 'setting-auto-play',
} as const;

export type SettingKey = keyof typeof SETTINGS_KEYS;

function reportSettingsPersistenceError(
  action: 'load' | 'save',
  key: SettingKey,
  prefKey: string,
  error: unknown,
): void {
  logError(
    new GameError(`Failed to ${action} setting "${key}"`, 'settings-persistence', {
      cause: error,
      context: { key, prefKey, action },
    }),
  );
}

/** Load all persisted settings into store signals. Call once at app startup. */
export async function loadPersistedSettings(): Promise<void> {
  const entries = Object.entries(SETTINGS_KEYS) as [SettingKey, string][];
  const results = await Promise.allSettled(entries.map(([, prefKey]) => loadPreference(prefKey)));

  for (let i = 0; i < entries.length; i++) {
    const [key, prefKey] = entries[i];
    const result = results[i];
    if (result.status === 'rejected') {
      reportSettingsPersistenceError('load', key, prefKey, result.reason);
      continue;
    }
    const raw = result.value;
    if (raw === null) continue;

    switch (key) {
      case 'masterVolume': {
        const mv = Number(raw);
        if (!Number.isNaN(mv)) store.masterVolume.value = mv;
        break;
      }
      case 'musicVolume': {
        const muv = Number(raw);
        if (!Number.isNaN(muv)) store.musicVolume.value = muv;
        break;
      }
      case 'sfxVolume': {
        const sv = Number(raw);
        if (!Number.isNaN(sv)) store.sfxVolume.value = sv;
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
          if (typeof document !== 'undefined') {
            document.documentElement.style.fontSize = `${16 * n}px`;
          }
        }
        break;
      }
      case 'autoSaveEnabled':
        store.autoSaveEnabled.value = raw === 'true';
        break;
      case 'colorBlindMode':
        store.colorBlindMode.value = raw === 'true';
        break;
      case 'screenShakeEnabled':
        store.screenShakeEnabled.value = raw === 'true';
        break;
      case 'reduceVisualNoise':
        store.reduceVisualNoise.value = raw === 'true';
        break;
      case 'selectedCommander':
        store.selectedCommander.value = raw;
        break;
      case 'autoPlayEnabled':
        store.autoPlayEnabled.value = raw === 'true';
        break;
    }
  }
}

/** Save a single setting to persistent storage. */
export async function persistSetting(
  key: SettingKey,
  value: string | number | boolean,
): Promise<boolean> {
  const prefKey = SETTINGS_KEYS[key];
  try {
    await savePreference(prefKey, String(value));
    return true;
  } catch (error) {
    reportSettingsPersistenceError('save', key, prefKey, error);
    return false;
  }
}
