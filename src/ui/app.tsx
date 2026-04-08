/** Root Preact component -- thin routing shell between menu and game screens. */

import { entityExists, hasComponent } from 'bitecs';
import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { Health, Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import { handleGameInitFailure } from './game-init-failure';
import {
  handleClamsChange,
  handleClamUpgradeContinue,
  handleCurrentRunUpgradeStateChange,
  handleRankUpCancel,
  handleRankUpConfirm,
  handleRewardsPlayAgain,
  handleRewardsRankUp,
  handleRewardsUpgrades,
} from './app-v3-handlers';
import {
  openKeyboardRef,
  openSettings,
  quickLoad,
  quickSave,
  toggleColorBlind,
  togglePanel,
} from './game-actions';
import { CommandPanel } from './command-panel';
import { SvgFilters } from './components/SvgFilters';
import { Tooltip } from './components/Tooltip';
import { ErrorOverlay } from './error-overlay';
import { EvacuationOverlay } from './evacuation-overlay';
import { GameOverBanner } from './game-over';
import { AbilityButtons } from './hud/AbilityButtons';
import { AchievementToast } from './hud/AchievementToast';
import { CommanderAbility } from './hud/CommanderAbility';
import { ConnectionStatus } from './hud/ConnectionStatus';
import { CtrlGroups } from './hud/ctrl-groups';
import { EventAlert } from './hud/EventAlert';
import { OnboardingHint } from './hud/OnboardingHint';
import { Overlays } from './hud/overlays';
import { TopBar } from './hud/top-bar';
import { WeatherEffects } from './hud/WeatherEffects';
import { KeyboardReference } from './keyboard-reference';
import { LoadingScreen } from './LoadingScreen';
import { MenuScreen } from './menu-screen';
import { DisconnectOverlay } from './overlays/DisconnectOverlay';
import { SettingsOverlay } from './overlays/SettingsOverlay';
import { dispatchRadialAction } from './radial-actions';
import { RadialMenu } from './radial-menu';
import { RankUpModal } from './screens/RankUpModal';
import { RewardsScreen } from './screens/RewardsScreen';
import { UpgradeWebScreen } from './screens/UpgradeWebScreen';
import * as store from './store';
import * as storeV3 from './store-v3';

export interface AppProps {
  onMount: (refs: {
    container: HTMLDivElement;
    gameCanvas: HTMLCanvasElement;
    fogCanvas: HTMLCanvasElement;
    lightCanvas: HTMLCanvasElement;
    dayNightOverlay: HTMLDivElement;
  }) => void | Promise<void>;
}

/** Helper: call a game action and sync UI. */
function act(fn: () => void) {
  return () => {
    fn();
    game.syncUIStore();
  };
}

export function App({ onMount }: AppProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  const lightCanvasRef = useRef<HTMLCanvasElement>(null);
  const dayNightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (store.menuState.value !== 'playing') return;
    if (
      containerRef.current &&
      gameCanvasRef.current &&
      fogCanvasRef.current &&
      lightCanvasRef.current &&
      dayNightRef.current
    ) {
      const refs = {
        container: containerRef.current,
        gameCanvas: gameCanvasRef.current,
        fogCanvas: fogCanvasRef.current,
        lightCanvas: lightCanvasRef.current,
        dayNightOverlay: dayNightRef.current,
      };
      store.gameLoading.value = true;
      (async () => {
        try {
          await onMount(refs);
        } catch (err) {
          handleGameInitFailure(err);
        } finally {
          store.gameLoading.value = false;
        }
      })();
    }
  }, [onMount, store.menuState.value]);

  // ---------- Menu screen ----------
  if (store.menuState.value === 'main') {
    return <MenuScreen />;
  }

  // ---------- Game screen ----------
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
      <SvgFilters />
      <ErrorOverlay />

      {/* Resource HUD top bar */}
      <TopBar
        onSpeedClick={act(() => game.cycleSpeed())}
        onMuteClick={act(() => audio.toggleMute())}
        onPauseClick={act(() => {
          game.world.paused = !game.world.paused;
        })}
        onColorBlindToggle={toggleColorBlind}
        onSaveClick={quickSave}
        onLoadClick={quickLoad}
        onSettingsClick={openSettings}
        onKeyboardRefClick={openKeyboardRef}
        onPanelToggle={togglePanel}
      />

      {/* Fullscreen game container */}
      <div
        ref={containerRef}
        id="game-container"
        class="absolute inset-0 cursor-crosshair overflow-hidden bg-black"
      >
        <Overlays />
        <CtrlGroups
          onCtrlGroupClick={(group) => {
            const w = game.world;
            const g = w.ctrlGroups[group];
            if (!g || g.length === 0) return;
            const alive = g.filter((eid) => entityExists(w.ecs, eid) && Health.current[eid] > 0);
            w.ctrlGroups[group] = alive;
            if (alive.length === 0) return;
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
            game.smoothPanTo(cx / alive.length, cy / alive.length);
            store.lastRecalledGroup.value = group;
            audio.selectUnit();
            game.syncUIStore();
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
        <WeatherEffects />
        <GameOverBanner onRestart={() => window.location.reload()} />
        <EvacuationOverlay
          onChoice={(choice) => {
            game.handleEvacuationChoice(choice);
          }}
        />
        {/* Radial menu -- contextual actions for Lodge and units */}
        <RadialMenu onAction={dispatchRadialAction} />
      </div>
      <CommandPanel
        onClose={() => {
          store.mobilePanelOpen.value = false;
        }}
      />

      <ConnectionStatus />
      <AchievementToast />
      <EventAlert />
      <CommanderAbility onActivate={() => game.useCommanderAbility()} />
      <AbilityButtons
        onRallyCry={() => game.useRallyCry()}
        onPondBlessing={() => game.usePondBlessing()}
        onTidalSurge={() => game.useTidalSurge()}
      />
      <OnboardingHint />

      {/* Modal overlays -- siblings of #game-container for proper touch-action */}
      <SettingsOverlay />
      {store.keyboardRefOpen.value && (
        <KeyboardReference
          onClose={() => {
            store.keyboardRefOpen.value = false;
          }}
        />
      )}
      <DisconnectOverlay />
      <Tooltip />
      {store.gameLoading.value && <LoadingScreen />}

      {/* v3 post-match screens -- rendered over game when active */}
      {storeV3.rewardsScreenOpen.value && storeV3.lastRewardBreakdown.value && (
        <RewardsScreen
          breakdown={storeV3.lastRewardBreakdown.value}
          kills={0}
          eventsCompleted={storeV3.matchEventsCompleted.value}
          resourcesGathered={0}
          durationSeconds={0}
          canRankUp={storeV3.canRankUpAfterMatch.value}
          prestigeRank={storeV3.prestigeRank.value}
          onRankUp={handleRewardsRankUp}
          onUpgrades={handleRewardsUpgrades}
          onPlayAgain={handleRewardsPlayAgain}
        />
      )}
      {storeV3.clamUpgradeScreenOpen.value && (
        <UpgradeWebScreen
          clams={storeV3.totalClams.value}
          onClamsChange={handleClamsChange}
          purchasedNodeIds={storeV3.currentRunPurchasedNodeIds.value}
          purchasedDiamondIds={storeV3.currentRunPurchasedDiamondIds.value}
          startingTierRank={storeV3.startingTierRank.value}
          onUpgradeStateChange={handleCurrentRunUpgradeStateChange}
          onBack={handleClamUpgradeContinue}
        />
      )}
      {storeV3.rankUpModalOpen.value && (
        <RankUpModal
          prestigeState={storeV3.prestigeState.value}
          progressionLevel={storeV3.progressionLevel.value}
          onConfirm={handleRankUpConfirm}
          onCancel={handleRankUpCancel}
        />
      )}
    </div>
  );
}
