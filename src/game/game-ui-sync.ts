/**
 * Game UI Sync -- pushes world state into Preact signal store.
 */

import { audio } from '@/audio/audio-system';
import type { GameWorld } from '@/ecs/world';
import { buildActionPanel } from '@/game/action-panel';
import { syncPopulationAndTimers } from '@/game/population-sync';
import { syncSelectionInfo } from '@/game/selection-sync';
import { hasPlayerUnitsSelected } from '@/input/selection/queries';
import type { ReplayRecorder } from '@/replay';
import { checkAchievements } from '@/systems/achievements';
import * as store from '@/ui/store';

export interface UISyncState {
  world: GameWorld;
  audioInitialized: boolean;
  wasPeaceful: boolean;
  wasGameOver: boolean;
  recorder: ReplayRecorder;
  exploredCtx: CanvasRenderingContext2D | null;
}

/** Sync game world state to reactive UI store. */
export function syncUIStore(state: UISyncState): void {
  const w = state.world;

  const { idleGeneralists, armyUnits, maxFoodCap } = syncPopulationAndTimers(
    w,
    state.exploredCtx,
  );

  store.muted.value = audio.muted;
  store.hasPlayerUnits.value = hasPlayerUnitsSelected(w);

  // Music transitions on peace/hunting change
  const peaceful = w.frameCount < w.peaceTimer;
  if (state.audioInitialized) {
    if (state.wasPeaceful && !peaceful) {
      audio.startMusic(false);
    }
    state.wasPeaceful = peaceful;
    audio.updateAmbient(w.ambientDarkness);
  }

  // Game over: stop music (once), check achievements
  if ((w.state === 'win' || w.state === 'lose') && state.audioInitialized && !state.wasGameOver) {
    audio.stopMusic();
    state.wasGameOver = true;
    checkAchievements(w).catch(() => {
      /* best-effort */
    });
  }

  // Selection info
  syncSelectionInfo(w, idleGeneralists, armyUnits, maxFoodCap);

  // Action panel buttons and queue
  buildActionPanel(w, state.recorder);

  // Active ability signals sync
  store.rallyCryAvailable.value = !!w.tech.swiftPaws;
  store.rallyCryActive.value = w.rallyCryExpiry > 0 && w.frameCount < w.rallyCryExpiry;
  store.rallyCryCooldown.value =
    w.rallyCryCooldownUntil > w.frameCount
      ? Math.ceil((w.rallyCryCooldownUntil - w.frameCount) / 60)
      : 0;
  store.pondBlessingAvailable.value =
    !!w.tech.pondBlessing && w.frameCount >= w.pondBlessingCooldownUntil;
  store.tidalSurgeAvailable.value = !!w.tech.tidalSurge && !w.tidalSurgeUsed;
}
