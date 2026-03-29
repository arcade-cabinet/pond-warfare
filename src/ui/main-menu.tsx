/**
 * Main Menu
 *
 * Landing screen with New Game / Continue / Settings buttons.
 * Displays the POND WARFARE logo with water ripple animation
 * over a dark pond gradient background.
 */

import { useEffect, useState } from 'preact/hooks';
import { getRank, type RankInfo } from '@/systems/leaderboard';
import { getPlayerProfile } from '@/storage';
import {
  achievementsOpen,
  continueRequested,
  hasSaveGame,
  leaderboardOpen,
  menuState,
  settingsOpen,
  unlocksOpen,
} from './store';

export function MainMenu() {
  const [rank, setRank] = useState<RankInfo | null>(null);

  useEffect(() => {
    getPlayerProfile()
      .then((p) => setRank(getRank(p.total_wins)))
      .catch(() => {});
  }, []);

  return (
    <div
      id="intro-overlay"
      class="absolute inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at 50% 60%, #132830 0%, #0c1a1f 50%, #060e12 100%)',
      }}
    >
      {/* Water ripple rings behind the title */}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div class="water-ripple" />
        <div class="water-ripple" />
        <div class="water-ripple" />
      </div>

      {/* Subtle vignette overlay */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      {/* Logo */}
      <h1 class="mb-2 tracking-widest uppercase text-center relative z-10">
        <span class="logo-pond block text-4xl md:text-7xl leading-tight">Pond</span>
        <span class="logo-warfare block text-3xl md:text-6xl leading-tight mt-2">Warfare</span>
      </h1>

      {/* Tagline */}
      <p
        class="font-heading text-sm md:text-lg mt-4 tracking-wider relative z-10"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Defend the Pond. Conquer the Wild.
      </p>

      {/* Rank badge */}
      {rank && (
        <div
          class="flex items-center gap-2 mt-3 relative z-10"
          style={{ color: rank.color }}
        >
          <span class="text-lg">{rank.icon}</span>
          <span class="font-heading font-bold text-sm tracking-wider uppercase">
            {rank.label}
          </span>
        </div>
      )}

      {/* Menu buttons */}
      <div class="flex flex-col gap-4 mt-10 relative z-10 items-center">
        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider"
          style={{
            minWidth: '220px',
            minHeight: '60px',
            padding: '14px 32px',
            color: 'var(--pw-accent)',
          }}
          onClick={() => {
            menuState.value = 'newGame';
          }}
        >
          NEW GAME
        </button>

        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider"
          disabled={!hasSaveGame.value}
          style={{
            minWidth: '220px',
            minHeight: '60px',
            padding: '14px 32px',
            color: hasSaveGame.value ? 'var(--pw-text-primary)' : 'var(--pw-text-muted)',
          }}
          onClick={() => {
            if (hasSaveGame.value) {
              continueRequested.value = true;
              menuState.value = 'playing';
            }
          }}
        >
          CONTINUE
        </button>

        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider"
          style={{
            minWidth: '220px',
            minHeight: '60px',
            padding: '14px 32px',
            color: 'var(--pw-text-secondary)',
          }}
          onClick={() => {
            leaderboardOpen.value = true;
          }}
        >
          LEADERBOARD
        </button>

        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider"
          style={{
            minWidth: '220px',
            minHeight: '60px',
            padding: '14px 32px',
            color: 'var(--pw-text-secondary)',
          }}
          onClick={() => {
            achievementsOpen.value = true;
          }}
        >
          ACHIEVEMENTS
        </button>

        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider"
          style={{
            minWidth: '220px',
            minHeight: '60px',
            padding: '14px 32px',
            color: 'var(--pw-text-secondary)',
          }}
          onClick={() => {
            unlocksOpen.value = true;
          }}
        >
          UNLOCKS
        </button>

        <button
          type="button"
          class="action-btn font-heading font-bold text-base md:text-lg tracking-wider"
          style={{
            minWidth: '220px',
            minHeight: '60px',
            padding: '14px 32px',
            color: 'var(--pw-text-secondary)',
          }}
          onClick={() => {
            settingsOpen.value = true;
          }}
        >
          SETTINGS
        </button>
      </div>

      {/* Controls hint */}
      <p
        class="font-game text-xs mt-8 text-center px-4 hidden md:block relative z-10"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Right-click to command &bull; WASD to scroll &bull; Ctrl+# to set groups
      </p>
      <p
        class="font-game text-xs mt-8 text-center px-4 md:hidden relative z-10"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Long-press to command &bull; Two-finger pan &bull; Pinch to zoom
      </p>
    </div>
  );
}
