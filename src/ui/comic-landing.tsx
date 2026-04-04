/**
 * ComicLanding — Full comic book landing page with three stacked panels.
 *
 * Panel 1: Otter (left) — "Ready for battle?" [PLAY] (seamless: US7)
 * Panel 2: Croc (right) — "Power up, soldier" [UPGRADES] (Pearl loadout, US9: hidden until rank/pearls > 0)
 * Panel 3: Snake (left) — "Adjust your gear" [SETTINGS]
 *
 * SwampEcosystem canvas runs behind everything (rendered by app.tsx).
 * All 3 panels + title fit on one 1080p screen without scrolling.
 *
 * Panels are staggered left/center/right in landscape for visual dynamism.
 * In portrait tablet mode, panels fill width without stagger.
 */

import { useCallback } from 'preact/hooks';
import { COLORS } from '@/ui/design-tokens';
import { ComicPanel } from './comic-panel';
import { MenuBackground } from './menu-background';
import {
  customGameSettings,
  customMapSeed,
  DEFAULT_CUSTOM_SETTINGS,
  gameName,
  gameSeed,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
} from './store';
import { pearlScreenOpen, prestigeRank, totalPearls } from './store-v3';

function generateName(): string {
  const adj = ['Murky', 'Still', 'Raging', 'Deep', 'Frozen', 'Verdant'];
  const nouns = ['Pond', 'Marsh', 'Swamp', 'Creek', 'Lagoon', 'Brook'];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

export function ComicLanding() {
  // US7: Seamless PLAY — no modal, no "Continue vs New Game" choice.
  // If an active run exists (progression > 0), start at that level with upgrades.
  // Otherwise start fresh. In both cases, we start a NEW match (not mid-match resume).
  // Run state (progressionLevel, totalClams, etc.) is already hydrated into store-v3
  // signals at app startup via hydrateV3StoreFromDb(). Game.init() reads those signals
  // to apply upgrade effects and set difficulty scaling.
  const handlePlay = useCallback(() => {
    selectedDifficulty.value = 'normal';
    permadeathEnabled.value = false;
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
    gameName.value = generateName();
    const seed = generateSeed();
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
  }, []);

  const handleUpgrades = useCallback(() => {
    pearlScreenOpen.value = true;
  }, []);


  // US9: UPGRADES only visible when rank > 0 OR pearls > 0
  const showUpgrades = prestigeRank.value > 0 || totalPearls.value > 0;

  return (
    <div
      id="intro-overlay"
      class="relative h-screen w-full flex flex-col items-center justify-center overflow-y-auto safe-area-pad"
    >
      <MenuBackground />

      {/* Title */}
      <div class="relative z-10 flex flex-col items-center mb-1 md:mb-2">
        <h1
          class="font-heading mb-0 tracking-widest uppercase text-center text-2xl md:text-5xl leading-tight"
          style={{ textShadow: '3px 3px 0 #050505, -1px -1px 0 #050505, 1px -1px 0 #050505, -1px 1px 0 #050505, 0 0 15px rgba(0,0,0,0.6)' }}
        >
          <span style={{ color: COLORS.mossGreen }}>Pond</span>{' '}
          <span style={{ color: COLORS.grittyGold }}>Warfare</span>
        </h1>
      </div>

      {/* Comic panels — staggered for visual dynamism in landscape */}
      <div class="relative z-10 flex flex-col items-center gap-2 md:gap-3 px-3 pb-2 w-full comic-panels-container">
        {/* Panel 1: Otter — Play (stagger left). US7: single seamless button. */}
        <ComicPanel
          character="otter"
          side="left"
          quote="Ready for battle?"
          buttonLabel="PLAY"
          onButtonClick={handlePlay}
          stagger="left"
        />

        {/* Panel 2: Croc — Upgrades / Pearl loadout (stagger center). US9: only when rank/pearls > 0. */}
        {showUpgrades && (
          <ComicPanel
            character="croc"
            side="right"
            quote="Power up, soldier"
            buttonLabel="UPGRADES"
            onButtonClick={handleUpgrades}
            stagger="center"
          />
        )}

      </div>

      {/* Version */}
      <div class="relative z-10 pb-1">
        <span class="font-game text-[10px]" style={{ color: COLORS.weatheredSteel }}>
          v3.0 &middot; Defend the Pond
        </span>
      </div>
    </div>
  );
}
