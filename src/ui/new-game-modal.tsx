/**
 * New Game Modal
 *
 * Modal overlay for configuring a new game: game name (randomized),
 * difficulty selection (6 options in a 3x2 grid), permadeath toggle,
 * and seed display. Dispatches to store and transitions to playing state.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';
import {
  customMapSeed,
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

// ---- Difficulty definitions ----

interface DifficultyOption {
  key: DifficultyLevel;
  label: string;
  subtitle: string;
  tooltip: string;
  tint: string;
  borderColor: string;
  isExtreme?: boolean;
}

const DIFFICULTY_OPTIONS: DifficultyOption[] = [
  {
    key: 'easy',
    label: 'EASY',
    subtitle: 'Relaxed pace',
    tooltip: 'A gentle introduction to pond warfare',
    tint: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22c55e',
  },
  {
    key: 'normal',
    label: 'NORMAL',
    subtitle: 'Balanced challenge',
    tooltip: 'The way the otters intended',
    tint: 'rgba(64, 200, 208, 0.15)',
    borderColor: 'var(--pw-accent)',
  },
  {
    key: 'hard',
    label: 'HARD',
    subtitle: 'Aggressive AI',
    tooltip: "Predators won't give you breathing room",
    tint: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
  },
  {
    key: 'nightmare',
    label: 'NIGHTMARE',
    subtitle: 'Brutal AI',
    tooltip: 'Every mistake is punished severely',
    tint: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    isExtreme: true,
  },
  {
    key: 'ultraNightmare',
    label: 'ULTRA NIGHTMARE',
    subtitle: 'No Mercy',
    tooltip: 'Permadeath enforced. The ultimate test.',
    tint: 'rgba(220, 38, 38, 0.2)',
    borderColor: '#dc2626',
    isExtreme: true,
  },
];

// ---- Permadeath card (center of bottom row) ----

interface PermadeathCardProps {
  enabled: boolean;
  forced: boolean;
  onToggle: () => void;
}

function PermadeathCard({ enabled, forced, onToggle }: PermadeathCardProps) {
  return (
    <button
      type="button"
      class="stone-node rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-150"
      style={{
        minHeight: '100px',
        minWidth: '44px',
        padding: '8px 6px',
        background: enabled ? 'rgba(220, 38, 38, 0.15)' : 'rgba(20, 30, 35, 0.8)',
        borderColor: enabled ? '#dc2626' : 'var(--pw-border)',
        opacity: forced ? 0.7 : 1,
      }}
      onClick={() => {
        if (!forced) onToggle();
      }}
      disabled={forced}
      title={
        forced
          ? 'Permadeath is always on for Ultra Nightmare'
          : enabled
            ? '+50% resources, +25% XP, but death is permanent'
            : 'Enable for bonus rewards but permanent death'
      }
    >
      <span class="text-xl">{'\u2620'}</span>
      <span
        class="font-heading font-bold text-[10px] md:text-xs tracking-wider"
        style={{
          color: enabled ? '#dc2626' : 'var(--pw-text-muted)',
        }}
      >
        PERMADEATH
      </span>
      {/* Toggle switch */}
      <div
        class={`w-10 h-5 rounded-full relative mt-1 ${
          enabled ? 'toggle-track-active' : 'toggle-track'
        }`}
        style={{ minWidth: '40px' }}
      >
        <span
          class={`toggle-thumb absolute top-0.5 w-4 h-4 rounded-full transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </div>
      <span
        class="font-game text-[9px] mt-0.5 text-center leading-tight"
        style={{
          color: enabled ? 'var(--pw-enemy-light)' : 'var(--pw-text-muted)',
          opacity: enabled ? 1 : 0.6,
        }}
      >
        {enabled ? '+50% res, +25% XP' : 'Toggle'}
      </span>
    </button>
  );
}

// ---- Main component ----

export function NewGameModal() {
  const [name, setName] = useState(() => generateName());
  const [seed, setSeed] = useState(() => generateSeed());
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [permadeath, setPermadeath] = useState(false);
  const [editingSeed, setEditingSeed] = useState(false);
  const [seedText, setSeedText] = useState('');
  const [shuffleAnim, setShuffleAnim] = useState(false);

  // Ultra Nightmare forces permadeath
  useEffect(() => {
    if (difficulty === 'ultraNightmare') {
      setPermadeath(true);
    }
  }, [difficulty]);

  const handleShuffle = useCallback(() => {
    const newName = generateName();
    const newSeed = generateSeed();
    setName(newName);
    setSeed(newSeed);
    setShuffleAnim(true);
    setTimeout(() => setShuffleAnim(false), 400);
  }, []);

  const handleStartGame = useCallback(() => {
    // Write to store signals
    selectedDifficulty.value = difficulty;
    permadeathEnabled.value = permadeath;
    gameName.value = name;
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
  }, [difficulty, permadeath, name, seed]);

  const handleClose = useCallback(() => {
    menuState.value = 'main';
  }, []);

  // Build grid: top row = easy/normal/hard, bottom row = nightmare/permadeath/ultraNightmare
  const topRow = DIFFICULTY_OPTIONS.filter(
    (o) => o.key === 'easy' || o.key === 'normal' || o.key === 'hard',
  );
  // biome-ignore lint/style/noNonNullAssertion: keys are guaranteed in DIFFICULTY_OPTIONS
  const nightmare = DIFFICULTY_OPTIONS.find((o) => o.key === 'nightmare')!;
  // biome-ignore lint/style/noNonNullAssertion: keys are guaranteed in DIFFICULTY_OPTIONS
  const ultraNightmare = DIFFICULTY_OPTIONS.find((o) => o.key === 'ultraNightmare')!;

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
        class="relative rounded-lg shadow-2xl w-[420px] max-w-[95vw] max-h-[95vh] overflow-y-auto overscroll-contain p-5 md:p-6 font-game text-sm z-10 parchment-panel"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-5">
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

        {/* Game Name */}
        <div class="mb-5">
          <div class="section-header mb-2">Game Name</div>
          <div class="flex items-center gap-2">
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
        </div>

        {/* Difficulty Grid */}
        <div class="mb-5">
          <div class="section-header mb-2">Difficulty</div>

          {/* Top row: Easy / Normal / Hard */}
          <div class="grid grid-cols-3 gap-2 mb-2">
            {topRow.map((opt) => (
              <DifficultyCard
                key={opt.key}
                opt={opt}
                selected={difficulty === opt.key}
                hasPermadeath={permadeath}
                onSelect={() => setDifficulty(opt.key)}
              />
            ))}
          </div>

          {/* Bottom row: Nightmare / Permadeath / Ultra Nightmare */}
          <div class="grid grid-cols-3 gap-2">
            <DifficultyCard
              key={nightmare.key}
              opt={nightmare}
              selected={difficulty === nightmare.key}
              hasPermadeath={permadeath}
              onSelect={() => setDifficulty(nightmare.key)}
            />
            <PermadeathCard
              enabled={permadeath}
              forced={difficulty === 'ultraNightmare'}
              onToggle={() => setPermadeath(!permadeath)}
            />
            <DifficultyCard
              key={ultraNightmare.key}
              opt={ultraNightmare}
              selected={difficulty === ultraNightmare.key}
              hasPermadeath={true}
              onSelect={() => setDifficulty(ultraNightmare.key)}
            />
          </div>
        </div>

        {/* Seed display */}
        <div class="mb-6 flex items-center gap-2">
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

// ---- Difficulty card sub-component ----

interface DifficultyCardProps {
  opt: DifficultyOption;
  selected: boolean;
  hasPermadeath: boolean;
  onSelect: () => void;
}

function DifficultyCard({ opt, selected, hasPermadeath, onSelect }: DifficultyCardProps) {
  return (
    <button
      type="button"
      class="stone-node rounded-lg flex flex-col items-center justify-center gap-1 cursor-pointer transition-all duration-150 relative"
      style={{
        minHeight: '100px',
        minWidth: '44px',
        padding: '8px 6px',
        background: selected ? opt.tint : 'rgba(20, 30, 35, 0.8)',
        borderColor: selected ? opt.borderColor : 'var(--pw-border)',
        boxShadow: selected
          ? `0 0 12px ${opt.borderColor}40, inset 0 1px 0 rgba(255,255,255,0.05)`
          : 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      title={opt.tooltip}
    >
      {/* Skull badge for permadeath on selected card */}
      {selected && hasPermadeath && (
        <span
          class="absolute top-1 right-1 text-sm"
          style={{ filter: 'drop-shadow(0 0 4px rgba(220, 38, 38, 0.6))' }}
          title="Permadeath active"
        >
          {'\u2620'}
        </span>
      )}

      <span
        class="font-heading font-bold text-[10px] md:text-xs tracking-wider text-center"
        style={{
          color: selected ? opt.borderColor : 'var(--pw-text-muted)',
        }}
      >
        {opt.label}
      </span>
      <span
        class="font-game text-[10px] md:text-xs text-center leading-tight"
        style={{
          color: selected ? 'var(--pw-text-secondary)' : 'var(--pw-text-muted)',
          opacity: selected ? 1 : 0.6,
        }}
      >
        {opt.subtitle}
      </span>
    </button>
  );
}
