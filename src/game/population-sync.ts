/**
 * Population & Timers Sync
 *
 * Thin orchestrator: delegates population counting, game-over stats, and
 * threat/objective syncing to focused sub-modules; keeps resource tracking,
 * peace timer, time display, and enemy-visibility logic here.
 *
 * v3: also syncs Lodge HP, wave number, wave-survival, and fortification state.
 *
 * Sub-modules:
 *   population-counter.ts - food/army/idle counts + Commander policy
 *   game-over-sync.ts     - victory/defeat stats + permadeath deletion
 *   threat-sync.ts        - wave countdown, production queue, base threat, nests
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { COMMANDER_ABILITIES } from '@/config/commanders';
import { DAY_FRAMES, EXPLORED_SCALE } from '@/constants';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { canUseCommanderAbility, getAbilityCooldownSeconds } from '@/game/commander-abilities';
import { EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';
import * as storeGameplay from '@/ui/store-gameplay';
import * as storeV3 from '@/ui/store-v3';
import { resetPermadeathGuard, syncGameOverStats } from './game-over-sync';
import { computePopulation, type PopulationResult } from './population-counter';
import { syncThreatAndObjectives } from './threat-sync';

export type { PopulationResult };

/** Track previous low-resource state to fire alert only on threshold crossing. */
let _prevLowFish = false;
let _prevLowLogs = false;
let _prevPeaceWarningPlayed = false;

/** Previous resource values for detecting directional changes. */
let _prevFish = 200;
let _prevLogs = 50;
let _prevRocks = 0;
let _prevFood = 0;

/**
 * Sync population counts, timers, game-over stats, and related UI signals.
 * Returns computed values needed by other sync functions.
 */
