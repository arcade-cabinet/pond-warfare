/**
 * Settings Persistence Tests
 *
 * Validates that loadPersistedSettings hydrates store signals from
 * Capacitor Preferences, and that persistSetting writes the correct
 * key/value pairs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock platform preferences before importing the module under test
const mockLoad = vi.fn<(key: string) => Promise<string | null>>().mockResolvedValue(null);
const mockSave = vi
  .fn<(key: string, value: string) => Promise<void>>()
  .mockResolvedValue(undefined);

vi.mock('@/platform', () => ({
  loadPreference: (...args: [string]) => mockLoad(...args),
  savePreference: (...args: [string, string]) => mockSave(...args),
}));

import { loadPersistedSettings, persistSetting } from '@/storage/settings-persistence';
import * as store from '@/ui/store';

describe('Settings Persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset signals to defaults
    store.masterVolume.value = 80;
    store.musicVolume.value = 50;
    store.sfxVolume.value = 80;
    store.gameSpeed.value = 1;
    store.autoSaveEnabled.value = false;
    store.colorBlindMode.value = false;
    store.uiScale.value = 1;
    store.screenShakeEnabled.value = true;
    store.reduceVisualNoise.value = false;
    store.selectedCommander.value = 'marshal';
  });

  describe('loadPersistedSettings', () => {
    it('populates signals from stored values', async () => {
      mockLoad.mockImplementation(async (key: string) => {
        const data: Record<string, string> = {
          'setting-master-volume': '60',
          'setting-music-volume': '30',
          'setting-sfx-volume': '90',
          'setting-game-speed': '2',
          'setting-auto-save': 'true',
          'setting-color-blind': 'true',
          'setting-ui-scale': '1.5',
          'setting-screen-shake': 'false',
          'setting-reduce-noise': 'true',
          'setting-commander': 'warden',
        };
        return data[key] ?? null;
      });

      await loadPersistedSettings();

      expect(store.masterVolume.value).toBe(60);
      expect(store.musicVolume.value).toBe(30);
      expect(store.sfxVolume.value).toBe(90);
      expect(store.gameSpeed.value).toBe(2);
      expect(store.autoSaveEnabled.value).toBe(true);
      expect(store.colorBlindMode.value).toBe(true);
      expect(store.uiScale.value).toBe(1.5);
      expect(store.screenShakeEnabled.value).toBe(false);
      expect(store.reduceVisualNoise.value).toBe(true);
      expect(store.selectedCommander.value).toBe('warden');
    });

    it('keeps defaults when no stored values exist', async () => {
      mockLoad.mockResolvedValue(null);

      await loadPersistedSettings();

      expect(store.masterVolume.value).toBe(80);
      expect(store.musicVolume.value).toBe(50);
      expect(store.sfxVolume.value).toBe(80);
      expect(store.gameSpeed.value).toBe(1);
      expect(store.autoSaveEnabled.value).toBe(false);
      expect(store.colorBlindMode.value).toBe(false);
      expect(store.uiScale.value).toBe(1);
      expect(store.screenShakeEnabled.value).toBe(true);
      expect(store.reduceVisualNoise.value).toBe(false);
      expect(store.selectedCommander.value).toBe('marshal');
    });

    it('ignores invalid numeric values', async () => {
      mockLoad.mockImplementation(async (key: string) => {
        if (key === 'setting-master-volume') return 'notanumber';
        if (key === 'setting-game-speed') return '5'; // out of range
        return null;
      });

      await loadPersistedSettings();

      expect(store.masterVolume.value).toBe(80); // unchanged
      expect(store.gameSpeed.value).toBe(1); // unchanged (5 is out of 1-3 range)
    });
  });

  describe('persistSetting', () => {
    it('writes correct key/value for numeric settings', async () => {
      await persistSetting('masterVolume', 45);
      expect(mockSave).toHaveBeenCalledWith('setting-master-volume', '45');
    });

    it('writes correct key/value for boolean settings', async () => {
      await persistSetting('colorBlindMode', true);
      expect(mockSave).toHaveBeenCalledWith('setting-color-blind', 'true');
    });

    it('writes correct key/value for string settings', async () => {
      await persistSetting('selectedCommander', 'tactician');
      expect(mockSave).toHaveBeenCalledWith('setting-commander', 'tactician');
    });
  });
});
