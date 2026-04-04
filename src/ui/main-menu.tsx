/**
 * Main Menu — v3.0 Simplified (US19)
 *
 * One button to start playing. PLAY, UPGRADES, PRESTIGE (if available).
 * Lodge preview shows current wings, prestige glow.
 * SwampEcosystem canvas background provided by parent (app.tsx).
 * Design bible: vine-wrapped title, rts-btn buttons, design token colors.
 * In a match in under 2 seconds.
 */

import { useCallback } from 'preact/hooks';
import { screenClass } from '@/platform';
import { COLORS } from '@/ui/design-tokens';
import { MenuBackground } from './menu-background';
import { MenuButton } from './menu-button';
import { MenuSpriteShowcase } from './menu-sprites';
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
import {
  pearlScreenOpen,
  prestigeRank,
  totalClams,
  totalPearls,
  upgradesScreenOpen,
} from './store-v3';

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

/** SVG vine decoration wrapping the title area. */
function TitleVines({ compact }: { compact: boolean }) {
  if (compact) return null;
  return (
    <svg
      class="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 400 120"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Left vine curl */}
      <path
        d="M20,60 C30,20 60,10 80,40 C90,55 70,70 50,60"
        fill="none"
        stroke={COLORS.vineBase}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M20,60 C30,20 60,10 80,40 C90,55 70,70 50,60"
        fill="none"
        stroke={COLORS.vineHighlight}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Right vine curl */}
      <path
        d="M380,60 C370,20 340,10 320,40 C310,55 330,70 350,60"
        fill="none"
        stroke={COLORS.vineBase}
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M380,60 C370,20 340,10 320,40 C310,55 330,70 350,60"
        fill="none"
        stroke={COLORS.vineHighlight}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MainMenu() {
  const compact = screenClass.value !== 'large';
  const rank = prestigeRank.value;
  const showPrestige = rank > 0;

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

      {/* Title with vine decoration */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'mb-1' : 'mb-4'}`}>
        <TitleVines compact={compact} />
        <h1 class="font-heading mb-0 tracking-widest uppercase text-center">
          <span
            class={`block leading-tight ${compact ? 'text-3xl' : 'text-4xl md:text-7xl'}`}
            style={{
              color: COLORS.mossGreen,
              textShadow:
                '4px 4px 0 #050505, -2px -2px 0 #050505, 2px -2px 0 #050505, -2px 2px 0 #050505, 0 0 20px rgba(90,107,58,0.4)',
            }}
          >
            Pond
          </span>
          <span
            class={`block leading-tight mt-1 ${compact ? 'text-2xl' : 'text-3xl md:text-6xl'}`}
            style={{
              color: COLORS.grittyGold,
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
              class="font-heading block text-4xl md:text-7xl leading-tight"
              style={{
                letterSpacing: '0.15em',
                color: COLORS.mossGreen,
                textShadow: '4px 4px 0 #050505, -2px -2px 0 #050505',
              }}
            >
              Pond
            </span>
          </div>
        )}
      </div>

      {/* Animated sprite showcase */}
      <MenuSpriteShowcase compact={compact} />

      {/* Stats summary */}
      {(rank > 0 || totalClams.value > 0) && (
        <div class="relative z-10 flex gap-4 mb-2">
          {rank > 0 && (
            <span
              class="font-numbers text-xs px-2 py-0.5 rounded"
              style={{
                color: COLORS.grittyGold,
                background: 'rgba(197,160,89,0.15)',
              }}
            >
              Rank {rank}
            </span>
          )}
          {totalClams.value > 0 && (
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-clam)' }}>
              {totalClams.value} Clams
            </span>
          )}
          {totalPearls.value > 0 && (
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-pearl, #c4b5fd)' }}>
              {totalPearls.value} Pearls
            </span>
          )}
        </div>
      )}

      {/* Menu buttons — all use rts-btn via MenuButton */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Hero CTA */}
        <MenuButton
          label="PLAY"
          wide
          onClick={handlePlay}
          extraStyle={{ width: '220px', height: '56px', fontSize: '1.3rem' }}
        />

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

        <MenuButton
          label="Upgrades"
          wide
          onClick={() => {
            upgradesScreenOpen.value = true;
          }}
        />

        {showPrestige && (
          <MenuButton
            label="Prestige"
            onClick={() => {
              pearlScreenOpen.value = true;
            }}
          />
        )}

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
          <span class="font-game text-[10px]" style={{ color: COLORS.weatheredSteel }}>
            v3.0 &middot; Defend the Pond
          </span>
        </div>
      )}
    </div>
  );
}
