/**
 * Game UI Sync – pushes world state into Preact signal store.
 */

import { audio } from '@/audio/audio-system';
import type { CampaignState } from '@/campaign';
import type { GameWorld } from '@/ecs/world';
import { buildActionPanel } from '@/game/action-panel';
import { syncPopulationAndTimers } from '@/game/population-sync';
import { syncSelectionInfo } from '@/game/selection-sync';
import { hasPlayerUnitsSelected } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import { checkAchievements } from '@/systems/achievements';
import { updateProfileAndCheckUnlocks } from '@/systems/unlock-tracker';
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

  const { idleWorkers, armyUnits, maxFoodCap } = syncPopulationAndTimers(w, state.exploredCtx);

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

  // Game over: stop music (once), check achievements, update profile/unlocks
  if ((w.state === 'win' || w.state === 'lose') && state.audioInitialized && !state.wasGameOver) {
    audio.stopMusic();
    state.wasGameOver = true;
    checkAchievements(w).catch(() => {
      /* best-effort */
    });
    updateProfileAndCheckUnlocks(w).catch(() => {
      /* best-effort */
    });
  }

  // Selection info
  syncSelectionInfo(w, idleWorkers, armyUnits, maxFoodCap);

  // Action panel buttons and queue
  buildActionPanel(w, state.recorder);

  // Active ability signals sync
  store.rallyCryAvailable.value = w.tech.rallyCry;
  store.rallyCryActive.value = w.rallyCryExpiry > 0 && w.frameCount < w.rallyCryExpiry;
  store.rallyCryCooldown.value =
    w.rallyCryCooldownUntil > w.frameCount
      ? Math.ceil((w.rallyCryCooldownUntil - w.frameCount) / 60)
      : 0;
  store.pondBlessingAvailable.value = w.tech.pondBlessing && !w.pondBlessingUsed;
  store.tidalSurgeAvailable.value = w.tech.tidalSurge && !w.tidalSurgeUsed;

  // Campaign objective status sync
  const campaign = (w as GameWorld & { campaign?: CampaignState }).campaign;
  if (campaign?.mission) {
    const statuses: Record<string, boolean> = {};
    for (const [id, done] of campaign.objectiveStatus) {
      statuses[id] = done;
    }
    store.campaignObjectiveStatuses.value = statuses;
  }
}
