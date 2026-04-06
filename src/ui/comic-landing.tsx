/**
 * ComicLanding — Full comic book landing page with three stacked panels.
 *
 * Panel 1: Otter (left) — "Ready for battle?" [PLAY] (seamless: US7)
 * Panel 2: Croc (right) — "Power up, soldier" [UPGRADES] (always visible: commander + pearl loadout)
 * Panel 3: Snake (left) — "Adjust your gear" [SETTINGS]
 *
 * SwampEcosystem canvas runs behind everything (rendered by app.tsx).
 * All 3 panels + title fit on one 1080p screen without scrolling.
 *
 * Panels are staggered left/center/right in landscape for visual dynamism.
 * In portrait tablet mode, panels fill width without stagger.
 */

import { signal } from '@preact/signals';
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
import { multiplayerMenuOpen } from './store-multiplayer';
import { pearlScreenOpen } from './store-v3';

/** Which view of the landing page is showing. */
type LandingView = 'main' | 'play-mode';
const landingView = signal<LandingView>('main');

function generateName(): string {
  const adj = ['Murky', 'Still', 'Raging', 'Deep', 'Frozen', 'Verdant'];
  const nouns = ['Pond', 'Marsh', 'Swamp', 'Creek', 'Lagoon', 'Brook'];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

export function ComicLanding() {
  const startSinglePlayer = useCallback(() => {
    selectedDifficulty.value = 'normal';
    permadeathEnabled.value = false;
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
    gameName.value = generateName();
    const seed = generateSeed();
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
    landingView.value = 'main'; // reset for next time
  }, []);

  const handlePlay = useCallback(() => {
    landingView.value = 'play-mode';
  }, []);

  const handleMultiplayer = useCallback(() => {
    multiplayerMenuOpen.value = true;
    landingView.value = 'main'; // reset so back returns to main
  }, []);

  const handleBack = useCallback(() => {
    landingView.value = 'main';
  }, []);

  const handleUpgrades = useCallback(() => {
    pearlScreenOpen.value = true;
  }, []);

  const view = landingView.value;

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
          style={{
            textShadow:
              '3px 3px 0 #050505, -1px -1px 0 #050505, 1px -1px 0 #050505, -1px 1px 0 #050505, 0 0 15px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ color: COLORS.mossGreen }}>Pond</span>{' '}
          <span style={{ color: COLORS.grittyGold }}>Warfare</span>
        </h1>
      </div>

      <div class="relative z-10 flex flex-col items-center gap-2 md:gap-3 px-3 pb-2 w-full comic-panels-container">
        {view === 'main' && (
          <>
            <ComicPanel
              character="otter"
              side="left"
              quote="Ready for battle?"
              buttonLabel="PLAY"
              onButtonClick={handlePlay}
              stagger="left"
            />
            <ComicPanel
              character="croc"
              side="right"
              quote="Power up, soldier"
              buttonLabel="UPGRADES"
              onButtonClick={handleUpgrades}
              stagger="center"
            />
          </>
        )}

        {view === 'play-mode' && (
          <>
            <ComicPanel
              character="otter"
              side="left"
              quote="Just me and the pond..."
              buttonLabel="SINGLE PLAYER"
              onButtonClick={startSinglePlayer}
              stagger="left"
              secondaryButton={{ label: 'BACK', onClick: handleBack }}
            />
            <ComicPanel
              character="croc"
              side="right"
              quote="Lodge versus Lodge!"
              buttonLabel="MULTIPLAYER"
              onButtonClick={handleMultiplayer}
              stagger="center"
            />
          </>
        )}
      </div>

      <div class="relative z-10 pb-1">
        <span class="font-game text-[10px]" style={{ color: COLORS.weatheredSteel }}>
          v3.0 &middot; Defend the Pond
        </span>
      </div>
    </div>
  );
}
