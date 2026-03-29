/**
 * New Game Modal
 *
 * Modal overlay for configuring a new game: game name (randomized),
 * tabbed custom game builder with Map/Economy/Enemies/Rules tabs,
 * preset buttons, and seed display. Dispatches to store and transitions
 * to playing state.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  customGameSettings,
  type CustomGameSettings,
  customMapSeed,
  DEFAULT_CUSTOM_SETTINGS,
  type DifficultyLevel,
  gameName,
  gameSeed,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
} from './store';

// ---- Name generator pools ----

const ADJECTIVES = [
  'Muddy',
  'Swift',
  'Ancient',
  'Verdant',
  'Lurking',
  'Twilight',
  'Mossy',
  'Crimson',
  'Silver',
  'Golden',
  'Stormy',
  'Peaceful',
  'Raging',
  'Silent',
  'Hidden',
  'Frozen',
  'Emerald',
  'Savage',
  'Sacred',
  'Hollow',
];

const NOUNS = [
  'Pond',
  'Marsh',
  'Wetlands',
  'Creek',
  'Basin',
  'Lagoon',
  'Swamp',
  'Brook',
  'Delta',
  'Shallows',
  'Rapids',
  'Estuary',
  'Tributary',
  'Bayou',
  'Thicket',
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateName(): string {
  const adj1 = pickRandom(ADJECTIVES);
  let adj2 = pickRandom(ADJECTIVES);
  while (adj2 === adj1) adj2 = pickRandom(ADJECTIVES);
  const noun = pickRandom(NOUNS);
  return `${adj1} ${adj2} ${noun}`;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// ---- Presets ----

type PresetKey =
  | 'easy'
  | 'normal'
  | 'hard'
  | 'nightmare'
  | 'ultraNightmare'
  | 'sandbox'
  | 'speedrun'
  | 'survival';

const PRESETS: Record<PresetKey, Partial<CustomGameSettings>> = {
  easy: {
    scenario: 'standard',
    resourceDensity: 'rich',
    startingResourcesMult: 1.5,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 1,
    enemyEconomy: 'weak',
    enemyAggression: 'passive',
    evolutionSpeed: 'slow',
    peaceMinutes: 4,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
  normal: { ...DEFAULT_CUSTOM_SETTINGS },
  hard: {
    scenario: 'standard',
    resourceDensity: 'sparse',
    startingResourcesMult: 0.75,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 3,
    enemyEconomy: 'strong',
    enemyAggression: 'aggressive',
    evolutionSpeed: 'normal',
    peaceMinutes: 1,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
  nightmare: {
    scenario: 'standard',
    resourceDensity: 'sparse',
    startingResourcesMult: 0.5,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 4,
    enemyEconomy: 'overwhelming',
    enemyAggression: 'relentless',
    evolutionSpeed: 'fast',
    peaceMinutes: 0,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
  ultraNightmare: {
    scenario: 'standard',
    resourceDensity: 'sparse',
    startingResourcesMult: 0.5,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 5,
    enemyEconomy: 'overwhelming',
    enemyAggression: 'relentless',
    evolutionSpeed: 'fast',
    peaceMinutes: 0,
    permadeath: true,
    fogOfWar: 'full',
    heroMode: false,
  },
  sandbox: {
    scenario: 'standard',
    resourceDensity: 'abundant',
    startingResourcesMult: 2.0,
    gatherSpeed: 'fast',
    startingUnits: 8,
    enemyNests: 1,
    enemyEconomy: 'weak',
    enemyAggression: 'passive',
    evolutionSpeed: 'slow',
    peaceMinutes: 8,
    permadeath: false,
    fogOfWar: 'revealed',
    heroMode: false,
  },
  speedrun: {
    scenario: 'standard',
    resourceDensity: 'normal',
    startingResourcesMult: 1.0,
    gatherSpeed: 'fast',
    startingUnits: 4,
    enemyNests: 2,
    enemyEconomy: 'normal',
    enemyAggression: 'normal',
    evolutionSpeed: 'fast',
    peaceMinutes: 0,
    permadeath: false,
    fogOfWar: 'explored',
    heroMode: false,
  },
  survival: {
    scenario: 'standard',
    resourceDensity: 'rich',
    startingResourcesMult: 1.0,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 0,
    enemyEconomy: 'normal',
    enemyAggression: 'relentless',
    evolutionSpeed: 'normal',
    peaceMinutes: 2,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
};

/** Map preset keys to DifficultyLevel for backward compatibility. */
function presetToDifficulty(preset: PresetKey): DifficultyLevel {
  switch (preset) {
    case 'easy':
      return 'easy';
    case 'hard':
      return 'hard';
    case 'nightmare':
      return 'nightmare';
    case 'ultraNightmare':
      return 'ultraNightmare';
    default:
      return 'normal';
  }
}

