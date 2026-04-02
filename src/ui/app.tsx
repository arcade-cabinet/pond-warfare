/** Root Preact component — thin routing shell between menu and game screens. */

import { entityExists, hasComponent } from 'bitecs';
import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { Health, Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import { AchievementsPanel } from './achievements-panel';
import { CampaignPanel, ObjectiveTracker } from './campaign-panel';
import { HamburgerButton } from './components/HamburgerButton';
import { Tooltip } from './components/Tooltip';
import { CosmeticsPanel } from './cosmetics-panel';
import { ErrorOverlay } from './error-overlay';
import { EvacuationOverlay } from './evacuation-overlay';
import { GameOverBanner } from './game-over';
import { AchievementToast } from './hud/AchievementToast';
import { AdvisorToast } from './hud/AdvisorToast';
import { AbilityBar } from './hud/ability-bar';
import { AirdropButton } from './hud/airdrop-button';
import { ConnectionStatus } from './hud/ConnectionStatus';
import { CtrlGroups } from './hud/ctrl-groups';
import { Overlays } from './hud/overlays';
import { KeyboardReference } from './keyboard-reference';
import { LoadingScreen } from './LoadingScreen';
import { LeaderboardPanel } from './leaderboard-panel';
import { MainMenu } from './main-menu';
import { MatchHistoryPanel } from './match-history-panel';
import { NewGameModal } from './new-game-modal';
import { DisconnectOverlay } from './overlays/DisconnectOverlay';
import { SettingsOverlay } from './overlays/SettingsOverlay';
import { CommandPanel } from './panel/CommandPanel';
import { MultiplayerLobby } from './screens/MultiplayerLobby';
import { MultiplayerMenu } from './screens/MultiplayerMenu';
import * as store from './store';
import { multiplayerMenuOpen, multiplayerView } from './store-multiplayer';
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
      const refs = {
        container: containerRef.current,
        gameCanvas: gameCanvasRef.current,
        fogCanvas: fogCanvasRef.current,
        lightCanvas: lightCanvasRef.current,
        minimapCanvas: minimapCanvasRef.current,
        minimapCam: minimapCamRef.current,
        dayNightOverlay: dayNightRef.current,
      };
      store.gameLoading.value = true;
      (async () => {
        try {
          await onMount(refs);
        } catch (err) {
          // biome-ignore lint/suspicious/noConsole: surface init failures
          console.error('Failed to initialize game', err);
        } finally {
          store.gameLoading.value = false;
        }
      })();
    }
  }, [onMount, store.menuState.value]);

  // ---------- Menu screens ----------
  if (store.menuState.value === 'main' || store.menuState.value === 'newGame') {
    return (
      <div
        class="relative h-screen w-screen overflow-hidden"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <div class="rotate-prompt">
          <div class="text-center">
            <span style={{ fontSize: '48px' }}>&#x1F4F1;&#x2194;&#xFE0F;</span>
            <p class="font-heading text-lg mt-4">Please rotate your device to landscape</p>
          </div>
        </div>
        <ErrorOverlay />
        <MainMenu />
        {store.campaignOpen.value && <CampaignPanel />}
        {store.menuState.value === 'newGame' && <NewGameModal />}
        <SettingsOverlay />
        {store.achievementsOpen.value && <AchievementsPanel />}
        {store.leaderboardOpen.value && <LeaderboardPanel />}
        {store.unlocksOpen.value && <UnlocksPanel />}
        {store.cosmeticsOpen.value && <CosmeticsPanel />}
        {store.matchHistoryOpen.value && <MatchHistoryPanel />}
        {multiplayerMenuOpen.value &&
          (multiplayerView.value === 'lobby' ? <MultiplayerLobby /> : <MultiplayerMenu />)}
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

  // ---------- Game screen: pure canvas + hamburger + panel ----------
  return (
    <div
      class="relative h-screen w-screen text-sm font-game safe-area-pad overflow-hidden"
      style={{ color: 'var(--pw-text-primary)' }}
    >
      <div class="rotate-prompt">
        <div class="text-center">
          <span style={{ fontSize: '48px' }}>&#x1F4F1;&#x2194;&#xFE0F;</span>
          <p class="font-heading text-lg mt-4">Please rotate your device to landscape</p>
        </div>
      </div>

      <ErrorOverlay />

      {/* Fullscreen game container — shrinks when panel is docked via --pw-panel-width */}
      <div
        ref={containerRef}
        id="game-container"
        class="absolute inset-0 cursor-crosshair overflow-hidden bg-black"
        style={{ right: 'var(--pw-panel-width, 0px)' }}
      >
        <Overlays />
        <AirdropButton
          onAirdrop={() => {
            game.useAirdrop();
            game.syncUIStore();
          }}
        />
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
          onCommanderAbility={() => {
            game.useCommanderAbility();
            game.syncUIStore();
          }}
        />
        <CtrlGroups
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

        <canvas ref={gameCanvasRef} id="game-canvas" />
        <canvas ref={fogCanvasRef} id="fog-canvas" />
        <div
          ref={dayNightRef}
          id="day-night-overlay"
          class="absolute inset-0 pointer-events-none z-10"
        />
        <canvas ref={lightCanvasRef} id="light-canvas" />

        {store.campaignMissionId.value && <ObjectiveTracker />}
        <GameOverBanner onRestart={() => window.location.reload()} />
        <EvacuationOverlay
          onChoice={(choice) => {
            game.handleEvacuationChoice(choice);
          }}
        />
      </div>

      {/* Hamburger button — sole floating DOM element */}
      <HamburgerButton />

      {/* Connection status — top-right, multiplayer only */}
      <ConnectionStatus />

      {/* Advisor toast — bottom-left HUD, above safe area */}
      <AdvisorToast />

      {/* Achievement toast — top-center, shown for 3 seconds */}
      <AchievementToast />

      {/*
        Modal overlays — rendered as SIBLINGS of #game-container so they are
        NOT affected by its `touch-action: none`. Per the W3C Pointer Events
        spec, touch-action is computed by intersecting an element's value with
        each ancestor's value, so any overlay inside #game-container would
        inherit `touch-action: none` and lose native touch-scroll even if it
        set its own touch-action. Moving them here keeps game input isolated
        while restoring proper touch behaviour in all modal scroll areas.
      */}
      {store.techTreeOpen.value && (
        <TechTreePanel
          techState={{ ...game.world.tech }}
          clams={store.clams.value}
          twigs={store.twigs.value}
          researchDiscount={game.world.commanderModifiers.passiveResearchSpeed}
          onResearch={(id: TechId) => {
            const w = game.world;
            const upgrade = TECH_UPGRADES[id as keyof typeof TECH_UPGRADES];
            if (!upgrade || !canResearch(id, w.tech)) return;
            // Sage passive: reduce research cost by passiveResearchSpeed %
            const discount = 1 - w.commanderModifiers.passiveResearchSpeed;
            const clamCost = Math.round(upgrade.clamCost * discount);
            const twigCost = Math.round(upgrade.twigCost * discount);
            if (w.resources.clams >= clamCost && w.resources.twigs >= twigCost) {
              w.resources.clams -= clamCost;
              w.resources.twigs -= twigCost;
              w.tech[id] = true;
              game.syncUIStore();
            }
          }}
          onClose={() => {
            store.techTreeOpen.value = false;
          }}
        />
      )}
      <SettingsOverlay />
      {store.keyboardRefOpen.value && (
        <KeyboardReference
          onClose={() => {
            store.keyboardRefOpen.value = false;
          }}
        />
      )}
      {store.achievementsOpen.value && <AchievementsPanel />}
      {store.leaderboardOpen.value && <LeaderboardPanel />}
      {store.unlocksOpen.value && <UnlocksPanel />}
      {store.cosmeticsOpen.value && <CosmeticsPanel />}
      <DisconnectOverlay />

      {/* Tabbed command panel */}
      <CommandPanel minimapCanvasRef={minimapCanvasRef} minimapCamRef={minimapCamRef} />

      {/* Tooltip */}
      <Tooltip />

      {/* Loading screen overlay — covers everything during game init */}
      {store.gameLoading.value && <LoadingScreen />}
    </div>
  );
}
