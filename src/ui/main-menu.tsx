/**
 * Main Menu — Diegetic Pond Interface
 *
 * Hand-painted watercolor pond with floating lily pads as scenery, a swimming
 * otter (Yuka.js steered), and teal bar buttons for all menu actions. The lily
 * pads drift organically — all 3 variants plus tiny pads — while the otter
 * navigates between them, aware of pads, buttons, and the logo.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { isMobile, isTablet } from '@/platform';
import { getPlayerProfile } from '@/storage';
import { getRank, type RankInfo } from '@/systems/leaderboard';
import { MenuOtter } from './menu-otter';
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

const UI = '/pond-warfare/assets/ui';

/** Teal bar button using the painted Button.png asset. */
function MenuButton({
  label,
  onClick,
  disabled,
  wide,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      class={`menu-pond-btn relative flex items-center justify-center cursor-pointer min-h-[44px] transition-transform ${disabled ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
      style={{ width: wide ? '170px' : '140px', height: wide ? '48px' : '42px' }}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
    >
      <img
        src={`${UI}/Button.png`}
        alt=""
        class="absolute inset-0 w-full h-full object-fill pointer-events-none"
        draggable={false}
        style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.35))' }}
      />
      <span
        class="relative z-10 font-heading font-bold tracking-wider uppercase"
        style={{
          color: '#1a3a3a',
          fontSize: wide ? '14px' : '11px',
          textShadow: '0 1px 1px rgba(180,220,220,0.4)',
        }}
      >
        {label}
      </span>
    </button>
  );
}

/** Decorative floating lily pad (not interactive). */
function FloatingPad({
  variant,
  style,
  flower,
}: {
  variant: 1 | 2 | 3 | 'tiny';
  style: Record<string, string | number>;
  flower?: boolean;
}) {
  const src = variant === 'tiny' ? `${UI}/Lillypad-tiny.png` : `${UI}/Lillypad-${variant}.png`;
  const size = variant === 'tiny' ? '45px' : '80px';

  return (
    <div
      class="absolute pointer-events-none lily-pad"
      style={{ width: size, height: size, ...style }}
    >
      <img
        src={src}
        alt=""
        class="w-full h-full object-contain"
        draggable={false}
        style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))' }}
      />
      {flower && (
        <img
          src={`${UI}/Flower.png`}
          alt=""
          class="absolute"
          style={{ top: '-4px', right: '6px', width: '18px', height: '18px' }}
          draggable={false}
        />
      )}
    </div>
  );
}

export function MainMenu() {
  const [rank, setRank] = useState<RankInfo | null>(null);
  const compact = isMobile.value || isTablet.value;
  const otterRef = useRef<HTMLImageElement>(null);
  const otterAI = useRef<MenuOtter | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPlayerProfile()
      .then((p) => setRank(getRank(p.total_wins)))
      .catch(() => {});
  }, []);

  // Initialize Yuka otter on mount
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    const otter = new MenuOtter(
      { width: w, height: h },
      w * 0.75, // start right of center
      h * 0.7, // start in lower area
    );
    otterAI.current = otter;

    // Sync otter position to DOM element each frame
    let rafId = 0;
    const syncDOM = () => {
      const img = otterRef.current;
      if (img && otter) {
        img.style.left = `${otter.x - 50}px`;
        img.style.top = `${otter.y - 25}px`;
        // Rotate to face heading — offset by -90deg since sprite faces up
        const deg = (otter.rotation * 180) / Math.PI - 90;
        img.style.transform = `rotate(${deg}deg)`;
      }
      rafId = requestAnimationFrame(syncDOM);
    };

    otter.start();
    rafId = requestAnimationFrame(syncDOM);

    const onResize = () => {
      if (el) otter.resize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      otter.destroy();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      otterAI.current = null;
    };
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const el = containerRef.current;
    if (!el || !otterAI.current) return;
    const rect = el.getBoundingClientRect();
    otterAI.current.setPointer(e.clientX - rect.left, e.clientY - rect.top);
  }, []);

  const handlePointerLeave = useCallback(() => {
    otterAI.current?.clearPointer();
  }, []);

  const handleOtterClick = useCallback((e: MouseEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el || !otterAI.current) return;
    const rect = el.getBoundingClientRect();
    otterAI.current.poke(e.clientX - rect.left, e.clientY - rect.top);
  }, []);
  return (
    <div
      ref={containerRef}
      id="intro-overlay"
      class={`relative h-screen w-full flex flex-col items-center safe-area-pad ${compact ? 'justify-start pt-2 overflow-y-auto' : 'justify-center overflow-hidden'}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {/* ---- Painted pond background ---- */}
      <div
        class="absolute inset-0"
        style={{
          backgroundImage: `url(${UI}/Background.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* ---- Water ripple overlays ---- */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${UI}/Flowing_Serenity_Water Ripples 1.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
          animation: 'ripple-drift-1 12s ease-in-out infinite',
        }}
      />
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${UI}/Flowing_Serenity_Water ripples 2.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          animation: 'ripple-drift-2 16s ease-in-out infinite',
        }}
      />

      {/* Vignette */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, transparent 25%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.7) 100%)',
        }}
      />

      {/* ---- Decorative floating lily pads (all 3 varieties + tiny) ---- */}
      <FloatingPad variant={1} flower style={{ top: '10%', left: '6%', opacity: 0.7 }} />
      <FloatingPad variant={2} style={{ bottom: '15%', left: '12%', opacity: 0.6 }} />
      <FloatingPad variant={3} flower style={{ top: '20%', right: '8%', opacity: 0.65 }} />
      <FloatingPad variant={1} style={{ bottom: '10%', right: '10%', opacity: 0.55 }} />
      <FloatingPad variant={2} style={{ top: '50%', left: '3%', opacity: 0.4 }} />
      <FloatingPad variant={3} style={{ top: '8%', right: '25%', opacity: 0.5 }} />
      <FloatingPad variant="tiny" style={{ bottom: '30%', right: '4%', opacity: 0.45 }} />
      <FloatingPad variant="tiny" style={{ top: '40%', left: '18%', opacity: 0.35 }} />
      <FloatingPad variant="tiny" style={{ bottom: '8%', left: '30%', opacity: 0.4 }} />

      {/* ---- Swimming otter (Yuka-steered, clickable) ---- */}
      {/* Shadow layer — stays flat beneath the otter */}
      <img
        src={`${UI}/Otter shadow_goes above background but below ripples.png`}
        alt=""
        class="absolute z-[5] pointer-events-none"
        ref={(el) => {
          // Shadow tracks otter position but doesn't rotate
          if (el && otterRef.current) {
            const sync = () => {
              if (otterAI.current) {
                el.style.left = `${otterAI.current.x - 40}px`;
                el.style.top = `${otterAI.current.y - 10}px`;
              }
              requestAnimationFrame(sync);
            };
            requestAnimationFrame(sync);
          }
        }}
        style={{ width: compact ? '80px' : '130px', opacity: 0.6 }}
        draggable={false}
      />
      {/* Otter sprite — rotates to face heading */}
      <img
        ref={otterRef}
        src={`${UI}/Otter.png`}
        alt="otter"
        class="absolute z-10 cursor-pointer"
        style={{
          width: compact ? '80px' : '130px',
          opacity: 0.95,
        }}
        draggable={false}
        onClick={handleOtterClick}
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
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'mb-1' : 'mb-4'}`}>
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

      {/* ---- Menu buttons (teal bars) ---- */}
      <div class={`relative z-10 flex flex-col items-center ${compact ? 'gap-2' : 'gap-3'}`}>
        {/* Primary row */}
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

        {/* Secondary row */}
        <div class={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
          <MenuButton
            label="Campaign"
            onClick={() => {
              campaignOpen.value = true;
            }}
          />
          <MenuButton
            label="Settings"
            onClick={() => {
              settingsOpen.value = true;
            }}
          />
        </div>

        {/* Tertiary row */}
        <div class={`flex items-center ${compact ? 'gap-1' : 'gap-2'} flex-wrap justify-center`}>
          <MenuButton
            label="Leaderboard"
            onClick={() => {
              leaderboardOpen.value = true;
            }}
          />
          <MenuButton
            label="Achievements"
            onClick={() => {
              achievementsOpen.value = true;
            }}
          />
          <MenuButton
            label="Unlocks"
            onClick={() => {
              unlocksOpen.value = true;
            }}
          />
          <MenuButton
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
