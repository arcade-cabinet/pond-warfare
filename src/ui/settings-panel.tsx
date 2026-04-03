/**
 * Settings Panel
 *
 * Full-screen modal overlay with tabbed organization:
 *   Audio   — volume sliders (master, music, SFX)
 *   Game    — game speed controls
 *   Options — color blind mode, auto-save toggles
 *   Access  — UI scale, screen shake, reduce visual noise
 *
 * Accessible from the gear icon button in the HUD top bar.
 */

import { useMemo } from 'preact/hooks';
import { AdvisorSettings } from './components/AdvisorSettings';
import { Frame9Slice } from './components/frame';
import { type AccordionSection, PondAccordion } from './components/PondAccordion';
import { useScrollDrag } from './hooks/useScrollDrag';
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

function Toggle({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div class="flex items-center justify-between min-h-[44px]">
      <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
        {label}
      </span>
      <button
        type="button"
        class={`w-12 h-7 rounded-full relative cursor-pointer ${
          active ? 'toggle-track-active' : 'toggle-track'
        }`}
        onClick={onToggle}
      >
        <span
          class={`toggle-thumb absolute top-0.5 w-6 h-6 rounded-full ${
            active ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsPanel(props: SettingsPanelProps) {
  const currentSpeed = gameSpeed.value;
  const scrollRef = useScrollDrag<HTMLDivElement>();

  const sections: AccordionSection[] = useMemo(
    () => [
      { key: 'audio', title: 'Audio', summary: `Master ${masterVolume.value}%`, defaultOpen: true },
      {
        key: 'gameplay',
        title: 'Gameplay',
        summary: `Speed ${currentSpeed}x${autoSaveEnabled.value ? ', Auto-save ON' : ''}`,
      },
      { key: 'accessibility', title: 'Accessibility' },
      { key: 'advisors', title: 'Advisors' },
    ],
    [currentSpeed],
  );

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) props.onClose();
      }}
    >
      {/* Backdrop */}
      <div class="absolute inset-0" style={{ background: 'var(--pw-overlay-medium)' }} />

      {/* Panel card */}
      <div
        ref={scrollRef}
        class="relative w-80 max-w-[90vw] modal-scroll font-game text-sm z-10"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <Frame9Slice title="SETTINGS">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={props.onClose}
              title="Close Settings"
            >
              {'\u2715'}
            </button>

            {/* Accordion sections */}
            <PondAccordion sections={sections}>
              {/* Audio */}
              <div class="space-y-3">
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

              {/* Gameplay (merged Game + Options) */}
              <div class="space-y-3">
                <div class="section-header mb-2">Game Speed</div>
                <div class="flex gap-2">
                  {[1, 2, 3].map((s) => (
                    <button
                      type="button"
                      key={`speed-${s}`}
                      class="flex-1 py-1.5 min-h-[44px] rounded font-numbers font-bold text-xs cursor-pointer transition-colors hud-btn"
                      style={{
                        background: currentSpeed === s ? 'var(--pw-glow-accent-10)' : undefined,
                        borderColor: currentSpeed === s ? 'var(--pw-accent)' : undefined,
                        color: currentSpeed === s ? 'var(--pw-accent)' : 'var(--pw-text-muted)',
                      }}
                      onClick={() => props.onSpeedSet(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
                <Toggle
                  label="Color Blind Mode"
                  active={colorBlindMode.value}
                  onToggle={props.onColorBlindToggle}
                />
                <Toggle
                  label="Auto-save (every 60s)"
                  active={autoSaveEnabled.value}
                  onToggle={props.onAutoSaveToggle}
                />
              </div>

              {/* Accessibility */}
              <div class="space-y-3">
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
                          background: uiScale.value === s ? 'var(--pw-glow-accent-10)' : undefined,
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
                <Toggle
                  label="Screen Shake"
                  active={screenShakeEnabled.value}
                  onToggle={() => props.onScreenShakeToggle?.()}
                />
                <Toggle
                  label="Reduce Visual Noise"
                  active={reduceVisualNoise.value}
                  onToggle={() => props.onReduceVisualNoiseToggle?.()}
                />
              </div>

              {/* Advisors */}
              <AdvisorSettings />
            </PondAccordion>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
