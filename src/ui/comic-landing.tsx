/**
 * ComicLanding — Full comic book landing page with three stacked panels.
 *
 * Panel 1: Otter (left) — "Ready for battle?" [PLAY] + optional [CONTINUE]
 * Panel 2: Croc (right) — "Power up, soldier" [UPGRADES] + optional [PRESTIGE]
 * Panel 3: Snake (left) — "Adjust your gear" [SETTINGS]
 *
 * SwampEcosystem canvas runs behind everything (rendered by app.tsx).
 * All 3 panels + title fit on one 1080p screen without scrolling.
 */

import { useCallback } from 'preact/hooks';
import { COLORS } from '@/ui/design-tokens';
import { ComicPanel } from './comic-panel';
import { MenuBackground } from './menu-background';
import {
  continueRequested,
  customGameSettings,
  customMapSeed,
  DEFAULT_CUSTOM_SETTINGS,
  gameName,
  gameSeed,
  hasSaveGame,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
  settingsOpen,
} from './store';
import { pearlScreenOpen, prestigeRank, upgradesScreenOpen } from './store-v3';

function generateName(): string {
  const adj = ['Murky', 'Still', 'Raging', 'Deep', 'Frozen', 'Verdant'];
  const nouns = ['Pond', 'Marsh', 'Swamp', 'Creek', 'Lagoon', 'Brook'];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

export function ComicLanding() {
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

  const handleContinue = useCallback(() => {
    continueRequested.value = true;
    menuState.value = 'playing';
  }, []);

  const handleUpgrades = useCallback(() => {
    upgradesScreenOpen.value = true;
  }, []);

  const handlePrestige = useCallback(() => {
    pearlScreenOpen.value = true;
  }, []);

  const handleSettings = useCallback(() => {
    settingsOpen.value = true;
  }, []);

  const showPrestige = prestigeRank.value > 0;

  return (
    <div
      id="intro-overlay"
      class="relative h-screen w-full flex flex-col items-center justify-center overflow-y-auto safe-area-pad"
    >
      <MenuBackground />

      {/* Title */}
      <div class="relative z-10 flex flex-col items-center mb-1 md:mb-2">
        <h1 class="font-heading mb-0 tracking-widest uppercase text-center">
          <span
            class="block text-2xl md:text-5xl leading-tight"
            style={{
              color: COLORS.mossGreen,
              textShadow:
                '4px 4px 0 #050505, -2px -2px 0 #050505, 2px -2px 0 #050505, -2px 2px 0 #050505, 0 0 20px rgba(90,107,58,0.4)',
            }}
          >
            Pond
          </span>
          <span
            class="block text-xl md:text-4xl leading-tight mt-0.5"
            style={{
              color: COLORS.grittyGold,
              textShadow:
                '4px 4px 0 #050505, -2px -2px 0 #050505, 2px -2px 0 #050505, -2px 2px 0 #050505, 0 0 20px rgba(197,160,89,0.3)',
            }}
          >
            Warfare
          </span>
        </h1>
      </div>

      {/* Comic panels — tight gap for single-screen fit */}
      <div class="relative z-10 flex flex-col items-center gap-2 md:gap-3 px-3 pb-2 w-full">
        {/* Panel 1: Otter — Play */}
        <ComicPanel
          character="otter"
          side="left"
          quote="Ready for battle?"
          buttonLabel="PLAY"
          onButtonClick={handlePlay}
          secondaryButton={
            hasSaveGame.value ? { label: 'CONTINUE', onClick: handleContinue } : undefined
          }
        />

        {/* Panel 2: Croc — Upgrades */}
        <ComicPanel
          character="croc"
          side="right"
          quote="Power up, soldier"
          buttonLabel="UPGRADES"
          onButtonClick={handleUpgrades}
          secondaryButton={
            showPrestige ? { label: 'PRESTIGE', onClick: handlePrestige } : undefined
          }
        />

        {/* Panel 3: Snake — Settings */}
        <ComicPanel
          character="snake"
          side="left"
          quote="Adjust your gear"
          buttonLabel="SETTINGS"
          onButtonClick={handleSettings}
        />
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
