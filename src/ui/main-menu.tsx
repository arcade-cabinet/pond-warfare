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
import { isMobile, isTablet } from '@/platform';
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
  const compact = isMobile.value || isTablet.value;

  useEffect(() => {
    getPlayerProfile()
      .then((p) => setRank(getRank(p.total_wins)))
      .catch(() => {});
  }, []);

  return (
    <div
      id="intro-overlay"
      class={`relative h-screen w-full flex flex-col items-center ${compact ? 'justify-start pt-4 overflow-y-auto' : 'justify-center overflow-hidden'} safe-area-pad`}
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

      {/* ---- Lily pads scattered across the pond (hidden on compact) ---- */}
      <div
        class={`absolute inset-0 pointer-events-none overflow-hidden ${compact ? 'hidden' : ''}`}
      >
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

      {/* ---- Cattails / reeds at edges (hidden on compact) ---- */}
      <div
        class={`absolute inset-0 pointer-events-none overflow-hidden ${compact ? 'hidden' : ''}`}
      >
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
          <span
            class={`logo-pond block leading-tight ${compact ? 'text-3xl' : 'text-4xl md:text-7xl'}`}
          >
            Pond
          </span>
          <span
            class={`logo-warfare block leading-tight mt-1 ${compact ? 'text-2xl' : 'text-3xl md:text-6xl'}`}
          >
            Warfare
          </span>
        </h1>

        {/* Water reflection of the title (hidden on compact) */}
        {!compact && (
          <div
            class="title-reflection mt-0"
            aria-hidden="true"
            style={{ maxHeight: '60px', overflow: 'hidden' }}
          >
            <span
              class="logo-pond block text-4xl md:text-7xl leading-tight"
              style={{ letterSpacing: '0.15em' }}
            >
              Pond
            </span>
          </div>
        )}
      </div>

      {/* ---- Tagline + Rank badge inline ---- */}
      <p
        class="font-heading text-xs md:text-base mt-2 tracking-wider relative z-10 text-center"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Defend the Pond. Conquer the Wild.
        {rank && (
          <span class="ml-2" title={rank.label} style={{ color: rank.color }}>
            {rank.icon} {rank.label}
          </span>
        )}
      </p>

      {/* ---- Hero CTA: Shield-shaped NEW GAME button ---- */}
      <div class={`relative z-10 ${compact ? 'mt-2' : 'mt-4'} flex flex-col items-center`}>
        <button
          type="button"
          class={`shield-btn font-heading font-bold tracking-widest flex flex-col items-center justify-center ${compact ? 'text-sm' : 'text-base md:text-xl'}`}
          style={{
            width: compact ? '110px' : '140px',
            height: compact ? '120px' : '156px',
            paddingTop: compact ? '12px' : '16px',
          }}
          onClick={() => {
            menuState.value = 'newGame';
          }}
        >
          <span class="shield-btn-inner" />
          <span
            style={{
              fontSize: compact ? '18px' : '22px',
              lineHeight: '1',
              marginBottom: compact ? '4px' : '6px',
            }}
          >
            &#x2694;
          </span>
          <span>NEW</span>
          <span>GAME</span>
        </button>
      </div>

      {/* ---- Primary action wooden sign buttons ---- */}
      <div
        class={`flex flex-row gap-2 ${compact ? 'mt-2' : 'mt-4'} relative z-10 items-center justify-center w-full px-4`}
        style={{ maxWidth: '500px' }}
      >
        <button
          type="button"
          class={`wood-sign-btn font-heading font-bold tracking-wider ${compact ? 'text-xs' : 'text-sm md:text-base'}`}
          style={{
            minWidth: compact ? '130px' : '180px',
            minHeight: compact ? '40px' : '52px',
            padding: compact ? '8px 20px' : '12px 28px',
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
          class={`wood-sign-btn font-heading font-bold tracking-wider ${compact ? 'text-xs' : 'text-sm md:text-base'}`}
          disabled={!hasSaveGame.value}
          style={{
            minWidth: compact ? '130px' : '180px',
            minHeight: compact ? '40px' : '52px',
            padding: compact ? '8px 20px' : '12px 28px',
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
        class={`flex flex-wrap justify-center gap-2 ${compact ? 'mt-2' : 'mt-4'} relative z-10 w-full px-4`}
        style={{ maxWidth: '560px' }}
      >
        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{
            minWidth: compact ? '80px' : '110px',
            minHeight: compact ? '34px' : '44px',
            padding: compact ? '5px 10px' : '8px 14px',
          }}
          onClick={() => {
            leaderboardOpen.value = true;
          }}
        >
          LEADERBOARD
        </button>

        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{
            minWidth: compact ? '80px' : '110px',
            minHeight: compact ? '34px' : '44px',
            padding: compact ? '5px 10px' : '8px 14px',
          }}
          onClick={() => {
            achievementsOpen.value = true;
          }}
        >
          ACHIEVEMENTS
        </button>

        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{
            minWidth: compact ? '80px' : '110px',
            minHeight: compact ? '34px' : '44px',
            padding: compact ? '5px 10px' : '8px 14px',
          }}
          onClick={() => {
            unlocksOpen.value = true;
          }}
        >
          UNLOCKS
        </button>

        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{
            minWidth: compact ? '80px' : '110px',
            minHeight: compact ? '34px' : '44px',
            padding: compact ? '5px 10px' : '8px 14px',
          }}
          onClick={() => {
            cosmeticsOpen.value = true;
          }}
        >
          COSMETICS
        </button>
      </div>

      {/* ---- Settings (small, below secondary) ---- */}
      <div class={`relative z-10 ${compact ? 'mt-1' : 'mt-3'}`}>
        <button
          type="button"
          class="stone-tablet-btn font-heading font-bold text-xs tracking-wider"
          style={{
            minHeight: compact ? '30px' : '40px',
            padding: compact ? '5px 14px' : '8px 20px',
            color: 'var(--pw-text-muted)',
            borderColor: 'rgba(42, 80, 96, 0.5)',
          }}
          onClick={() => {
            settingsOpen.value = true;
          }}
        >
          &#x2699; SETTINGS
        </button>
      </div>

      {/* ---- Controls hint (hidden on compact) ---- */}
      {!compact && (
        <>
          <p
            class="font-game text-[10px] mt-3 text-center px-4 hidden md:block relative z-10"
            style={{ color: 'var(--pw-text-muted)', opacity: 0.7 }}
          >
            Right-click to command &bull; WASD to scroll &bull; Ctrl+# to set groups
          </p>
          <p
            class="font-game text-[10px] mt-3 text-center px-4 md:hidden relative z-10"
            style={{ color: 'var(--pw-text-muted)', opacity: 0.7 }}
          >
            Long-press to command &bull; Two-finger pan &bull; Pinch to zoom
          </p>
        </>
      )}

      {/* ---- Version on driftwood (hidden on compact) ---- */}
      {!compact && (
        <div class="driftwood relative z-10 mt-2 mb-4 px-6 py-1">
          <span class="font-game text-[10px]" style={{ color: 'rgba(160, 140, 110, 0.7)' }}>
            v1.0 &middot; Defend the Pond
          </span>
        </div>
      )}
    </div>
  );
}
