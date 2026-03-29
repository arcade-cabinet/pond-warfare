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
    <label class="flex items-center gap-3 w-full min-h-[44px]">
      <span class="font-game text-xs w-24 shrink-0" style={{ color: 'var(--pw-text-secondary)' }}>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        class="flex-1 h-6 appearance-none rounded cursor-pointer touch-none"
        style={{ background: 'var(--pw-border)', accentColor: 'var(--pw-accent)' }}
      />
      <span class="font-numbers text-xs w-8 text-right" style={{ color: 'var(--pw-text-muted)' }}>{value}</span>
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
      <div class="absolute inset-0" style={{ background: 'rgba(12, 26, 31, 0.8)' }} />

      {/* Panel card */}
      <div
        class="relative rounded-lg shadow-2xl w-80 max-w-[90vw] max-h-[90vh] overflow-y-auto overscroll-contain p-5 font-game text-sm z-10"
        style={{
          background: 'var(--pw-bg-surface)',
          border: '2px solid var(--pw-border)',
          color: 'var(--pw-text-primary)',
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title text-lg tracking-wide" style={{ color: 'var(--pw-accent)' }}>Settings</h2>
          <button
            type="button"
            class="text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors"
            style={{ color: 'var(--pw-text-muted)' }}
            onClick={props.onClose}
            title="Close Settings"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Volume section */}
        <div class="space-y-3 mb-5">
          <div class="font-heading text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pw-text-muted)' }}>Audio</div>
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
          <div class="font-heading text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--pw-text-muted)' }}>Game Speed</div>
          <div class="flex gap-2">
            {[1, 2, 3].map((s) => (
              <button
                type="button"
                key={`speed-${s}`}
                class="flex-1 py-1.5 min-h-[44px] rounded border font-numbers font-bold text-xs cursor-pointer transition-colors"
                style={{
                  background: currentSpeed === s ? 'var(--pw-bg-elevated)' : 'var(--pw-bg-surface)',
                  borderColor: currentSpeed === s ? 'var(--pw-accent)' : 'var(--pw-border)',
                  color: currentSpeed === s ? 'var(--pw-accent)' : 'var(--pw-text-muted)',
                }}
                onClick={() => props.onSpeedSet(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Toggles section */}
        <div class="space-y-3">
          <div class="font-heading text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--pw-text-muted)' }}>Options</div>

          {/* Color Blind Mode */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>Color Blind Mode</span>
            <button
              type="button"
              class="w-12 h-7 rounded-full relative cursor-pointer transition-colors"
              style={{ background: colorBlindMode.value ? 'var(--pw-warning)' : 'var(--pw-border)' }}
              onClick={props.onColorBlindToggle}
              title="Toggle Color Blind Mode"
            >
              <span
                class={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
                  colorBlindMode.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto-save */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>Auto-save (every 60s)</span>
            <button
              type="button"
              class="w-12 h-7 rounded-full relative cursor-pointer transition-colors"
              style={{ background: autoSaveEnabled.value ? 'var(--pw-success)' : 'var(--pw-border)' }}
              onClick={props.onAutoSaveToggle}
              title="Toggle Auto-save"
            >
              <span
                class={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${
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
