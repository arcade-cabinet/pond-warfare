/**
 * Root Preact component.
 *
 * When the player is on the main menu or new-game screen, renders only the
 * fullscreen MainMenu (no sidebar, HUD, or game canvases). Once the game
 * starts (menuState === 'playing'), renders the full game layout: sidebar on
 * left, main game container on right with canvases and overlays.
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
import { AchievementsPanel } from './achievements-panel';
import { ActionPanel } from './action-panel';
import { CampaignPanel, ObjectiveTracker } from './campaign-panel';
import { CosmeticsPanel } from './cosmetics-panel';
import { ErrorOverlay } from './error-overlay';
import { EvacuationOverlay } from './evacuation-overlay';
import { GameOverBanner } from './game-over';
import { HUD } from './hud';
import { AbilityBar } from './hud/ability-bar';
import { AirdropButton } from './hud/airdrop-button';
import { KeyboardReference } from './keyboard-reference';
import { LeaderboardPanel } from './leaderboard-panel';
import { MainMenu } from './main-menu';
import { NewGameModal } from './new-game-modal';
import { SelectionPanel } from './selection-panel';
import { SettingsPanel } from './settings-panel';
import * as store from './store';
import { TechTreePanel } from './tech-tree-panel';
import { UnlocksPanel } from './unlocks-panel';

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
    // Only initialise game canvases when actually playing
    if (store.menuState.value !== 'playing') return;

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
  }, [onMount, store.menuState.value]);

  // ---------- Fullscreen menu (no game chrome) ----------
  if (store.menuState.value === 'main' || store.menuState.value === 'newGame') {
    return (
      <div
        class="relative h-screen w-screen overflow-hidden"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        {/* Rotate-your-device overlay for portrait mobile web users */}
        <div class="rotate-prompt">
          <div class="text-center">
            <span style={{ fontSize: '48px' }}>&#x1F4F1;&#x2194;&#xFE0F;</span>
            <p class="font-heading text-lg mt-4">Please rotate your device to landscape</p>
          </div>
        </div>

        {/* Error overlay -- always rendered */}
        <ErrorOverlay />

        {/* Fullscreen main menu */}
        <MainMenu />

        {/* Campaign panel (accessible from main menu) */}
        {store.campaignOpen.value && <CampaignPanel />}

        {/* New game modal */}
        {store.menuState.value === 'newGame' && <NewGameModal />}

        {/* Settings panel */}
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

        {/* Achievements panel */}
        {store.achievementsOpen.value && <AchievementsPanel />}

        {/* Leaderboard panel */}
        {store.leaderboardOpen.value && <LeaderboardPanel />}

        {/* Unlocks panel */}
        {store.unlocksOpen.value && <UnlocksPanel />}

        {/* Cosmetics panel */}
        {store.cosmeticsOpen.value && <CosmeticsPanel />}

        {/* Keyboard reference */}
        {store.keyboardRefOpen.value && (
          <KeyboardReference
            onClose={() => {
              store.keyboardRefOpen.value = false;
            }}
          />
        )}
      </div>
    );
  }

  // ---------- Playing: fullscreen game + slide-out panel ----------
  const panelOpen = store.mobilePanelOpen.value;

  const deselect = () => {
    const w = game.world;
    for (const eid of w.selection) {
      if (hasComponent(w.ecs, eid, Selectable)) Selectable.selected[eid] = 0;
    }
    w.selection = [];
    w.isTracking = false;
    game.syncUIStore();
  };

  return (
    <div
      class="relative h-screen w-screen text-sm font-game safe-area-pad overflow-hidden"
      style={{ color: 'var(--pw-text-primary)' }}
    >
      {/* Rotate-your-device overlay for portrait mobile web users */}
      <div class="rotate-prompt">
        <div class="text-center">
          <span style={{ fontSize: '48px' }}>&#x1F4F1;&#x2194;&#xFE0F;</span>
          <p class="font-heading text-lg mt-4">Please rotate your device to landscape</p>
        </div>
      </div>

      {/* Error overlay */}
      <ErrorOverlay />

      {/* ---- Fullscreen game container ---- */}
      <div
        ref={containerRef}
        id="game-container"
        class="absolute inset-0 cursor-crosshair overflow-hidden bg-black"
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
          onPanelToggle={() => {
            store.mobilePanelOpen.value = !store.mobilePanelOpen.value;
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

        {/* Airdrop button */}
        <AirdropButton
          onAirdrop={() => {
            game.useAirdrop();
            game.syncUIStore();
          }}
        />

        {/* Active abilities */}
        <AbilityBar
          onRallyCry={() => {
            game.useRallyCry();
            game.syncUIStore();
          }}
          onPondBlessing={() => {
            game.usePondBlessing();
            game.syncUIStore();
          }}
          onTidalSurge={() => {
            game.useTidalSurge();
            game.syncUIStore();
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

        {/* Campaign objective tracker (shown during gameplay) */}
        {store.campaignMissionId.value && <ObjectiveTracker />}

        {/* Game over banner */}
        <GameOverBanner onRestart={() => window.location.reload()} />

        {/* Evacuation overlay */}
        <EvacuationOverlay
          onChoice={(choice) => {
            game.handleEvacuationChoice(choice);
          }}
        />

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

        {/* Achievements panel overlay */}
        {store.achievementsOpen.value && <AchievementsPanel />}

        {/* Leaderboard panel overlay */}
        {store.leaderboardOpen.value && <LeaderboardPanel />}

        {/* Unlocks panel overlay */}
        {store.unlocksOpen.value && <UnlocksPanel />}

        {/* Cosmetics panel overlay */}
        {store.cosmeticsOpen.value && <CosmeticsPanel />}
      </div>

      {/* ---- Floating minimap (top-right, hidden when panel covers it) ---- */}
      <div
        class={`absolute top-11 right-2 z-30 rounded shadow-lg overflow-hidden transition-opacity ${panelOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{
          width: '110px',
          height: '110px',
          border: '2px solid var(--pw-border)',
          background: 'var(--pw-bg-deep)',
        }}
      >
        <canvas
          ref={minimapCanvasRef}
          id="minimap"
          width={200}
          height={200}
          class="w-full h-full block render-pixelated cursor-crosshair"
        />
        <div
          ref={minimapCamRef}
          id="minimap-cam"
          class="absolute border border-white pointer-events-none hidden box-border"
          style={{ left: 0, top: 0 }}
        />
      </div>

      {/* ---- Floating selection card (bottom-left, hidden when panel open) ---- */}
      {store.selectionCount.value > 0 && !panelOpen && (
        <div
          class="absolute bottom-2 left-2 z-30 rounded shadow-lg p-2 max-w-[220px]"
          style={{
            background: 'linear-gradient(180deg, var(--pw-bg-surface), var(--pw-bg-deep))',
            border: '1px solid var(--pw-border)',
          }}
        >
          <div class="flex items-center gap-2">
            {!store.selectionIsMulti.value && store.selectionSpriteData.value && (
              <img
                src={store.selectionSpriteData.value}
                alt="portrait"
                class="w-10 h-10 render-pixelated rounded-sm flex-shrink-0"
                style={{ background: 'var(--pw-bg-surface)', border: '1px solid var(--pw-border)' }}
              />
            )}
            <div class="flex-1 min-w-0">
              <div
                class={`font-heading text-xs font-bold leading-tight truncate ${store.selectionNameColor.value}`}
              >
                {store.selectionName.value}
                {store.selectionIsMulti.value && ` (${store.selectionCount.value})`}
              </div>
              {store.selectionShowHpBar.value && (
                <div
                  class="w-full h-1.5 mt-0.5 rounded-sm overflow-hidden"
                  style={{ background: 'rgba(127,29,29,0.5)' }}
                >
                  <div
                    class="h-full rounded-sm"
                    style={{
                      width: `${store.hpPercent.value}%`,
                      background: store.hpBarColor.value,
                    }}
                  />
                </div>
              )}
              <div
                class="font-numbers text-[9px] truncate"
                style={{ color: 'var(--pw-text-secondary)' }}
              >
                {store.selectionStatsHtml.value}
              </div>
            </div>
            <button
              type="button"
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer hud-btn flex-shrink-0"
              onClick={deselect}
            >
              X
            </button>
          </div>
          {/* Inline A-Move / Stop for touch */}
          {store.hasPlayerUnits.value && (
            <div class="flex gap-1 mt-1">
              {!store.attackMoveActive.value && (
                <button
                  type="button"
                  class="px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer flex-1"
                  style={{ border: '1px solid var(--pw-twig)', color: 'var(--pw-otter)' }}
                  onClick={() => {
                    if (hasPlayerUnitsSelected(game.world)) {
                      game.world.attackMoveMode = true;
                      game.syncUIStore();
                    }
                  }}
                >
                  A-Move
                </button>
              )}
              <button
                type="button"
                class="px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer flex-1"
                style={{ border: '1px solid var(--pw-border)', color: 'var(--pw-text-secondary)' }}
                onClick={() => {
                  const w = game.world;
                  for (const eid of w.selection) {
                    if (hasComponent(w.ecs, eid, UnitStateMachine)) {
                      UnitStateMachine.state[eid] = 0;
                      UnitStateMachine.targetEntity[eid] = -1;
                      w.yukaManager.removeUnit(eid);
                    }
                  }
                  game.syncUIStore();
                }}
              >
                Stop
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---- Slide-out panel (right edge) ---- */}
      <div
        class={`absolute top-0 right-0 h-full z-40 transition-transform duration-200 ease-out ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: 'min(260px, 45vw)',
          background: 'linear-gradient(180deg, var(--pw-wood-mid), var(--pw-wood-dark))',
          borderLeft: '3px solid var(--pw-border)',
          boxShadow: panelOpen ? '-4px 0 20px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Panel header */}
        <div
          class="flex items-center justify-between p-2"
          style={{ borderBottom: '2px solid var(--pw-border)' }}
        >
          <span
            class="font-heading text-xs font-bold tracking-wider"
            style={{ color: 'var(--pw-accent)' }}
          >
            COMMAND PANEL
          </span>
          <button
            type="button"
            class="hud-btn w-6 h-6 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
            onClick={() => {
              store.mobilePanelOpen.value = false;
            }}
          >
            X
          </button>
        </div>

        {/* Panel body: selection + action panel + auto-behaviors */}
        <div class="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 40px)' }}>
          <SelectionPanel
            onDeselect={deselect}
            onIdleWorkerClick={() => {
              selectIdleWorker(game.world);
              game.syncUIStore();
            }}
            onArmyClick={() => {
              selectArmy(game.world);
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
                  UnitStateMachine.state[eid] = 0;
                  UnitStateMachine.targetEntity[eid] = -1;
                  w.yukaManager.removeUnit(eid);
                }
              }
              game.syncUIStore();
            }}
          />
          <ActionPanel />

          {/* Tech Tree button */}
          <div class="p-2 flex flex-col gap-1">
            <button
              type="button"
              class="action-btn w-full py-2 rounded font-heading font-bold text-xs tracking-wider"
              style={{ color: 'var(--pw-accent)' }}
              onClick={() => {
                store.techTreeOpen.value = true;
                store.mobilePanelOpen.value = false;
              }}
            >
              &#x1F4DC; TECH TREE
            </button>

            {/* Quick actions row */}
            <div class="flex gap-1">
              <button
                type="button"
                class="action-btn flex-1 py-1.5 rounded font-bold text-[10px]"
                style={{ color: 'var(--pw-success)' }}
                onClick={() => {
                  const json = saveGame(game.world);
                  const difficulty = store.selectedDifficulty.value ?? 'normal';
                  const seed = store.goMapSeed.value ?? 0;
                  saveGameToDb('quicksave', difficulty, seed, json, false)
                    .then(() => {
                      store.hasSaveGame.value = true;
                    })
                    .catch(() => {});
                  game.world.floatingTexts.push({
                    x: game.world.camX + (game.world.viewWidth || 400) / 2,
                    y: game.world.camY + 60,
                    text: 'Game Saved',
                    color: '#4ade80',
                    life: 60,
                  });
                  audio.click();
                }}
              >
                Save
              </button>
              <button
                type="button"
                class={`action-btn flex-1 py-1.5 rounded font-bold text-[10px] ${store.hasSaveGame.value ? '' : 'opacity-35'}`}
                style={{
                  color: store.hasSaveGame.value ? 'var(--pw-warning)' : 'var(--pw-text-muted)',
                }}
                disabled={!store.hasSaveGame.value}
                onClick={() => {
                  getLatestSave()
                    .then((row) => {
                      if (row?.data) {
                        loadGame(game.world, row.data);
                        game.syncUIStore();
                        audio.click();
                      }
                    })
                    .catch(() => {});
                }}
              >
                Load
              </button>
              <button
                type="button"
                class="action-btn flex-1 py-1.5 rounded font-bold text-[10px]"
                onClick={() => {
                  store.settingsOpen.value = true;
                  store.mobilePanelOpen.value = false;
                }}
              >
                &#x2699; Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Dim overlay when panel is open */}
      {panelOpen && (
        <div
          class="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 35 }}
          onClick={() => {
            store.mobilePanelOpen.value = false;
          }}
        />
      )}

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
              {store.tooltipData.value.costBreakdown.pearls != null &&
                store.tooltipData.value.costBreakdown.pearls > 0 && (
                  <span style={{ color: 'var(--pw-pearl, #e0b0ff)' }}>
                    {store.tooltipData.value.costBreakdown.pearls} Pearls
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
            <div class="text-[10px] font-game italic" style={{ color: 'var(--pw-warning)' }}>
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
