/**
 * Root Preact component — thin routing shell.
 *
 * Routes between menu screen and game screen based on menuState signal.
 * All game logic handlers live in game-actions.ts, all panel UI in panel/,
 * and all overlays in overlays/.
 */

import { entityExists, hasComponent } from 'bitecs';
import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { Health, Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import { AchievementsPanel } from './achievements-panel';
import { CampaignPanel, ObjectiveTracker } from './campaign-panel';
import { HamburgerButton } from './components/HamburgerButton';
import { CosmeticsPanel } from './cosmetics-panel';
import { ErrorOverlay } from './error-overlay';
import { EvacuationOverlay } from './evacuation-overlay';
import { GameOverBanner } from './game-over';
import { AdvisorToast } from './hud/AdvisorToast';
import { AbilityBar } from './hud/ability-bar';
import { AirdropButton } from './hud/airdrop-button';
import { CtrlGroups } from './hud/ctrl-groups';
import { Overlays } from './hud/overlays';
import { KeyboardReference } from './keyboard-reference';
import { LeaderboardPanel } from './leaderboard-panel';
import { MainMenu } from './main-menu';
import { NewGameModal } from './new-game-modal';
import { SettingsOverlay } from './overlays/SettingsOverlay';
import { CommandPanel } from './panel/CommandPanel';
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
      (async () => {
        try {
          await onMount(refs);
        } catch (err) {
          // biome-ignore lint/suspicious/noConsole: surface init failures
          console.error('Failed to initialize game', err);
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

      {/* Advisor toast — bottom-left HUD, above safe area */}
      <AdvisorToast />

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

      {/* Tabbed command panel */}
      <CommandPanel minimapCanvasRef={minimapCanvasRef} minimapCamRef={minimapCamRef} />

      {/* Tooltip */}
      {store.tooltipVisible.value && store.tooltipData.value && (
        <div
          class="tooltip"
          style={{ left: `${store.tooltipX.value}px`, top: `${store.tooltipY.value}px` }}
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
