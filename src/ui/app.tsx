/** Root Preact component -- thin routing shell between menu and game screens. */

import { entityExists, hasComponent } from 'bitecs';
import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { Health, Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import {
  handleClamsChange,
  handlePearlBack,
  handlePearlStateChange,
  handleRankUpCancel,
  handleRankUpConfirm,
  handleRewardsPlayAgain,
  handleRewardsRankUp,
  handleRewardsUpgrades,
  handleUpgradesBack,
} from './app-v3-handlers';
import { SvgFilters } from './components/SvgFilters';
import { SwampEcosystem } from './components/SwampEcosystem';
import { Tooltip } from './components/Tooltip';
import { ErrorOverlay } from './error-overlay';
import { EvacuationOverlay } from './evacuation-overlay';
import { GameOverBanner } from './game-over';
import { AchievementToast } from './hud/AchievementToast';
import { AbilityBar } from './hud/ability-bar';
import { AirdropButton } from './hud/airdrop-button';
import { ConnectionStatus } from './hud/ConnectionStatus';
import { CtrlGroups } from './hud/ctrl-groups';
import { Overlays } from './hud/overlays';
import { WeatherEffects } from './hud/WeatherEffects';
import { KeyboardReference } from './keyboard-reference';
import { LoadingScreen } from './LoadingScreen';
import { MainMenu } from './main-menu';
import { DisconnectOverlay } from './overlays/DisconnectOverlay';
import { SettingsOverlay } from './overlays/SettingsOverlay';
import { SplashVideo } from './SplashVideo';
import { PearlUpgradeScreen } from './screens/PearlUpgradeScreen';
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
    minimapCanvas: HTMLCanvasElement;
    minimapCam: HTMLDivElement;
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
          console.error('Game init failed:', err);
        } finally {
          store.gameLoading.value = false;
        }
      })();
    }
  }, [onMount, store.menuState.value]);

  // ---------- Menu screen ----------
  if (store.menuState.value === 'main') {
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
        <SwampEcosystem />
        <SvgFilters />
        <ErrorOverlay />
        <MainMenu />
        <SettingsOverlay />
        {store.keyboardRefOpen.value && (
          <KeyboardReference
            onClose={() => {
              store.keyboardRefOpen.value = false;
            }}
          />
        )}

        {/* v3 overlay screens -- rendered on top of main menu */}
        {storeV3.upgradesScreenOpen.value && (
          <UpgradeWebScreen
            clams={storeV3.totalClams.value}
            onClamsChange={handleClamsChange}
            onBack={handleUpgradesBack}
          />
        )}
        {storeV3.pearlScreenOpen.value && (
          <PearlUpgradeScreen
            prestigeState={storeV3.prestigeState.value}
            onStateChange={handlePearlStateChange}
            onBack={handlePearlBack}
          />
        )}
      </div>
    );
  }

  // ---------- Splash video before new game ----------
  if (store.showSplashVideo.value) {
    return (
      <SplashVideo
        onComplete={() => {
          store.showSplashVideo.value = false;
          store.menuState.value = 'playing';
        }}
      />
    );
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

      {/* Fullscreen game container */}
      <div
        ref={containerRef}
        id="game-container"
        class="absolute inset-0 cursor-crosshair overflow-hidden bg-black"
      >
        <Overlays />
        <AirdropButton onAirdrop={act(() => game.useAirdrop())} />
        <AbilityBar
          onRallyCry={act(() => game.useRallyCry())}
          onPondBlessing={act(() => game.usePondBlessing())}
          onTidalSurge={act(() => game.useTidalSurge())}
          onCommanderAbility={act(() => game.useCommanderAbility())}
        />
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
      </div>

      <ConnectionStatus />
      <AchievementToast />

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
