/** Main Menu — Diegetic Pond Interface with floating lily pads and Yuka-steered otter. */

import { useCallback, useEffect, useRef } from 'preact/hooks';
import { screenClass } from '@/platform';
import { MenuBackground } from './menu-background';
import { MenuButton } from './menu-button';
import { MenuLilyPads } from './menu-lily-pads';
import { MenuOtter } from './menu-otter';
import { MenuPads } from './menu-pads';
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

const UI = '/pond-warfare/assets/ui';

export function MainMenu() {
  const compact = screenClass.value !== 'large';
  const otterRef = useRef<HTMLImageElement>(null);
  const otterAI = useRef<MenuOtter | null>(null);
  const padsSystem = useRef<MenuPads | null>(null);
  const padRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

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
        img.style.transform = `rotate(${(otter.rotation * 180) / Math.PI - 90}deg)`;
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
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <MenuBackground />
      {padsSystem.current && <MenuLilyPads pads={padsSystem.current.pads} padRefs={padRefs} />}

      {/* Swimming otter */}
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

      {/* Title */}
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
