/**
 * New Game — Shared form controls
 *
 * Reusable OptionRow, SliderRow, and ToggleRow components used by all
 * four tab-content panels in the New Game modal.
 */

import type { CustomGameSettings } from '@/ui/store';

// ---- Tab definition ----

export type TabKey = 'map' | 'economy' | 'enemies' | 'rules' | 'commander';

export const TAB_LABELS: Record<TabKey, string> = {
  map: 'MAP',
  economy: 'ECON',
  enemies: 'FOES',
  rules: 'RULES',
  commander: 'CMDR',
};

export interface TabContentProps {
  settings: CustomGameSettings;
  onUpdate: (patch: Partial<CustomGameSettings>) => void;
}

// ---- OptionRow ----

export function OptionRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  renderLabel?: (v: T) => string;
}) {
  return (
    <div class="mb-3">
      <div
        class="font-game text-[10px] tracking-wider uppercase mb-1"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        {label}
      </div>
      <div class="flex flex-wrap gap-1">
        {options.map((opt) => {
          const isSelected = opt === value;
          return (
            <button
              key={String(opt)}
              type="button"
              class="action-btn rounded px-2 py-1 font-game text-[11px] md:text-xs"
              style={{
                minWidth: '44px',
                minHeight: '44px',
                background: isSelected ? 'rgba(64, 200, 208, 0.2)' : 'rgba(20, 30, 35, 0.8)',
                borderColor: isSelected ? 'var(--pw-accent)' : 'var(--pw-border)',
                color: isSelected ? 'var(--pw-accent-bright)' : 'var(--pw-text-muted)',
                boxShadow: isSelected ? '0 0 8px rgba(64, 200, 208, 0.2)' : 'none',
              }}
              onClick={() => onChange(opt)}
            >
              {renderLabel ? renderLabel(opt) : String(opt)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---- SliderRow ----

export function SliderRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  renderValue,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  renderValue?: (v: number) => string;
}) {
  return (
    <div class="mb-3">
      <div class="flex items-center justify-between mb-1">
        <span
          class="font-game text-[10px] tracking-wider uppercase"
          style={{ color: 'var(--pw-text-muted)' }}
        >
          {label}
        </span>
        <span class="font-numbers text-xs" style={{ color: 'var(--pw-accent)' }}>
          {renderValue ? renderValue(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onInput={(e) => onChange(Number((e.target as HTMLInputElement).value))}
        class="w-full"
        style={{ minHeight: '44px', accentColor: 'var(--pw-accent)' }}
      />
    </div>
  );
}

// ---- ToggleRow ----

export function ToggleRow({
  label,
  value,
  onChange,
  disabled,
  description,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  description?: string;
}) {
  return (
    <div class="mb-3 flex items-center justify-between gap-2" style={{ minHeight: '44px' }}>
      <div class="flex flex-col">
        <span
          class="font-game text-[10px] tracking-wider uppercase"
          style={{ color: 'var(--pw-text-muted)' }}
        >
          {label}
        </span>
        {description && (
          <span
            class="font-game text-[9px]"
            style={{ color: 'var(--pw-text-muted)', opacity: 0.6 }}
          >
            {description}
          </span>
        )}
      </div>
      <button
        type="button"
        class={`w-10 h-5 rounded-full relative cursor-pointer ${
          value ? 'toggle-track-active' : 'toggle-track'
        }`}
        style={{ minWidth: '40px', opacity: disabled ? 0.5 : 1 }}
        onClick={() => {
          if (!disabled) onChange(!value);
        }}
        disabled={disabled}
      >
        <span
          class={`toggle-thumb absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
