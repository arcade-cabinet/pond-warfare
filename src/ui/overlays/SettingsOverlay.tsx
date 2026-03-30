/**
 * SettingsOverlay — Wraps SettingsPanel with standard game action handlers.
 *
 * Used in both menu and game screens to avoid duplicating the prop wiring.
 */

import { audio } from '@/audio/audio-system';
import { setColorBlindMode } from '@/rendering/pixi-app';
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
      }}
      onMusicVolumeChange={(v) => {
        store.musicVolume.value = v;
        audio.setMusicVolume(v);
      }}
      onSfxVolumeChange={(v) => {
        store.sfxVolume.value = v;
        audio.setSfxVolume(v);
      }}
      onSpeedSet={setSpeed}
      onColorBlindToggle={() => {
        store.colorBlindMode.value = !store.colorBlindMode.value;
        setColorBlindMode(store.colorBlindMode.value);
      }}
      onAutoSaveToggle={() => {
        store.autoSaveEnabled.value = !store.autoSaveEnabled.value;
      }}
      onUiScaleChange={(scale) => {
        store.uiScale.value = scale;
        document.documentElement.style.fontSize = `${16 * scale}px`;
      }}
      onScreenShakeToggle={() => {
        store.screenShakeEnabled.value = !store.screenShakeEnabled.value;
      }}
      onReduceVisualNoiseToggle={() => {
        store.reduceVisualNoise.value = !store.reduceVisualNoise.value;
      }}
      onClose={() => {
        store.settingsOpen.value = false;
      }}
    />
  );
}
