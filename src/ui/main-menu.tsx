/**
 * Main Menu — Diegetic Pond Interface
 *
 * Hand-painted watercolor pond with floating lily pads as scenery, a swimming
 * otter (Yuka.js steered), and teal bar buttons for all menu actions. The lily
 * pads drift organically — all 3 variants plus tiny pads — while the otter
 * navigates between them, aware of pads, buttons, and the logo.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { screenClass } from '@/platform';
import { getPlayerProfile } from '@/storage';
import { getRank, type RankInfo } from '@/systems/leaderboard';
import { MenuBackground } from './menu-background';
import { MenuButton } from './menu-button';
import { MenuOtter } from './menu-otter';
import { MenuPads } from './menu-pads';
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

export function MainMenu() {
  const [rank, setRank] = useState<RankInfo | null>(null);
  const compact = screenClass.value !== 'large';
  const otterRef = useRef<HTMLImageElement>(null);
  const otterAI = useRef<MenuOtter | null>(null);
  const padsSystem = useRef<MenuPads | null>(null);
  const padRefs = useRef<(HTMLDivElement | null)[]>([]);
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
    const otter = new MenuOtter({ width: w, height: h }, w * 0.75, h * 0.7);
    otterAI.current = otter;

    const pads = new MenuPads({ width: w, height: h }, 10);
    padsSystem.current = pads;

    let rafId = 0;
    const syncDOM = () => {
      const img = otterRef.current;
      if (img && otter) {
        img.style.left = `${otter.x - 50}px`;
        img.style.top = `${otter.y - 25}px`;
        const deg = (otter.rotation * 180) / Math.PI - 90;
        img.style.transform = `rotate(${deg}deg)`;
      }
      for (let i = 0; i < pads.pads.length; i++) {
        const padEl = padRefs.current[i];
        const p = pads.pads[i];
        if (padEl && p) {
          padEl.style.left = `${p.x - p.size}px`;
          padEl.style.top = `${p.y - p.size}px`;
          padEl.style.transform = `rotate(${p.rotation}deg)`;
        }
      }
      rafId = requestAnimationFrame(syncDOM);
    };

    otter.start();
    pads.start();
    rafId = requestAnimationFrame(syncDOM);

    const onResize = () => {
      if (el) {
        otter.resize(el.clientWidth, el.clientHeight);
        pads.resize(el.clientWidth, el.clientHeight);
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      otter.destroy();
      pads.destroy();
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      otterAI.current = null;
      padsSystem.current = null;
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
      <MenuBackground />

      {/* ---- Dynamic floating lily pads ---- */}
      {padsSystem.current?.pads.map((p, i) => {
        const src =
          p.variant === 'tiny' ? `${UI}/Lillypad-tiny.png` : `${UI}/Lillypad-${p.variant}.png`;
        const size = p.variant === 'tiny' ? '45px' : '80px';
        return (
          <div
            key={`pad-${i}`}
            ref={(el) => {
              padRefs.current[i] = el;
            }}
            class="absolute pointer-events-none z-[1]"
            style={{ width: size, height: size, opacity: p.variant === 'tiny' ? 0.5 : 0.7 }}
          >
            <img
              src={src}
              alt=""
              class="w-full h-full object-contain"
              draggable={false}
              style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))' }}
            />
            {p.flower && (
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
      })}

      {/* ---- Swimming otter (Yuka-steered, clickable) ---- */}
      <img
        src={`${UI}/Otter shadow_goes above background but below ripples.png`}
        alt=""
        class="absolute z-[5] pointer-events-none"
        ref={(el) => {
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
      <img
        ref={otterRef}
        src={`${UI}/Otter.png`}
        alt="otter"
        class="absolute z-10 cursor-pointer"
        style={{ width: compact ? '80px' : '130px', opacity: 0.95 }}
        draggable={false}
        onClick={handleOtterClick}
      />

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