const PRESET_LABELS: Record<PresetKey, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  nightmare: 'Nightmare',
  ultraNightmare: 'Ultra',
  sandbox: 'Sandbox',
  speedrun: 'Speedrun',
  survival: 'Survival',
};

const PRESET_COLORS: Record<PresetKey, string> = {
  easy: '#22c55e',
  normal: 'var(--pw-accent)',
  hard: '#ef4444',
  nightmare: '#a855f7',
  ultraNightmare: '#dc2626',
  sandbox: '#60a5fa',
  speedrun: '#f59e0b',
  survival: '#ec4899',
};

// ---- Tab definitions ----

type TabKey = 'map' | 'economy' | 'enemies' | 'rules';

const TAB_LABELS: Record<TabKey, string> = {
  map: 'MAP',
  economy: 'ECONOMY',
  enemies: 'ENEMIES',
  rules: 'RULES',
};

// ---- Shared sub-components ----

/** A row of option buttons where one is selected. */
function OptionRow<T extends string | number>({
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
                background: isSelected
                  ? 'rgba(64, 200, 208, 0.2)'
                  : 'rgba(20, 30, 35, 0.8)',
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

/** A slider control with labeled value. */
function SliderRow({
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
        <span
          class="font-numbers text-xs"
          style={{ color: 'var(--pw-accent)' }}
        >
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

/** A toggle switch with label. */
function ToggleRow({
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

// ---- Tab content components ----

function MapTab({
  settings,
  onUpdate,
}: {
  settings: CustomGameSettings;
  onUpdate: (patch: Partial<CustomGameSettings>) => void;
}) {
  return (
    <div>
      <OptionRow
        label="Scenario"
        options={['standard', 'island', 'contested'] as const}
        value={settings.scenario}
        onChange={(v) => onUpdate({ scenario: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Resource Density"
        options={['sparse', 'normal', 'rich', 'abundant'] as const}
        value={settings.resourceDensity}
        onChange={(v) => onUpdate({ resourceDensity: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
    </div>
  );
}

function EconomyTab({
  settings,
  onUpdate,
}: {
  settings: CustomGameSettings;
  onUpdate: (patch: Partial<CustomGameSettings>) => void;
}) {
  return (
    <div>
      <SliderRow
        label="Starting Resources"
        min={0.5}
        max={2.0}
        step={0.25}
        value={settings.startingResourcesMult}
        onChange={(v) => onUpdate({ startingResourcesMult: v })}
        renderValue={(v) => `${Math.round(v * 100)}%`}
      />
      <OptionRow
        label="Gather Speed"
        options={['slow', 'normal', 'fast'] as const}
        value={settings.gatherSpeed}
        onChange={(v) => onUpdate({ gatherSpeed: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Starting Units"
        options={[3, 4, 6, 8] as const}
        value={settings.startingUnits}
        onChange={(v) => onUpdate({ startingUnits: v })}
      />
    </div>
  );
}

function EnemiesTab({
  settings,
  onUpdate,
}: {
  settings: CustomGameSettings;
  onUpdate: (patch: Partial<CustomGameSettings>) => void;
}) {
  return (
    <div>
      <SliderRow
        label="Enemy Nests"
        min={0}
        max={5}
        step={1}
        value={settings.enemyNests}
        onChange={(v) => onUpdate({ enemyNests: v })}
      />
      <OptionRow
        label="Enemy Economy"
        options={['weak', 'normal', 'strong', 'overwhelming'] as const}
        value={settings.enemyEconomy}
        onChange={(v) => onUpdate({ enemyEconomy: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Enemy Aggression"
        options={['passive', 'normal', 'aggressive', 'relentless'] as const}
        value={settings.enemyAggression}
        onChange={(v) => onUpdate({ enemyAggression: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <OptionRow
        label="Evolution Speed"
        options={['slow', 'normal', 'fast', 'instant'] as const}
        value={settings.evolutionSpeed}
        onChange={(v) => onUpdate({ evolutionSpeed: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
    </div>
  );
}

function RulesTab({
  settings,
  onUpdate,
}: {
  settings: CustomGameSettings;
  onUpdate: (patch: Partial<CustomGameSettings>) => void;
}) {
  return (
    <div>
      <OptionRow
        label="Peace Timer"
        options={[0, 1, 2, 4, 8] as const}
        value={settings.peaceMinutes}
        onChange={(v) => onUpdate({ peaceMinutes: v })}
        renderLabel={(v) => (v === 0 ? 'None' : `${v}m`)}
      />
      <ToggleRow
        label="Permadeath"
        value={settings.permadeath}
        onChange={(v) => onUpdate({ permadeath: v })}
        description="+50% resources, +25% XP, but death is permanent"
      />
      <OptionRow
        label="Fog of War"
        options={['full', 'explored', 'revealed'] as const}
        value={settings.fogOfWar}
        onChange={(v) => onUpdate({ fogOfWar: v })}
        renderLabel={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
      />
      <ToggleRow
        label="Hero Mode"
        value={settings.heroMode}
        onChange={(v) => onUpdate({ heroMode: v })}
        description="Commander has boosted stats and abilities"
      />
    </div>
  );
}

// ---- Main component ----

export function NewGameModal() {
  const [name, setName] = useState(() => generateName());
  const [seed, setSeed] = useState(() => generateSeed());
  const [settings, setSettings] = useState<CustomGameSettings>(() => ({
    ...DEFAULT_CUSTOM_SETTINGS,
  }));
  const [activeTab, setActiveTab] = useState<TabKey>('map');
  const [activePreset, setActivePreset] = useState<PresetKey | null>('normal');
  const [editingSeed, setEditingSeed] = useState(false);
  const [seedText, setSeedText] = useState('');
  const [shuffleAnim, setShuffleAnim] = useState(false);

  const handleUpdate = useCallback(
    (patch: Partial<CustomGameSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
      // Clear active preset when user tweaks individual settings
      setActivePreset(null);
    },
    [],
  );

  const handlePreset = useCallback((key: PresetKey) => {
    const preset = PRESETS[key];
    setSettings({ ...DEFAULT_CUSTOM_SETTINGS, ...preset });
    setActivePreset(key);
  }, []);

  // Auto-force permadeath when ultraNightmare preset is active
  useEffect(() => {
    if (activePreset === 'ultraNightmare') {
      setSettings((prev) => ({ ...prev, permadeath: true }));
    }
  }, [activePreset]);

  const handleShuffle = useCallback(() => {
    const newName = generateName();
    const newSeed = generateSeed();
    setName(newName);
    setSeed(newSeed);
    setShuffleAnim(true);
    setTimeout(() => setShuffleAnim(false), 400);
  }, []);

  const handleStartGame = useCallback(() => {
    // Determine difficulty level for backwards compat
    const diffLevel = activePreset ? presetToDifficulty(activePreset) : 'normal';

    // Write to store signals
    selectedDifficulty.value = diffLevel;
    permadeathEnabled.value = settings.permadeath;
    customGameSettings.value = { ...settings };
    gameName.value = name;
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
  }, [settings, activePreset, name, seed]);

  const handleClose = useCallback(() => {
    menuState.value = 'main';
  }, []);

  const tabKeys: TabKey[] = ['map', 'economy', 'enemies', 'rules'];
  const presetKeys: PresetKey[] = [
    'easy',
    'normal',
    'hard',
    'nightmare',
    'ultraNightmare',
    'sandbox',
    'speedrun',
    'survival',
  ];

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Backdrop */}
      <div class="absolute inset-0" style={{ background: 'rgba(12, 26, 31, 0.85)' }} />

      {/* Modal panel */}
      <div
        class="relative rounded-lg shadow-2xl w-[480px] max-w-[95vw] max-h-[95vh] overflow-y-auto overscroll-contain p-5 md:p-6 font-game text-sm z-10 parchment-panel"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title text-xl tracking-wide" style={{ color: 'var(--pw-accent)' }}>
            New Game
          </h2>
          <button
            type="button"
            class="hud-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded"
            onClick={handleClose}
            title="Close"
          >
            {'\u2715'}
          </button>
        </div>

        {/* Game Name + Seed row */}
        <div class="mb-4">
          <div class="flex items-center gap-2 mb-1">
            <input
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => e.stopPropagation()}
              class="font-game text-sm px-3 py-2 rounded flex-1"
              style={{
                minHeight: '44px',
                background: 'rgba(20, 30, 35, 0.8)',
                border: '1px solid var(--pw-border)',
                color: 'var(--pw-text-primary)',
                outline: 'none',
              }}
            />
            <button
              type="button"
              class="hud-btn rounded flex items-center justify-center text-lg"
              style={{
                minWidth: '44px',
                minHeight: '44px',
                transition: 'transform 0.3s ease',
                transform: shuffleAnim ? 'rotate(360deg) scale(1.1)' : 'none',
              }}
              onClick={handleShuffle}
              title="Randomize name and seed"
            >
              {'\uD83D\uDD00'}
            </button>
          </div>
          {/* Seed display */}
          <div class="flex items-center gap-2">
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-text-muted)' }}>
              Seed:
            </span>
            {editingSeed ? (
              <input
                type="text"
                value={seedText}
                onInput={(e) => setSeedText((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    const parsed = Number(seedText);
                    if (Number.isFinite(parsed) && parsed > 0) {
                      setSeed(Math.floor(parsed));
                    } else {
                      // Hash string to number
                      let hash = 0;
                      for (let i = 0; i < seedText.length; i++) {
                        hash = (hash * 31 + seedText.charCodeAt(i)) & 0x7fffffff;
                      }
                      setSeed(hash || 1);
                    }
                    setEditingSeed(false);
                  }
                }}
                onBlur={() => {
                  const parsed = Number(seedText);
                  if (Number.isFinite(parsed) && parsed > 0) {
                    setSeed(Math.floor(parsed));
                  }
                  setEditingSeed(false);
                }}
                // biome-ignore lint/a11y/noAutofocus: seed input auto-focuses on click-to-edit
                autoFocus
                class="font-numbers text-xs px-2 py-1 rounded"
                style={{
                  width: '140px',
                  minHeight: '32px',
                  background: 'rgba(20, 30, 35, 0.8)',
                  border: '1px solid var(--pw-accent-dim)',
                  color: 'var(--pw-text-secondary)',
                  outline: 'none',
                }}
              />
            ) : (
              <button
                type="button"
                class="font-numbers text-xs cursor-pointer hover:underline"
                style={{
                  color: 'var(--pw-text-muted)',
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  minHeight: '32px',
                }}
                onClick={() => {
                  setSeedText(String(seed));
                  setEditingSeed(true);
                }}
                title="Click to edit seed"
              >
                {seed}
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div class="flex gap-1 mb-3">
          {tabKeys.map((key) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                class="hud-btn rounded px-3 py-1.5 font-heading font-bold text-[10px] md:text-xs tracking-wider flex-1"
                style={{
                  minHeight: '44px',
                  background: isActive
                    ? 'rgba(64, 200, 208, 0.15)'
                    : undefined,
                  borderColor: isActive ? 'var(--pw-accent)' : undefined,
                  color: isActive ? 'var(--pw-accent-bright)' : 'var(--pw-text-muted)',
                  boxShadow: isActive ? '0 0 8px rgba(64, 200, 208, 0.15)' : undefined,
                }}
                onClick={() => setActiveTab(key)}
              >
                {TAB_LABELS[key]}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div
          class="rounded-lg p-3 mb-4"
          style={{
            background: 'rgba(20, 30, 35, 0.6)',
            border: '1px solid var(--pw-border)',
            minHeight: '180px',
          }}
        >
          {activeTab === 'map' && <MapTab settings={settings} onUpdate={handleUpdate} />}
          {activeTab === 'economy' && <EconomyTab settings={settings} onUpdate={handleUpdate} />}
          {activeTab === 'enemies' && <EnemiesTab settings={settings} onUpdate={handleUpdate} />}
          {activeTab === 'rules' && <RulesTab settings={settings} onUpdate={handleUpdate} />}
        </div>

        {/* Presets row */}
        <div class="mb-4">
          <div
            class="font-game text-[10px] tracking-wider uppercase mb-2"
            style={{ color: 'var(--pw-text-muted)' }}
          >
            Presets
          </div>
          <div class="flex flex-wrap gap-1">
            {presetKeys.map((key) => {
              const isActive = activePreset === key;
              const color = PRESET_COLORS[key];
              return (
                <button
                  key={key}
                  type="button"
                  class="stone-node rounded px-2 py-1 font-heading font-bold text-[9px] md:text-[10px] tracking-wider cursor-pointer transition-all duration-150"
                  style={{
                    minWidth: '44px',
                    minHeight: '36px',
                    background: isActive ? `${color}25` : 'rgba(20, 30, 35, 0.8)',
                    borderColor: isActive ? color : 'var(--pw-border)',
                    color: isActive ? color : 'var(--pw-text-muted)',
                    boxShadow: isActive ? `0 0 8px ${color}30` : 'none',
                  }}
                  onClick={() => handlePreset(key)}
                  title={`Apply ${PRESET_LABELS[key]} preset`}
                >
                  {PRESET_LABELS[key]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Game button */}
        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider w-full animate-begin-glow"
          style={{
            minHeight: '56px',
            padding: '14px 32px',
            color: 'var(--pw-accent)',
            borderColor: 'var(--pw-accent-dim)',
          }}
          onClick={handleStartGame}
        >
          START GAME
        </button>
      </div>
    </div>
  );
}
