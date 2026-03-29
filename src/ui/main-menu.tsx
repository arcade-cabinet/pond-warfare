/**
 * Main Menu - Immersive Pond Scene
 *
 * Fullscreen landing page that looks like you are gazing down at a moonlit
 * pond. Lily pads drift on the water, fireflies blink, cattails sway at the
 * edges, and ripples radiate outward. The title floats above the water with a
 * blurred reflection beneath it. Menu buttons are styled as wooden signs and
 * stone tablets rather than flat rectangles, and the rank badge hangs from a
 * reed like a medal. Version text sits on a piece of driftwood.
 *
 * Everything is pure CSS -- no image assets required.
 */

import { useEffect, useState } from 'preact/hooks';
import { getPlayerProfile } from '@/storage';
import { getRank, type RankInfo } from '@/systems/leaderboard';
import {
  achievementsOpen,
  campaignOpen,
  continueRequested,
  cosmeticsOpen,
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
      class="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 120% 100% at 50% 65%, #15302a 0%, #0e2220 30%, #0a1a1f 55%, #060e12 100%)',
      }}
    >
      {/* ---- Pond surface layers ---- */}

      {/* Water caustics (subtle light patterns) */}
      <div class="water-caustics" />

      {/* Water shimmer streaks */}
      <div class="water-shimmer" />

      {/* Water ripple rings (existing animation) */}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div class="water-ripple" style={{ width: '160px', height: '160px' }} />
        <div class="water-ripple" style={{ width: '160px', height: '160px' }} />
        <div class="water-ripple" style={{ width: '160px', height: '160px' }} />
      </div>

      {/* Vignette - darker edges like peering through reeds */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 45%, transparent 20%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      {/* ---- Lily pads scattered across the pond ---- */}
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Large lily pad - bottom left */}
        <div
          class="lily-pad"
          style={{ width: '90px', height: '80px', bottom: '12%', left: '8%', opacity: 0.7 }}
        >
          <div class="lily-flower" />
        </div>
        {/* Medium pad - top right */}
        <div
          class="lily-pad"
          style={{ width: '70px', height: '60px', top: '15%', right: '12%', opacity: 0.5 }}
        />
        {/* Small pad - bottom right */}
        <div
          class="lily-pad"
          style={{ width: '50px', height: '45px', bottom: '20%', right: '18%', opacity: 0.6 }}
        >
          <div class="lily-flower" />
        </div>
        {/* Tiny pad - left mid */}
        <div
          class="lily-pad"
          style={{ width: '40px', height: '35px', top: '55%', left: '5%', opacity: 0.4 }}
        />
        {/* Medium pad - top left */}
        <div
          class="lily-pad"
          style={{ width: '65px', height: '55px', top: '8%', left: '20%', opacity: 0.45 }}
        />
        {/* Small pad - far right mid */}
        <div
          class="lily-pad"
          style={{ width: '45px', height: '40px', top: '40%', right: '6%', opacity: 0.35 }}
        >
          <div class="lily-flower" />
        </div>
      </div>

      {/* ---- Cattails / reeds at edges ---- */}
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Left cattails */}
        <div class="cattail" style={{ bottom: '0', left: '3%' }}>
          <div class="cattail-head" />
          <div class="cattail-stem" style={{ height: '120px' }} />
        </div>
        <div class="cattail" style={{ bottom: '0', left: '6%' }}>
          <div class="cattail-head" />
          <div class="cattail-stem" style={{ height: '90px' }} />
        </div>
        {/* Right cattails */}
        <div class="cattail" style={{ bottom: '0', right: '4%' }}>
          <div class="cattail-head" />
          <div class="cattail-stem" style={{ height: '110px' }} />
        </div>
        <div class="cattail" style={{ bottom: '0', right: '7%' }}>
          <div class="cattail-head" />
          <div class="cattail-stem" style={{ height: '80px' }} />
        </div>
      </div>

      {/* ---- Fireflies ---- */}
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="firefly" style={{ top: '20%', left: '15%' }} />
        <div class="firefly" style={{ top: '35%', right: '20%' }} />
        <div class="firefly" style={{ top: '60%', left: '25%' }} />
        <div class="firefly" style={{ bottom: '25%', right: '30%' }} />
        <div class="firefly" style={{ top: '15%', right: '35%' }} />
        <div class="firefly" style={{ bottom: '35%', left: '10%' }} />
        <div class="firefly" style={{ top: '45%', left: '40%' }} />
        <div class="firefly" style={{ bottom: '15%', right: '15%' }} />
      </div>

      {/* ---- Moon glow (top-right ambient light) ---- */}
      <div
        class="absolute pointer-events-none"
        style={{
          top: '-5%',
          right: '10%',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(180, 200, 220, 0.06) 0%, transparent 60%)',
        }}
      />

      {/* ==== CONTENT ==== */}

      {/* ---- Title with reflection ---- */}
      <div class="relative z-10 flex flex-col items-center">
        {/* Main title */}
        <h1 class="mb-0 tracking-widest uppercase text-center">
          <span class="logo-pond block text-5xl md:text-8xl leading-tight">Pond</span>
          <span class="logo-warfare block text-4xl md:text-7xl leading-tight mt-1">Warfare</span>
        </h1>

        {/* Water reflection of the title */}
        <div class="title-reflection mt-0" aria-hidden="true">
          <span
            class="logo-pond block text-5xl md:text-8xl leading-tight"
            style={{ letterSpacing: '0.15em' }}
          >
            Pond
          </span>
          <span
            class="logo-warfare block text-4xl md:text-7xl leading-tight mt-1"
            style={{ letterSpacing: '0.25em' }}
          >
            Warfare
          </span>
        </div>
      </div>

      {/* ---- Tagline ---- */}
      <p
        class="font-heading text-sm md:text-lg mt-3 tracking-wider relative z-10 text-center"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Defend the Pond. Conquer the Wild.
      </p>

      {/* ---- Rank badge as a medal hanging from a reed ---- */}
      {rank && (
        <div class="relative z-10 mt-3">
          <div class="reed-hang">
            <div class="reed-medal" title={rank.label}>
              <span>{rank.icon}</span>
            </div>
          </div>
          <span
            class="font-heading font-bold text-[11px] tracking-wider uppercase block text-center mt-1"
            style={{ color: rank.color }}
          >
            {rank.label}
          </span>
        </div>
      )}

      {/* ---- Hero CTA: Shield-shaped NEW GAME button ---- */}
      <div class="relative z-10 mt-8 flex flex-col items-center">
        <button
          type="button"
          class="shield-btn font-heading font-bold text-lg md:text-xl tracking-widest flex flex-col items-center justify-center"
          style={{
            width: '180px',
            height: '200px',
            paddingTop: '20px',
          }}
          onClick={() => {
            menuState.value = 'newGame';
          }}
        >
          <span class="shield-btn-inner" />
          <span style={{ fontSize: '28px', lineHeight: '1', marginBottom: '8px' }}>&#x2694;</span>
          <span>NEW</span>
          <span>GAME</span>
        </button>
      </div>

      {/* ---- Primary action wooden sign buttons ---- */}
      <div
        class="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 relative z-10 items-center justify-center w-full px-4"
        style={{ maxWidth: '500px' }}
      >
        <button
          type="button"
          class="wood-sign-btn font-heading font-bold text-sm md:text-base tracking-wider"
          style={{
            minWidth: '180px',
            minHeight: '52px',
            padding: '12px 28px',
            color: 'var(--pw-text-primary)',
          }}
          onClick={() => {
            campaignOpen.value = true;
          }}
        >
          CAMPAIGN
        </button>

        <button
          type="button"
          class="wood-sign-btn font-heading font-bold text-sm md:text-base tracking-wider"
          disabled={!hasSaveGame.value}
          style={{
            minWidth: '180px',
            minHeight: '52px',
            padding: '12px 28px',
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
      </div>

      {/* ---- Secondary actions: stone tablets in a curved row ---- */}
      <div
        class="flex flex-wrap justify-center gap-3 mt-6 relative z-10 w-full px-4"
        style={{ maxWidth: '520px' }}
      >
        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{ minWidth: '110px', minHeight: '44px', padding: '8px 14px' }}
          onClick={() => {
            leaderboardOpen.value = true;
          }}
        >
          LEADERBOARD
        </button>

        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{ minWidth: '110px', minHeight: '44px', padding: '8px 14px' }}
          onClick={() => {
            achievementsOpen.value = true;
          }}
        >
          ACHIEVEMENTS
        </button>

        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{ minWidth: '110px', minHeight: '44px', padding: '8px 14px' }}
          onClick={() => {
            unlocksOpen.value = true;
          }}
        >
          UNLOCKS
        </button>

        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{ minWidth: '110px', minHeight: '44px', padding: '8px 14px' }}
          onClick={() => {
            cosmeticsOpen.value = true;
          }}
        >
          COSMETICS
        </button>
      </div>

      {/* ---- Settings (small, below secondary) ---- */}
      <div class="relative z-10 mt-4">
        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{
            minHeight: '40px',
            padding: '8px 20px',
            color: 'var(--pw-text-muted)',
            borderColor: 'rgba(42, 80, 96, 0.5)',
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
            cosmeticsOpen.value = true;
          }}
        >
          COSMETICS
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

      {/* ---- Controls hint ---- */}
      <p
        class="font-game text-xs mt-6 text-center px-4 hidden md:block relative z-10"
        style={{ color: 'var(--pw-text-muted)', opacity: 0.7 }}
      >
        Right-click to command &bull; WASD to scroll &bull; Ctrl+# to set groups
      </p>
      <p
        class="font-game text-xs mt-6 text-center px-4 md:hidden relative z-10"
        style={{ color: 'var(--pw-text-muted)', opacity: 0.7 }}
      >
        Long-press to command &bull; Two-finger pan &bull; Pinch to zoom
      </p>

      {/* ---- Version on driftwood ---- */}
      <div class="driftwood relative z-10 mt-4 mb-6 px-6 py-1">
        <span class="font-game text-[10px]" style={{ color: 'rgba(160, 140, 110, 0.7)' }}>
          v1.0 &middot; Defend the Pond
        </span>
      </div>
    </div>
  );
}
