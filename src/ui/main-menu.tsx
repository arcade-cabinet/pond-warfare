/** Main Menu — Gritty swamp war room with dark atmosphere. */

import { useCallback, useRef } from 'preact/hooks';
import { screenClass } from '@/platform';
import { MenuBackground } from './menu-background';
import { MenuButton } from './menu-button';
import { MenuPlayerStatus } from './menu-player-status';
import { generateName, generateSeed } from './new-game/presets';
import {
  achievementsOpen,
  campaignOpen,
  continueRequested,
  cosmeticsOpen,
  customGameSettings,
  customMapSeed,
  DEFAULT_CUSTOM_SETTINGS,
  gameName,
  gameSeed,
  hasSaveGame,
  leaderboardOpen,
  matchHistoryOpen,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
  settingsOpen,
  unlocksOpen,
} from './store';
import { puzzleSelectOpen, survivalSelectOpen } from './store-gameplay';
import { multiplayerMenuOpen } from './store-multiplayer';
import { NextUnlockHint, UnlockProgress } from './unlock-progress';

export function MainMenu() {
  const compact = screenClass.value !== 'large';
  const containerRef = useRef<HTMLDivElement>(null);

  const handleQuickPlay = useCallback(() => {
    selectedDifficulty.value = 'normal';
    permadeathEnabled.value = false;
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
    gameName.value = generateName();
    const seed = generateSeed();
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
  }, []);

  const set = (sig: { value: boolean }) => () => {
    sig.value = true;
  };

  return (
    <div
      ref={containerRef}
      id="intro-overlay"
      class={`relative h-screen w-full flex flex-col items-center safe-area-pad ${compact ? 'justify-start pt-2 overflow-y-auto' : 'justify-center overflow-hidden'}`}
    >
      <MenuBackground />

      {/* Title — moss green + gritty gold, heavy black outline */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'mb-1' : 'mb-4'}`}>
        <h1 class="mb-0 tracking-widest uppercase text-center">
          <span
            class={`logo-pond block leading-tight ${compact ? 'text-3xl' : 'text-4xl md:text-7xl'}`}
            style={{
              color: 'var(--pw-moss-bright)',
              textShadow:
                '4px 4px 0 #050505, -2px -2px 0 #050505, 2px -2px 0 #050505, -2px 2px 0 #050505, 0 0 20px rgba(90,107,58,0.4)',
            }}
          >
            Pond
          </span>
          <span
            class={`logo-warfare block leading-tight mt-1 ${compact ? 'text-2xl' : 'text-3xl md:text-6xl'}`}
            style={{
              color: 'var(--pw-gold)',
              textShadow:
                '4px 4px 0 #050505, -2px -2px 0 #050505, 2px -2px 0 #050505, -2px 2px 0 #050505, 0 0 20px rgba(197,160,89,0.3)',
            }}
          >
            Warfare
          </span>
        </h1>
        {!compact && (
          <div
            class="title-reflection mt-0"
            aria-hidden="true"
            style={{ maxHeight: '50px', overflow: 'hidden' }}
          >
            <span
              class="logo-pond block text-4xl md:text-7xl leading-tight"
              style={{
                letterSpacing: '0.15em',
                color: 'var(--pw-moss-bright)',
                textShadow: '4px 4px 0 #050505, -2px -2px 0 #050505',
              }}
            >
              Pond
            </span>
          </div>
        )}
        <MenuPlayerStatus compact={compact} />
        <NextUnlockHint />
      </div>

      {/* Unlock progress */}
      <div class="relative z-10 flex justify-center mb-2">
        <UnlockProgress />
      </div>

      {/* Menu buttons */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        <MenuButton label="Quick Play" wide onClick={handleQuickPlay} />
        <div class={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <MenuButton
            label="New Game"
            wide
            onClick={() => {
              menuState.value = 'newGame';
            }}
          />
          <MenuButton
            label="Continue"
            wide
            disabled={!hasSaveGame.value}
            onClick={() => {
              if (hasSaveGame.value) {
                continueRequested.value = true;
                menuState.value = 'playing';
              }
            }}
          />
        </div>
        <div class={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <MenuButton label="Puzzles" onClick={set(puzzleSelectOpen)} />
          <MenuButton label="Survival" onClick={set(survivalSelectOpen)} />
          <MenuButton label="Co-op" onClick={set(multiplayerMenuOpen)} />
          <MenuButton label="Campaign" onClick={set(campaignOpen)} />
        </div>
        <div class={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <MenuButton label="Settings" onClick={set(settingsOpen)} />
          <MenuButton label="Leaderboard" onClick={set(leaderboardOpen)} />
          <MenuButton label="Achievements" onClick={set(achievementsOpen)} />
        </div>
        <div class={`flex items-center ${compact ? 'gap-1' : 'gap-2'} flex-wrap justify-center`}>
          <MenuButton label="Unlocks" onClick={set(unlocksOpen)} />
          <MenuButton label="Cosmetics" onClick={set(cosmeticsOpen)} />
          <MenuButton label="History" onClick={set(matchHistoryOpen)} />
        </div>
      </div>

      {/* Version */}
      {!compact && (
        <div class="relative z-10 mt-3 mb-4">
          <span class="font-game text-[10px]" style={{ color: 'var(--pw-text-muted)' }}>
            v1.0 &middot; Defend the Pond
          </span>
        </div>
      )}
    </div>
  );
}
