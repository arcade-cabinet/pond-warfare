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
import { SPEED_LEVELS } from '@/constants';
import { Health, Position, Selectable, UnitStateMachine } from '@/ecs/components';
import { game } from '@/game';
import { hasPlayerUnitsSelected, selectArmy, selectIdleWorker } from '@/input/selection';
import { setColorBlindMode } from '@/rendering/pixi-app';
import { loadGame, saveGame } from '@/save-system';
import { getLatestSave, saveGameToDb } from '@/storage';
import { ErrorOverlay } from './error-overlay';
import { GameOverBanner } from './game-over';
import { HUD } from './hud';
import { KeyboardReference } from './keyboard-reference';
import { MainMenu } from './main-menu';
import { NewGameModal } from './new-game-modal';
import { SettingsPanel } from './settings-panel';
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
    <div
      class="flex flex-col-reverse md:flex-row h-screen w-screen text-sm font-game"
      style={{ color: 'var(--pw-text-primary)' }}
    >
      {/* Error overlay — always rendered, shows errors as they occur */}
      <ErrorOverlay />

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
          onHaltClick={() => {
            const w = game.world;
            for (const eid of w.selection) {
              if (hasComponent(w.ecs, eid, UnitStateMachine)) {
                UnitStateMachine.state[eid] = 0; // UnitState.Idle
                UnitStateMachine.targetEntity[eid] = -1;
                w.yukaManager.removeUnit(eid);
              }
            }
            game.syncUIStore();
          }}
          onSaveClick={() => {
            const json = saveGame(game.world);
            const difficulty = store.selectedDifficulty.value ?? 'normal';
            const seed = store.goMapSeed.value ?? 0;
            saveGameToDb('quicksave', difficulty, seed, json, false)
              .then(() => {
                store.hasSaveGame.value = true;
              })
              .catch((err) => {
                // biome-ignore lint/suspicious/noConsole: surface save failures
                console.error('Failed to save game to DB', err);
              });

            game.world.floatingTexts.push({
              x: game.world.camX + (game.world.viewWidth || 400) / 2,
              y: game.world.camY + 60,
              text: 'Game Saved',
              color: '#4ade80',
              life: 60,
            });
            audio.click();
          }}
          onLoadClick={() => {
            getLatestSave()
              .then((row) => {
                if (row?.data) {
                  loadGame(game.world, row.data);
                  game.syncUIStore();
                  audio.click();
                }
              })
              .catch((err) => {
                // biome-ignore lint/suspicious/noConsole: surface load failures
                console.error('Failed to load game from DB', err);
              });
          }}
          onSettingsClick={() => {
            store.settingsOpen.value = !store.settingsOpen.value;
            audio.click();
          }}
          onKeyboardRefClick={() => {
            store.keyboardRefOpen.value = !store.keyboardRefOpen.value;
            audio.click();
          }}
          onSaveCtrlGroup={(group) => {
            const w = game.world;
            w.ctrlGroups[group] = [...w.selection];
            w.floatingTexts.push({
              x: w.camX + w.viewWidth / 2,
              y: w.camY + 60,
              text: `Group ${group} set (${w.ctrlGroups[group].length})`,
              color: '#c084fc',
              life: 60,
            });
            audio.click();
            game.syncUIStore();
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

        {/* Main menu / New game modal */}
        {store.menuState.value === 'main' && <MainMenu />}
        {store.menuState.value === 'newGame' && <NewGameModal />}

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

        {/* Settings panel overlay */}
        {store.settingsOpen.value && (
          <SettingsPanel
            onMasterVolumeChange={(v) => {
              store.masterVolume.value = v;
              audio.setMasterVolume(v);
            }}
            onMusicVolumeChange={(v) => {
              store.musicVolume.value = v;
              audio.setMusicVolume(v);
            }}
            onSfxVolumeChange={(v) => {
              store.sfxVolume.value = v;
              audio.setSfxVolume(v);
            }}
            onSpeedSet={(speed) => {
              const w = game.world;
              if (SPEED_LEVELS.includes(speed as 1 | 2 | 3)) {
                w.gameSpeed = speed;
                store.gameSpeed.value = speed;
              }
            }}
            onColorBlindToggle={() => {
              store.colorBlindMode.value = !store.colorBlindMode.value;
              setColorBlindMode(store.colorBlindMode.value);
            }}
            onAutoSaveToggle={() => {
              store.autoSaveEnabled.value = !store.autoSaveEnabled.value;
            }}
            onUiScaleChange={(scale) => {
              store.uiScale.value = scale;
              document.documentElement.style.fontSize = `${16 * scale}px`;
            }}
            onScreenShakeToggle={() => {
              store.screenShakeEnabled.value = !store.screenShakeEnabled.value;
            }}
            onReduceVisualNoiseToggle={() => {
              store.reduceVisualNoise.value = !store.reduceVisualNoise.value;
            }}
            onClose={() => {
              store.settingsOpen.value = false;
            }}
          />
        )}

        {/* Keyboard reference overlay */}
        {store.keyboardRefOpen.value && (
          <KeyboardReference
            onClose={() => {
              store.keyboardRefOpen.value = false;
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
          <div class="font-heading font-bold">{store.tooltipData.value.title}</div>
          {store.tooltipData.value.costBreakdown ? (
            <div class="flex gap-2 font-numbers text-[10px]">
              {store.tooltipData.value.costBreakdown.clams != null &&
                store.tooltipData.value.costBreakdown.clams > 0 && (
                  <span style={{ color: 'var(--pw-clam)' }}>
                    {store.tooltipData.value.costBreakdown.clams} Clams
                  </span>
                )}
              {store.tooltipData.value.costBreakdown.twigs != null &&
                store.tooltipData.value.costBreakdown.twigs > 0 && (
                  <span style={{ color: 'var(--pw-twig)' }}>
                    {store.tooltipData.value.costBreakdown.twigs} Twigs
                  </span>
                )}
              {store.tooltipData.value.costBreakdown.food != null &&
                store.tooltipData.value.costBreakdown.food > 0 && (
                  <span style={{ color: 'var(--pw-food)' }}>
                    {store.tooltipData.value.costBreakdown.food} Food
                  </span>
                )}
            </div>
          ) : (
            store.tooltipData.value.cost && (
              <div class="font-numbers" style={{ color: 'var(--pw-accent)' }}>
                {store.tooltipData.value.cost}
              </div>
            )
          )}
          {store.tooltipData.value.description && (
            <div class="text-xs font-game" style={{ color: 'var(--pw-text-muted)' }}>
              {store.tooltipData.value.description}
            </div>
          )}
          {store.tooltipData.value.requires && (
            <div
              class="text-[10px] font-game italic"
              style={{ color: 'var(--pw-warning)' }}
            >
              {store.tooltipData.value.requires}
            </div>
          )}
          <div class="text-xs font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
            [{store.tooltipData.value.hotkey}]
          </div>
        </div>
      )}
    </div>
  );
}
