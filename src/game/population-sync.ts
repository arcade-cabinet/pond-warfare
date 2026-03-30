/**
 * Population & Timers Sync
 *
 * Thin orchestrator: delegates population counting, game-over stats, and
 * threat/objective syncing to focused sub-modules; keeps resource tracking,
 * peace timer, time display, and enemy-visibility logic here.
 *
 * Sub-modules:
 *   population-counter.ts – food/army/idle counts + Commander policy
 *   game-over-sync.ts     – victory/defeat stats + permadeath deletion
 *   threat-sync.ts        – wave countdown, production queue, base threat, nests
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { DAY_FRAMES, EXPLORED_SCALE } from '@/constants';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import { resetPermadeathGuard, syncGameOverStats } from './game-over-sync';
import { computePopulation, type PopulationResult } from './population-counter';
import { syncThreatAndObjectives } from './threat-sync';

export type { PopulationResult };

/** Track previous low-resource state to fire alert only on threshold crossing. */
let _prevLowClams = false;
let _prevLowTwigs = false;
let _prevPeaceWarningPlayed = false;

/**
 * Sync population counts, timers, game-over stats, and related UI signals.
 * Returns computed values needed by other sync functions.
 */
export function syncPopulationAndTimers(
  world: GameWorld,
  exploredCtx: CanvasRenderingContext2D | null,
): PopulationResult {
  const w = world;
  store.clams.value = w.resources.clams;
  store.twigs.value = w.resources.twigs;
  store.pearls.value = w.resources.pearls;

  // Resource income rate tracking: compute per-second deltas every 60 frames
  if (w.frameCount > 0 && w.frameCount % 60 === 0) {
    w.resTracker.rateClams = w.resources.clams - w.resTracker.lastClams;
    w.resTracker.rateTwigs = w.resources.twigs - w.resTracker.lastTwigs;
    w.resTracker.lastClams = w.resources.clams;
    w.resTracker.lastTwigs = w.resources.twigs;
  }
  store.rateClams.value = w.resTracker.rateClams;
  store.rateTwigs.value = w.resTracker.rateTwigs;

  // Enemy economy: sync resource counts
  store.enemyClams.value = w.enemyResources.clams;
  store.enemyTwigs.value = w.enemyResources.twigs;

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
  store.gameState.value = w.state;
  store.paused.value = w.paused;
  store.attackMoveActive.value = w.attackMoveMode;

  // Sync auto-behavior toggles from UI store into game world
  w.autoBehaviors.gather = store.autoGatherEnabled.value;
  w.autoBehaviors.build = store.autoBuildEnabled.value;
  w.autoBehaviors.defend = store.autoDefendEnabled.value;
  w.autoBehaviors.attack = store.autoAttackEnabled.value;
  w.autoBehaviors.heal = store.autoHealEnabled.value;
  w.autoBehaviors.scout = store.autoScoutEnabled.value;

  const nowLowClams = w.resources.clams < 100;
  const nowLowTwigs = w.resources.twigs < 50;
  store.lowClams.value = nowLowClams;
  store.lowTwigs.value = nowLowTwigs;
  if (nowLowClams && !_prevLowClams) {
    audio.alert();
  }
  if (nowLowTwigs && !_prevLowTwigs) {
    audio.alert();
  }
  _prevLowClams = nowLowClams;
  _prevLowTwigs = nowLowTwigs;

  // --- Control group counts ---
  const groupCounts: Record<number, number> = {};
  for (const [gnum, eids] of Object.entries(w.ctrlGroups)) {
    const alive = eids.filter((eid) => Health.current[eid] > 0);
    if (alive.length > 0) {
      groupCounts[Number(gnum)] = alive.length;
    }
  }
  store.ctrlGroupCounts.value = groupCounts;

  // --- Population, army, idle counts (delegated) ---
  const popResult = computePopulation(w);

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
