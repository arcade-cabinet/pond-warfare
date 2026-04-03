/** Main Menu — Simplified v3.0: PLAY button + settings. */

import { useCallback } from 'preact/hooks';
import { screenClass } from '@/platform';
import { MenuBackground } from './menu-background';
import { MenuButton } from './menu-button';
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

/** Generate a random game name. */
function generateName(): string {
  const adj = ['Murky', 'Still', 'Raging', 'Deep', 'Frozen', 'Verdant'];
  const nouns = ['Pond', 'Marsh', 'Swamp', 'Creek', 'Lagoon', 'Brook'];
  const a = adj[Math.floor(Math.random() * adj.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  return `${a} ${n}`;
}

/** Generate a random seed. */
function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

export function MainMenu() {
  const compact = screenClass.value !== 'large';

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

  return (
    <div
      id="intro-overlay"
      class={`relative h-screen w-full flex flex-col items-center safe-area-pad ${compact ? 'justify-start pt-2 overflow-y-auto' : 'justify-center overflow-hidden'}`}
    >
      <MenuBackground />

      {/* Title */}
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
      </div>

      {/* Menu buttons */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Hero CTA — PLAY */}
        <MenuButton
          label="PLAY"
          wide
          onClick={handlePlay}
          extraStyle={{ width: '220px', height: '56px', fontSize: '1.3rem' }}
        />

        {/* Continue — only if save exists */}
        {hasSaveGame.value && (
          <MenuButton
            label="Continue"
            wide
            onClick={() => {
              continueRequested.value = true;
              menuState.value = 'playing';
            }}
          />
        )}

        {/* Settings */}
        <MenuButton
          label="Settings"
          onClick={() => {
            settingsOpen.value = true;
          }}
        />
      </div>

      {/* Version */}
      {!compact && (
        <div class="relative z-10 mt-3 mb-4">
          <span class="font-game text-[10px]" style={{ color: 'var(--pw-text-muted)' }}>
            v3.0 &middot; Defend the Pond
          </span>
        </div>
      )}
    </div>
  );
}
