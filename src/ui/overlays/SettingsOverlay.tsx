/**
 * SettingsOverlay — Wraps SettingsPanel with standard game action handlers.
 *
 * Used in both menu and game screens to avoid duplicating the prop wiring.
 */

import { audio } from '@/audio/audio-system';
import { setColorBlindMode } from '@/rendering/pixi';
import { persistSetting } from '@/storage/settings-persistence';
import { setSpeed } from '../game-actions';
import { SettingsPanel } from '../settings-panel';
import * as store from '../store';

export function SettingsOverlay() {
  if (!store.settingsOpen.value) return null;

  return (
    <SettingsPanel
      onMasterVolumeChange={(v) => {
        store.masterVolume.value = v;
        audio.setMasterVolume(v);
        persistSetting('masterVolume', v);
      }}
      onMusicVolumeChange={(v) => {
        store.musicVolume.value = v;
        audio.setMusicVolume(v);
        persistSetting('musicVolume', v);
      }}
      onSfxVolumeChange={(v) => {
        store.sfxVolume.value = v;
        audio.setSfxVolume(v);
        persistSetting('sfxVolume', v);
      }}
      onSpeedSet={(speed) => {
        setSpeed(speed);
        persistSetting('gameSpeed', speed);
      }}
      onColorBlindToggle={() => {
        store.colorBlindMode.value = !store.colorBlindMode.value;
        setColorBlindMode(store.colorBlindMode.value);
        persistSetting('colorBlindMode', store.colorBlindMode.value);
      }}
      onAutoSaveToggle={() => {
        store.autoSaveEnabled.value = !store.autoSaveEnabled.value;
        persistSetting('autoSaveEnabled', store.autoSaveEnabled.value);
      }}
      onUiScaleChange={(scale) => {
        store.uiScale.value = scale;
        document.documentElement.style.fontSize = `${16 * scale}px`;
        persistSetting('uiScale', scale);
      }}
      onScreenShakeToggle={() => {
        store.screenShakeEnabled.value = !store.screenShakeEnabled.value;
        persistSetting('screenShakeEnabled', store.screenShakeEnabled.value);
      }}
      onReduceVisualNoiseToggle={() => {
        store.reduceVisualNoise.value = !store.reduceVisualNoise.value;
        persistSetting('reduceVisualNoise', store.reduceVisualNoise.value);
      }}
      onAutoPlayToggle={() => {
        store.autoPlayEnabled.value = !store.autoPlayEnabled.value;
        persistSetting('autoPlayEnabled', store.autoPlayEnabled.value);
      }}
      onClose={() => {
        store.settingsOpen.value = false;
      }}
    />
  );
}
