/**
 * Main Menu — Diegetic Lily Pad Interface
 *
 * Uses hand-painted art assets (public/assets/ui/) to create an immersive
 * pond scene. Lily pad button sprites float on a watercolor pond background
 * with ripple overlays, a swimming otter, and flower accents. Text is
 * scrawled on each pad in the game's heading font.
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

/** Pad-1 = enabled (vibrant green), Pad-2 = disabled (faded), Pad-3 = active/pressed (darker). */
const PAD_ENABLED = '/pond-warfare/assets/ui/Lillypad-1.png';
const PAD_DISABLED = '/pond-warfare/assets/ui/Lillypad-2.png';
const PAD_ACTIVE = '/pond-warfare/assets/ui/Lillypad-3.png';

/** A clickable lily pad button using a real sprite. */
function LilyPadButton({
  label,
  onClick,
  disabled,
  size = 'md',
  delay = 0,
  flower,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  size?: 'lg' | 'md' | 'sm';
  delay?: number;
  flower?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const small = typeof window !== 'undefined' && window.innerHeight < 500;
  const dims =
    size === 'lg'
      ? { w: small ? 130 : 170, h: small ? 110 : 140 }
      : size === 'md'
        ? { w: small ? 110 : 140, h: small ? 90 : 115 }
        : { w: small ? 90 : 115, h: small ? 74 : 95 };

  const fontSize =
    size === 'lg'
      ? small
        ? '15px'
        : '18px'
      : size === 'md'
        ? small
          ? '12px'
          : '15px'
        : small
          ? '10px'
          : '12px';

  const sprite = disabled ? PAD_DISABLED : pressed ? PAD_ACTIVE : PAD_ENABLED;

  return (
    <button
      type="button"
      class={`lily-pad-btn relative flex items-center justify-center cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      style={{
        width: `${dims.w}px`,
        height: `${dims.h}px`,
        animationDelay: `${delay}s`,
      }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      onPointerDown={() => {
        if (!disabled) setPressed(true);
      }}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {/* Painted lily pad sprite */}
      <img
        src={sprite}
        alt=""
        class="absolute inset-0 w-full h-full object-contain pointer-events-none render-pixelated"
        draggable={false}
        style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
      />
      {/* Flower accent */}
      {flower && (
        <img
          src="/pond-warfare/assets/ui/Flower.png"
          alt=""
          class="absolute pointer-events-none"
          style={{ top: '-6px', right: '8px', width: '20px', height: '20px' }}
          draggable={false}
        />
      )}
      {/* Scrawled label */}
      <span
        class="relative z-10 font-heading font-bold text-center leading-tight tracking-wide uppercase"
        style={{
          color: '#2a4a2a',
          fontSize,
          textShadow: '0 1px 2px rgba(200,230,200,0.5)',
          fontStyle: 'italic',
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** A teal bar button using the Button.png asset for secondary actions. */
function BarButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      class={`relative flex items-center justify-center cursor-pointer min-h-[44px] ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
      style={{ width: '130px', height: '42px' }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      <img
        src="/pond-warfare/assets/ui/Button.png"
        alt=""
        class="absolute inset-0 w-full h-full object-fill pointer-events-none"
        draggable={false}
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
      />
      <span
        class="relative z-10 font-heading font-bold text-[10px] tracking-wider uppercase"
        style={{ color: '#1a3a3a', textShadow: '0 1px 1px rgba(180,220,220,0.4)' }}
      >
        {label}
      </span>
    </button>
  );
}

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
      class={`relative h-screen w-full flex flex-col items-center safe-area-pad ${compact ? 'justify-start pt-2 overflow-y-auto' : 'justify-center overflow-hidden'}`}
    >
      {/* ---- Painted pond background ---- */}
      <div
        class="absolute inset-0"
        style={{
          backgroundImage: 'url(/pond-warfare/assets/ui/Background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* ---- Water ripple overlay layers ---- */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/pond-warfare/assets/ui/Flowing_Serenity_Water Ripples 1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          animation: 'ripple-drift-1 12s ease-in-out infinite',
        }}
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/pond-warfare/assets/ui/Flowing_Serenity_Water ripples 2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          animation: 'ripple-drift-2 16s ease-in-out infinite',
        }}
      />

      {/* Vignette for depth */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, transparent 25%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* ---- Decorative tiny lily pads (not buttons) ---- */}
      <img
        src="/pond-warfare/assets/ui/Lillypad-tiny.png"
        alt=""
        class="absolute pointer-events-none lily-pad"
        style={{ width: '50px', bottom: '12%', left: '8%', opacity: 0.6 }}
        draggable={false}
      />
      <img
        src="/pond-warfare/assets/ui/Lillypad-tiny.png"
        alt=""
        class="absolute pointer-events-none lily-pad"
        style={{ width: '35px', top: '18%', right: '10%', opacity: 0.45 }}
        draggable={false}
      />
      <img
        src="/pond-warfare/assets/ui/Lillypad-tiny.png"
        alt=""
        class="absolute pointer-events-none lily-pad"
        style={{ width: '40px', bottom: '25%', right: '5%', opacity: 0.4 }}
        draggable={false}
      />

      {/* ---- Swimming otter ---- */}
      <img
        src="/pond-warfare/assets/ui/Otter w Shadow.png"
        alt="otter"
        class="absolute pointer-events-none"
        style={{
          width: compact ? '100px' : '160px',
          bottom: compact ? '4%' : '6%',
          right: compact ? '10%' : '15%',
          animation: 'lily-drift 14s ease-in-out infinite',
          opacity: 0.9,
        }}
        draggable={false}
      />

      {/* ---- Fireflies ---- */}
      <div class="absolute inset-0 pointer-events-none overflow-hidden">
        <div class="firefly" style={{ top: '20%', left: '15%' }} />
        <div class="firefly" style={{ top: '35%', right: '20%' }} />
        <div class="firefly" style={{ top: '60%', left: '25%' }} />
        <div class="firefly" style={{ bottom: '25%', right: '30%' }} />
        <div class="firefly" style={{ top: '15%', right: '35%' }} />
        <div class="firefly" style={{ bottom: '35%', left: '10%' }} />
      </div>

      {/* ==== CONTENT ==== */}

      {/* ---- Title ---- */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'mb-1' : 'mb-3'}`}>
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
        {!compact && (
          <div
            class="title-reflection mt-0"
            aria-hidden="true"
            style={{ maxHeight: '50px', overflow: 'hidden' }}
          >
            <span
              class="logo-pond block text-4xl md:text-7xl leading-tight"
              style={{ letterSpacing: '0.15em' }}
            >
              Pond
            </span>
          </div>
        )}
        <p
          class="font-heading text-xs md:text-sm mt-1 tracking-wider text-center"
          style={{ color: 'rgba(180,220,210,0.8)' }}
        >
          Defend the Pond. Conquer the Wild.
          {rank && (
            <span class="ml-2" title={rank.label} style={{ color: rank.color }}>
              {rank.icon} {rank.label}
            </span>
          )}
        </p>
      </div>

      {/* ---- Lily pad buttons ---- */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'gap-1' : 'gap-2'}`}>
        {/* Primary: New Game + Continue */}
        <div class={`flex items-center ${compact ? 'gap-2' : 'gap-4'}`}>
          <LilyPadButton
            label="New Game"
            size="lg"
            flower
            delay={0}
            onClick={() => {
              menuState.value = 'newGame';
            }}
          />
          <LilyPadButton
            label="Continue"
            size="lg"
            delay={0.4}
            disabled={!hasSaveGame.value}
            onClick={() => {
              if (hasSaveGame.value) {
                continueRequested.value = true;
                menuState.value = 'playing';
              }
            }}
          />
        </div>

        {/* Secondary: Campaign + Settings on pads */}
        <div class={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <LilyPadButton
            label="Campaign"
            size="md"
            delay={0.7}
            onClick={() => {
              campaignOpen.value = true;
            }}
          />
          <LilyPadButton
            label="Settings"
            size="md"
            flower
            delay={1.0}
            onClick={() => {
              settingsOpen.value = true;
            }}
          />
        </div>

        {/* Tertiary: bar buttons for secondary features */}
        <div class={`flex items-center ${compact ? 'gap-1' : 'gap-2'} flex-wrap justify-center`}>
          <BarButton
            label="Leaderboard"
            onClick={() => {
              leaderboardOpen.value = true;
            }}
          />
          <BarButton
            label="Achievements"
            onClick={() => {
              achievementsOpen.value = true;
            }}
          />
          <BarButton
            label="Unlocks"
            onClick={() => {
              unlocksOpen.value = true;
            }}
          />
          <BarButton
            label="Cosmetics"
            onClick={() => {
              cosmeticsOpen.value = true;
            }}
          />
        </div>
      </div>

      {/* ---- Version ---- */}
      {!compact && (
        <div class="relative z-10 mt-3 mb-4">
          <span class="font-game text-[10px]" style={{ color: 'rgba(140, 180, 170, 0.5)' }}>
            v1.0 &middot; Defend the Pond
          </span>
        </div>
      )}
    </div>
  );
}
