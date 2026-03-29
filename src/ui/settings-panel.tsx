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
  reduceVisualNoise,
  screenShakeEnabled,
  sfxVolume,
  uiScale,
} from './store';

export interface SettingsPanelProps {
  onMasterVolumeChange: (v: number) => void;
  onMusicVolumeChange: (v: number) => void;
  onSfxVolumeChange: (v: number) => void;
  onSpeedSet: (speed: number) => void;
  onColorBlindToggle: () => void;
  onAutoSaveToggle: () => void;
  onUiScaleChange?: (scale: number) => void;
  onScreenShakeToggle?: () => void;
  onReduceVisualNoiseToggle?: () => void;
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
      <span class="font-game text-xs w-24 shrink-0" style={{ color: 'var(--pw-text-secondary)' }}>
        {label}
      </span>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        class="flex-1 h-6 appearance-none rounded cursor-pointer touch-none"
        style={{ background: 'var(--pw-border)', accentColor: 'var(--pw-accent)' }}
      />
      <span class="font-numbers text-xs w-8 text-right" style={{ color: 'var(--pw-text-muted)' }}>
        {value}
      </span>
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
        class="relative rounded-lg shadow-2xl w-80 max-w-[90vw] max-h-[90vh] overflow-y-auto overscroll-contain p-5 font-game text-sm z-10 parchment-panel"
        style={{
          color: 'var(--pw-text-primary)',
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title text-lg tracking-wide" style={{ color: 'var(--pw-accent)' }}>
            Settings
          </h2>
          <button
            type="button"
            class="hud-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded"
            onClick={props.onClose}
            title="Close Settings"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Volume section */}
        <div class="space-y-3 mb-5">
          <div class="section-header mb-1">Audio</div>
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
          <div class="section-header mb-2">Game Speed</div>
          <div class="flex gap-2">
            {[1, 2, 3].map((s) => (
              <button
                type="button"
                key={`speed-${s}`}
                class={`flex-1 py-1.5 min-h-[44px] rounded font-numbers font-bold text-xs cursor-pointer transition-colors hud-btn`}
                style={{
                  background:
                    currentSpeed === s
                      ? 'linear-gradient(180deg, var(--pw-wood-light), var(--pw-wood-mid))'
                      : undefined,
                  borderColor: currentSpeed === s ? 'var(--pw-accent)' : undefined,
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
          <div class="section-header mb-1">Options</div>

          {/* Color Blind Mode */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
              Color Blind Mode
            </span>
            <button
              type="button"
              class={`w-12 h-7 rounded-full relative cursor-pointer ${
                colorBlindMode.value ? 'toggle-track-active' : 'toggle-track'
              }`}
              onClick={props.onColorBlindToggle}
              title="Toggle Color Blind Mode"
            >
              <span
                class={`toggle-thumb absolute top-0.5 w-6 h-6 rounded-full ${
                  colorBlindMode.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Auto-save */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
              Auto-save (every 60s)
            </span>
            <button
              type="button"
              class={`w-12 h-7 rounded-full relative cursor-pointer ${
                autoSaveEnabled.value ? 'toggle-track-active' : 'toggle-track'
              }`}
              onClick={props.onAutoSaveToggle}
              title="Toggle Auto-save"
            >
              <span
                class={`toggle-thumb absolute top-0.5 w-6 h-6 rounded-full ${
                  autoSaveEnabled.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Accessibility section */}
        <div class="space-y-3 mt-5">
          <div class="section-header mb-1">Accessibility</div>

          {/* UI Scale */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
              UI Scale
            </span>
            <div class="flex gap-2">
              {[1, 1.5, 2].map((s) => (
                <button
                  type="button"
                  key={`scale-${s}`}
                  class="px-2 py-1 min-h-[44px] rounded font-numbers font-bold text-xs cursor-pointer transition-colors hud-btn"
                  style={{
                    background:
                      uiScale.value === s
                        ? 'linear-gradient(180deg, var(--pw-wood-light), var(--pw-wood-mid))'
                        : undefined,
                    borderColor: uiScale.value === s ? 'var(--pw-accent)' : undefined,
                    color: uiScale.value === s ? 'var(--pw-accent)' : 'var(--pw-text-muted)',
                  }}
                  onClick={() => props.onUiScaleChange?.(s)}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* Screen Shake */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
              Screen Shake
            </span>
            <button
              type="button"
              class={`w-12 h-7 rounded-full relative cursor-pointer ${
                screenShakeEnabled.value ? 'toggle-track-active' : 'toggle-track'
              }`}
              onClick={() => props.onScreenShakeToggle?.()}
              title="Toggle Screen Shake"
            >
              <span
                class={`toggle-thumb absolute top-0.5 w-6 h-6 rounded-full ${
                  screenShakeEnabled.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Reduce Visual Noise */}
          <div class="flex items-center justify-between min-h-[44px]">
            <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
              Reduce Visual Noise
            </span>
            <button
              type="button"
              class={`w-12 h-7 rounded-full relative cursor-pointer ${
                reduceVisualNoise.value ? 'toggle-track-active' : 'toggle-track'
              }`}
              onClick={() => props.onReduceVisualNoiseToggle?.()}
              title="Toggle Reduce Visual Noise"
            >
              <span
                class={`toggle-thumb absolute top-0.5 w-6 h-6 rounded-full ${
                  reduceVisualNoise.value ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
