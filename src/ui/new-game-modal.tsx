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

import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';
import { Frame9Slice } from './components/frame';
import { type AccordionSection, PondAccordion } from './components/PondAccordion';
import { useScrollDrag } from './hooks/useScrollDrag';
import { CommanderPicker } from './new-game/CommanderPicker';
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
  showSplashVideo,
} from './store';

export function NewGameModal() {
  const [name, setName] = useState(() => generateName());
  const [seed, setSeed] = useState(() => generateSeed());
  const [settings, setSettings] = useState<CustomGameSettings>(() => ({
    ...DEFAULT_CUSTOM_SETTINGS,
  }));
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
    showSplashVideo.value = true;
  }, [settings, activePreset, name, seed]);

  const handleClose = useCallback(() => {
    menuState.value = 'main';
  }, []);

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const accordionSections: AccordionSection[] = useMemo(
    () => [
      { key: 'commander', title: 'Commander', defaultOpen: true },
      {
        key: 'map',
        title: 'Map Settings',
        summary: `${cap(settings.scenario)}, ${cap(settings.resourceDensity)} density`,
      },
      {
        key: 'economy',
        title: 'Economy',
        summary: `${Math.round(settings.startingResourcesMult * 100)}% starting resources`,
      },
      {
        key: 'enemies',
        title: 'Enemies',
        summary: `${settings.enemyNests} nests, ${cap(settings.enemyEconomy)}`,
      },
      {
        key: 'rules',
        title: 'Rules',
        summary: settings.permadeath ? 'Permadeath ON' : 'Normal difficulty',
      },
    ],
    [settings],
  );

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
      <div class="absolute inset-0" style={{ background: 'var(--pw-overlay-dark)' }} />

      <div
        ref={scrollRef}
        class="relative w-[540px] max-w-[95vw] modal-scroll-lg font-game text-sm z-10"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <Frame9Slice title="NEW GAME">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={handleClose}
              title="Close"
            >
              {'\u2715'}
            </button>

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
                    background: 'var(--pw-surface-card)',
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

            {/* Accordion sections */}
            <div class="mb-4">
              <PondAccordion sections={accordionSections}>
                <CommanderPicker />
                <MapTab settings={settings} onUpdate={handleUpdate} />
                <EconomyTab settings={settings} onUpdate={handleUpdate} />
                <EnemiesTab settings={settings} onUpdate={handleUpdate} />
                <RulesTab settings={settings} onUpdate={handleUpdate} />
              </PondAccordion>
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
                        background: isActive ? `${color}25` : 'var(--pw-surface-card)',
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
        </Frame9Slice>
      </div>
    </div>
  );
}
