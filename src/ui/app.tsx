/**
 * Root Preact component.
 *
 * Renders the full game layout matching the original HTML structure (lines 79-165):
 * body with flex layout, sidebar on left (minimap + selection-info + action-panel),
 * main game container on right (top bar + canvases + overlays).
 */

import { entityExists, hasComponent } from 'bitecs';
import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { Health, Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import { hasPlayerUnitsSelected, selectArmy, selectIdleWorker } from '@/input/selection';
import { setColorBlindMode } from '@/rendering/pixi-app';
import { GameOverBanner } from './game-over';
import { HUD } from './hud';
import { IntroOverlay } from './intro-overlay';
import { Sidebar } from './sidebar';
import * as store from './store';
import { TechTreePanel } from './tech-tree-panel';

export interface AppProps {
  onMount: (refs: {
    container: HTMLDivElement;
    gameCanvas: HTMLCanvasElement;
    fogCanvas: HTMLCanvasElement;
    lightCanvas: HTMLCanvasElement;
    minimapCanvas: HTMLCanvasElement;
    minimapCam: HTMLDivElement;
    dayNightOverlay: HTMLDivElement;
  }) => void | Promise<void>;
}

export function App({ onMount }: AppProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapCamRef = useRef<HTMLDivElement>(null);
  const dayNightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      containerRef.current &&
      gameCanvasRef.current &&
      fogCanvasRef.current &&
      lightCanvasRef.current &&
      minimapCanvasRef.current &&
      minimapCamRef.current &&
      dayNightRef.current
    ) {
      const container = containerRef.current;
      const gameCanvas = gameCanvasRef.current;
      const fogCanvas = fogCanvasRef.current;
      const lightCanvas = lightCanvasRef.current;
      const minimapCanvas = minimapCanvasRef.current;
      const minimapCam = minimapCamRef.current;
      const dayNight = dayNightRef.current;
      (async () => {
        try {
          await onMount({
            container,
            gameCanvas,
            fogCanvas,
            lightCanvas,
            minimapCanvas,
            minimapCam,
            dayNightOverlay: dayNight,
          });
        } catch (err) {
          // biome-ignore lint/suspicious/noConsole: surface init failures for debugging
          console.error('Failed to initialize game', err);
        }
      })();
    }
  }, [onMount]);

  return (
    <div class="flex flex-col-reverse md:flex-row h-screen w-screen text-sm text-slate-200">
      {/* Sidebar */}
      <Sidebar
        minimapCanvasRef={minimapCanvasRef}
        minimapCamRef={minimapCamRef}
        onDeselect={() => {
          const w = game.world;
          for (const eid of w.selection) {
            if (hasComponent(w.ecs, eid, Selectable)) {
              Selectable.selected[eid] = 0;
            }
          }
          w.selection = [];
          w.isTracking = false;
          game.syncUIStore();
        }}
      />

      {/* Main game container */}
      <div
        ref={containerRef}
        id="game-container"
        class="flex-1 relative cursor-crosshair overflow-hidden bg-black"
      >
        {/* Top bar HUD */}
        <HUD
          onSpeedClick={() => game.cycleSpeed()}
          onMuteClick={() => {
            audio.toggleMute();
            store.muted.value = audio.muted;
          }}
          onColorBlindToggle={() => {
            store.colorBlindMode.value = !store.colorBlindMode.value;
            setColorBlindMode(store.colorBlindMode.value);
          }}
          onIdleWorkerClick={() => {
            selectIdleWorker(game.world);
            game.syncUIStore();
          }}
          onArmyClick={() => {
            selectArmy(game.world);
            game.syncUIStore();
          }}
          onPauseClick={() => {
            game.world.paused = !game.world.paused;
            game.syncUIStore();
          }}
          onAttackMoveClick={() => {
            if (hasPlayerUnitsSelected(game.world)) {
              game.world.attackMoveMode = true;
              game.syncUIStore();
            }
          }}
          onCtrlGroupClick={(group) => {
            const w = game.world;
            const g = w.ctrlGroups[group];
            if (g && g.length > 0) {
              const alive = g.filter((eid) => entityExists(w.ecs, eid) && Health.current[eid] > 0);
              w.ctrlGroups[group] = alive;
              if (alive.length > 0) {
                for (const s of w.selection) {
                  if (hasComponent(w.ecs, s, Selectable)) Selectable.selected[s] = 0;
                }
                w.selection = [...alive];
                for (const s of w.selection) {
                  if (hasComponent(w.ecs, s, Selectable)) Selectable.selected[s] = 1;
                }
                // Smooth pan to center of group
                let cx = 0;
                let cy = 0;
                for (const eid of alive) {
                  cx += Position.x[eid];
                  cy += Position.y[eid];
                }
                cx /= alive.length;
                cy /= alive.length;
                game.smoothPanTo(cx, cy);
                audio.selectUnit();
                game.syncUIStore();
              }
            }
          }}
        />

        {/* Canvases */}
        <canvas ref={gameCanvasRef} id="game-canvas" />
        <canvas ref={fogCanvasRef} id="fog-canvas" />
        <div
          ref={dayNightRef}
          id="day-night-overlay"
          class="absolute inset-0 pointer-events-none z-10"
        />
        <canvas ref={lightCanvasRef} id="light-canvas" />

        {/* Intro overlay */}
        <IntroOverlay />

        {/* Game over banner */}
        <GameOverBanner onRestart={() => window.location.reload()} />

        {/* Tech tree overlay */}
        {store.techTreeOpen.value && (
          <TechTreePanel
            techState={{ ...game.world.tech }}
            clams={store.clams.value}
            twigs={store.twigs.value}
            onResearch={(id: TechId) => {
              const w = game.world;
              const upgrade = TECH_UPGRADES[id as keyof typeof TECH_UPGRADES];
              if (
                upgrade &&
                canResearch(id, w.tech) &&
                w.resources.clams >= upgrade.clamCost &&
                w.resources.twigs >= upgrade.twigCost
              ) {
                w.resources.clams -= upgrade.clamCost;
                w.resources.twigs -= upgrade.twigCost;
                w.tech[id] = true;
                game.syncUIStore();
              }
            }}
            onClose={() => {
              store.techTreeOpen.value = false;
            }}
          />
        )}
      </div>

      {/* Tooltip overlay */}
      {store.tooltipVisible.value && store.tooltipData.value && (
        <div
          class="tooltip"
          style={{
            left: `${store.tooltipX.value}px`,
            top: `${store.tooltipY.value}px`,
          }}
        >
          <div class="font-bold">{store.tooltipData.value.title}</div>
          <div class="text-sky-200">{store.tooltipData.value.cost}</div>
          <div class="text-xs text-slate-400">{store.tooltipData.value.description}</div>
          <div class="text-xs text-slate-500">[{store.tooltipData.value.hotkey}]</div>
        </div>
      )}
    </div>
  );
}
