/**
 * Settings Panel
 *
 * Full-screen modal overlay with volume sliders, game speed controls,
 * color blind mode toggle, and auto-save toggle. Accessible from the
 * gear icon button in the HUD top bar.
 */

import {
  autoSaveEnabled,
  colorBlindMode,
  gameSpeed,
  masterVolume,
  musicVolume,
  sfxVolume,
} from './store';

export interface SettingsPanelProps {
  onMasterVolumeChange: (v: number) => void;
  onMusicVolumeChange: (v: number) => void;
  onSfxVolumeChange: (v: number) => void;
  onSpeedSet: (speed: number) => void;
  onColorBlindToggle: () => void;
  onAutoSaveToggle: () => void;
  onClose: () => void;
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label class="flex items-center gap-3 w-full">
      <span class="text-slate-300 text-xs w-24 shrink-0">{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        class="flex-1 h-2 appearance-none bg-slate-600 rounded cursor-pointer accent-sky-500"
      />
      <span class="text-slate-400 text-xs w-8 text-right">{value}</span>
    </label>
  );
}

export function SettingsPanel(props: SettingsPanelProps) {
  const currentSpeed = gameSpeed.value;

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      {/* Backdrop */}
      <div class="absolute inset-0 bg-black bg-opacity-70" />

      {/* Panel card */}
      <div class="relative bg-slate-800 border-2 border-slate-600 rounded-lg shadow-2xl w-80 max-w-[90vw] p-5 font-mono text-sm text-slate-200 z-10">
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-sky-300 tracking-wide">Settings</h2>
          <button
            type="button"
            class="text-slate-400 hover:text-slate-200 text-xl leading-none cursor-pointer px-1"
            onClick={props.onClose}
            title="Close Settings"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Volume section */}
        <div class="space-y-3 mb-5">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Audio</div>
          <VolumeSlider
            label="Master Volume"
            value={masterVolume.value}
            onChange={props.onMasterVolumeChange}
          />
          <VolumeSlider
            label="Music Volume"
            value={musicVolume.value}
            onChange={props.onMusicVolumeChange}
          />
          <VolumeSlider
            label="SFX Volume"
            value={sfxVolume.value}
            onChange={props.onSfxVolumeChange}
          />
        </div>

        {/* Game Speed section */}
        <div class="mb-5">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-2">Game Speed</div>
          <div class="flex gap-2">
            {[1, 2, 3].map((s) => (
              <button
                type="button"
                key={`speed-${s}`}
                class={`flex-1 py-1.5 rounded border font-bold text-xs cursor-pointer transition-colors ${
                  currentSpeed === s
                    ? 'bg-sky-700 border-sky-500 text-sky-200'
                    : 'bg-slate-700 border-slate-500 text-slate-400 hover:bg-slate-600'
                }`}
                onClick={() => props.onSpeedSet(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Toggles section */}
        <div class="space-y-3">
          <div class="text-xs text-slate-500 uppercase tracking-wider mb-1">Options</div>

          {/* Color Blind Mode */}
          <div class="flex items-center justify-between">
            <span class="text-slate-300 text-xs">Color Blind Mode</span>
            <button
              type="button"
              class={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                colorBlindMode.value ? 'bg-amber-600' : 'bg-slate-600'
              }`}
              onClick={props.onColorBlindToggle}
              title="Toggle Color Blind Mode"
            >
              <span
                class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  colorBlindMode.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto-save */}
          <div class="flex items-center justify-between">
            <span class="text-slate-300 text-xs">Auto-save (every 60s)</span>
            <button
              type="button"
              class={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
                autoSaveEnabled.value ? 'bg-green-600' : 'bg-slate-600'
              }`}
              onClick={props.onAutoSaveToggle}
              title="Toggle Auto-save"
            >
              <span
                class={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  autoSaveEnabled.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