export function syncPopulationAndTimers(
  world: GameWorld,
  exploredCtx: CanvasRenderingContext2D | null,
): PopulationResult {
  const w = world;
  store.fish.value = w.resources.fish;
  store.logs.value = w.resources.logs;
  store.rocks.value = w.resources.rocks;

  // Directional resource change tracking for HUD flash
  const dFish = w.resources.fish - _prevFish;
  const dLogs = w.resources.logs - _prevLogs;
  const dRocks = w.resources.rocks - _prevRocks;
  if (dFish !== 0 || dLogs !== 0 || dRocks !== 0) {
    store.lastResourceChange.value = {
      fish: dFish,
      logs: dLogs,
      rocks: dRocks,
      frame: w.frameCount,
    };
  }
  _prevFish = w.resources.fish;
  _prevLogs = w.resources.logs;
  _prevRocks = w.resources.rocks;

  // Resource income rate tracking: compute per-second deltas every 60 frames
  if (w.frameCount > 0 && w.frameCount % 60 === 0) {
    w.resTracker.rateFish = w.resources.fish - w.resTracker.lastFish;
    w.resTracker.rateLogs = w.resources.logs - w.resTracker.lastLogs;
    w.resTracker.lastFish = w.resources.fish;
    w.resTracker.lastLogs = w.resources.logs;
  }
  store.rateFish.value = w.resTracker.rateFish;
  store.rateLogs.value = w.resTracker.rateLogs;

  // Enemy economy: sync resource counts
  store.enemyFish.value = w.enemyResources.fish;
  store.enemyLogs.value = w.enemyResources.logs;

  // Enemy economy visibility: check if any PredatorNest is in an explored area
  if (!store.enemyEconomyVisible.value && exploredCtx) {
    const nestEnts = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
    for (let i = 0; i < nestEnts.length; i++) {
      const eid = nestEnts[i];
      if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.PredatorNest) continue;
      if (Health.current[eid] <= 0) continue;
      const epx = Math.floor(Position.x[eid] / EXPLORED_SCALE);
      const epy = Math.floor(Position.y[eid] / EXPLORED_SCALE);
      const ew = exploredCtx.canvas.width;
      const eh = exploredCtx.canvas.height;
      if (epx >= 0 && epx < ew && epy >= 0 && epy < eh) {
        const pixel = exploredCtx.getImageData(epx, epy, 1, 1).data;
        if (pixel[0] >= 10) {
          store.enemyEconomyVisible.value = true;
          break;
        }
      }
    }
  }

  store.gameSpeed.value = w.gameSpeed;
  // Delay showing game-over UI until spectacle finishes
  store.gameState.value = w.gameEndSpectacleActive ? 'playing' : w.state;
  store.paused.value = w.paused;
  store.attackMoveActive.value = w.attackMoveMode;

  const nowLowFish = w.resources.fish < 100;
  const nowLowLogs = w.resources.logs < 50;
  store.lowFish.value = nowLowFish;
  store.lowLogs.value = nowLowLogs;
  if (nowLowFish && !_prevLowFish) {
    audio.alert();
  }
  if (nowLowLogs && !_prevLowLogs) {
    audio.alert();
  }
  _prevLowFish = nowLowFish;
  _prevLowLogs = nowLowLogs;

  // --- Control group counts ---
  const groupCounts: Record<number, number> = {};
  for (const [gnum, eids] of Object.entries(w.ctrlGroups)) {
    const alive = eids.filter((eid) => Health.current[eid] > 0);
    if (alive.length > 0) {
      groupCounts[Number(gnum)] = alive.length;
    }
  }
  store.ctrlGroupCounts.value = groupCounts;

  // --- v3: Lodge HP + fortification sync (every 30 frames to avoid per-frame query cost) ---
  if (w.frameCount % 30 === 0) {
    syncLodgeHp(w);
    if (w.fortifications) {
      storeV3.fortificationSlots.value = w.fortifications.slots;
    }
  }

  // --- Commander ability state (for HUD button) ---
  const ability = COMMANDER_ABILITIES[w.commanderId];
  storeGameplay.commanderAbilityReady.value = canUseCommanderAbility(w);
  storeGameplay.commanderAbilityCooldown.value = getAbilityCooldownSeconds(w);
  storeGameplay.commanderAbilityActive.value = w.commanderAbilityActiveUntil > w.frameCount;
  storeGameplay.commanderAbilityName.value = ability?.name ?? '';

  // --- v3: Wave number + wave-survival mode sync ---
  storeV3.currentWaveNumber.value = w.waveNumber;
  storeV3.waveSurvivalMode.value = w.waveSurvivalMode;
  storeV3.waveSurvivalTarget.value = w.waveSurvivalTarget;

  // --- Population, army, idle counts (delegated) ---
  const popResult = computePopulation(w);

  // Food/population change tracking for HUD flash
  const curFood = store.food.value;
  if (curFood !== _prevFood) {
    store.lastFoodChange.value = { delta: curFood - _prevFood, frame: w.frameCount };
  }
  _prevFood = curFood;

  // --- Peace timer display ---
  const peaceful = w.frameCount < w.peaceTimer;
  store.isPeaceful.value = peaceful;
  if (peaceful) {
    const peaceSecondsLeft = Math.ceil((w.peaceTimer - w.frameCount) / 60);
    store.peaceCountdown.value = peaceSecondsLeft;
    if (peaceSecondsLeft <= 30 && peaceSecondsLeft > 0) {
      store.peaceWarningCountdown.value = peaceSecondsLeft;
      if (!_prevPeaceWarningPlayed) {
        audio.alert();
        _prevPeaceWarningPlayed = true;
      }
    } else {
      store.peaceWarningCountdown.value = -1;
      _prevPeaceWarningPlayed = false;
    }
  } else {
    store.peaceCountdown.value = -1;
    store.peaceWarningCountdown.value = -1;
    _prevPeaceWarningPlayed = false;
  }

  // --- Time display ---
  const totalMinutes = w.timeOfDay;
  const displayHours = Math.floor(totalMinutes / 60) % 24;
  const displayMinutes = Math.floor(totalMinutes) % 60;
  const day = Math.floor(w.frameCount / DAY_FRAMES) + 1;
  store.gameDay.value = day;
  store.gameTimeDisplay.value = `Day ${day} - ${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;

  // Reset permadeath guard on new game
  if (w.state !== 'win' && w.state !== 'lose') resetPermadeathGuard();

  // --- Game-over stats (delegated) ---
  syncGameOverStats(w);

  // --- Threat state, wave countdown, production queue, nests (delegated) ---
  syncThreatAndObjectives(w);

  return popResult;
}

/** Sync the player Lodge HP to v3 store signals. */
function syncLodgeHp(w: GameWorld): void {
  const buildings = query(w.ecs, [IsBuilding, FactionTag, EntityTypeTag, Health]);
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (
      FactionTag.faction[eid] === Faction.Player &&
      (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Lodge &&
      Health.current[eid] > 0
    ) {
      storeV3.lodgeHp.value = Health.current[eid];
      storeV3.lodgeMaxHp.value = Health.max[eid];
      return;
    }
  }
  // Lodge not found (destroyed)
  storeV3.lodgeHp.value = 0;
}
