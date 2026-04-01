/**
 * New Game Modal
 *
 * Modal overlay for configuring a new game: game name (randomized),
 * tabbed custom game builder with Map/Economy/Enemies/Rules tabs,
 * preset buttons, and seed display. Dispatches to store and transitions
 * to playing state.
 *
 * Decomposed into submodules under src/ui/new-game/.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';
import { useScrollDrag } from './hooks/useScrollDrag';
import { CommanderPicker } from './new-game/CommanderPicker';
import { TAB_LABELS, type TabKey } from './new-game/controls';
import {
  generateName,
  generateSeed,
  PRESET_COLORS,
  PRESET_LABELS,
  PRESETS,
  type PresetKey,
  presetToDifficulty,
} from './new-game/presets';
import { SeedDisplay } from './new-game/SeedDisplay';
import { EconomyTab, EnemiesTab, MapTab, RulesTab } from './new-game/tabs';
import {
  type CustomGameSettings,
  customGameSettings,
  customMapSeed,
  DEFAULT_CUSTOM_SETTINGS,
  gameName,
  gameSeed,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
} from './store';

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
  const scrollRef = useScrollDrag<HTMLDivElement>();

  const handleUpdate = useCallback((patch: Partial<CustomGameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    setActivePreset(null);
  }, []);

  const handlePreset = useCallback((key: PresetKey) => {
    const preset = PRESETS[key];
    setSettings({ ...DEFAULT_CUSTOM_SETTINGS, ...preset });
    setActivePreset(key);
  }, []);

  useEffect(() => {
    if (activePreset === 'ultraNightmare') {
      setSettings((prev) => ({ ...prev, permadeath: true }));
    }
  }, [activePreset]);

  const handleShuffle = useCallback(() => {
    setName(generateName());
    setSeed(generateSeed());
    setShuffleAnim(true);
    setTimeout(() => setShuffleAnim(false), 400);
  }, []);

  const handleStartGame = useCallback(() => {
    const diffLevel = activePreset ? presetToDifficulty(activePreset) : 'normal';
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

  const tabKeys: TabKey[] = ['map', 'economy', 'enemies', 'rules', 'commander'];
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
      class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div class="absolute inset-0" style={{ background: 'rgba(12, 26, 31, 0.85)' }} />

      <div
        ref={scrollRef}
        class="relative rounded-lg shadow-2xl w-[480px] max-w-[95vw] modal-scroll-lg p-5 md:p-6 font-game text-sm z-10 parchment-panel"
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
          <SeedDisplay
            seed={seed}
            editingSeed={editingSeed}
            seedText={seedText}
            onStartEdit={() => {
              setSeedText(String(seed));
              setEditingSeed(true);
            }}
            onSeedText={setSeedText}
            onCommit={(v) => {
              setSeed(v);
              setEditingSeed(false);
            }}
            onCancel={() => setEditingSeed(false)}
          />
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
                  background: isActive ? 'rgba(64, 200, 208, 0.15)' : undefined,
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
          {activeTab === 'commander' && <CommanderPicker />}
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
                    minHeight: '44px',
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
