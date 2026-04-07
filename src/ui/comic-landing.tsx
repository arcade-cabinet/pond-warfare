/**
 * ComicLanding — Full comic book landing page with three stacked panels.
 *
 * Main view:
 * Panel 1: Otter (left) — "Ready for battle?" [PLAY] [+ CONTINUE if save exists]
 * Panel 2: Croc (right) — "Power up, soldier" [UPGRADES] [+ PRESTIGE if rank > 0]
 * Panel 3: Snake (left) — "Adjust your gear" [SETTINGS]
 *
 * Play view:
 * Panel 1: Otter (left) — "Just me and the pond..." [SINGLE PLAYER] [+ BACK]
 * Panel 2: Croc (right) — "Lodge versus Lodge!" [MULTIPLAYER]
 * Panel 3: Snake (left) — "Adjust your gear" [SETTINGS]
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
  hasSaveGame,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
  settingsOpen,
  continueRequested,
} from './store';
import { multiplayerMenuOpen } from './store-multiplayer';
import { pearlScreenOpen, prestigeRank, upgradesScreenOpen } from './store-v3';

/** Which view of the landing page is showing. */
type LandingView = 'main' | 'play-mode';
const landingView = signal<LandingView>('main');

export function resetComicLandingState() {
  landingView.value = 'main';
}

function generateName(): string {
  const adj = ['Murky', 'Still', 'Raging', 'Deep', 'Frozen', 'Verdant'];
  const nouns = ['Pond', 'Marsh', 'Swamp', 'Creek', 'Lagoon', 'Brook'];
  return `${adj[Math.floor(Math.random() * adj.length)]} ${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

export function ComicLanding() {
  const closeMenuOverlays = useCallback(() => {
    settingsOpen.value = false;
    upgradesScreenOpen.value = false;
    pearlScreenOpen.value = false;
    multiplayerMenuOpen.value = false;
  }, []);

  const startSinglePlayer = useCallback(() => {
    closeMenuOverlays();
    continueRequested.value = false;
    selectedDifficulty.value = 'normal';
    permadeathEnabled.value = false;
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
    gameName.value = generateName();
    const seed = generateSeed();
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
    resetComicLandingState();
  }, [closeMenuOverlays]);

  const handleContinue = useCallback(() => {
    closeMenuOverlays();
    continueRequested.value = true;
    menuState.value = 'playing';
    resetComicLandingState();
  }, [closeMenuOverlays]);

  const handlePlay = useCallback(() => {
    landingView.value = 'play-mode';
  }, []);

  const handleMultiplayer = useCallback(() => {
    settingsOpen.value = false;
    upgradesScreenOpen.value = false;
    pearlScreenOpen.value = false;
    multiplayerMenuOpen.value = true;
    resetComicLandingState();
  }, []);

  const handleBack = useCallback(() => {
    resetComicLandingState();
  }, []);

  const handleUpgrades = useCallback(() => {
    settingsOpen.value = false;
    pearlScreenOpen.value = false;
    upgradesScreenOpen.value = true;
  }, []);

  const handlePrestige = useCallback(() => {
    settingsOpen.value = false;
    upgradesScreenOpen.value = false;
    pearlScreenOpen.value = true;
  }, []);

  const handleSettings = useCallback(() => {
    settingsOpen.value = true;
  }, []);

  const view = landingView.value;
  const continueButton = hasSaveGame.value
    ? { label: 'CONTINUE', onClick: handleContinue }
    : undefined;
  const prestigeButton =
    prestigeRank.value > 0 ? { label: 'PRESTIGE', onClick: handlePrestige } : undefined;

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
              secondaryButton={continueButton}
              stagger="left"
            />
            <ComicPanel
              character="croc"
              side="right"
              quote="Power up, soldier"
              buttonLabel="UPGRADES"
              onButtonClick={handleUpgrades}
              secondaryButton={prestigeButton}
              stagger="center"
            />
            <ComicPanel
              character="snake"
              side="left"
              quote="Adjust your gear"
              buttonLabel="SETTINGS"
              onButtonClick={handleSettings}
              stagger="right"
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
            <ComicPanel
              character="snake"
              side="left"
              quote="Adjust your gear"
              buttonLabel="SETTINGS"
              onButtonClick={handleSettings}
              stagger="right"
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
