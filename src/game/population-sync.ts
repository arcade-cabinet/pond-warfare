/**
 * Population & Timers Sync
 *
 * Computes food population, idle worker count, army count, peace timer,
 * time display, game-over stats, wave countdown, enemy economy visibility,
 * resource rate tracking, and global production queue. Writes results to
 * the UI store signals.
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import {
  DAY_FRAMES,
  EXPLORED_SCALE,
  TRAIN_TIMER,
  WAVE_INTERVAL,
} from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

export interface PopulationResult {
  idleWorkers: number;
  armyUnits: number;
  maxFoodCap: number;
}

/**
 * Sync population counts, timers, game-over stats, and related UI signals.
 * Returns computed values needed by other sync functions (selection-sync, action-panel-builder).
 */
export function syncPopulationAndTimers(
  world: GameWorld,
  exploredCtx: CanvasRenderingContext2D | null,
): PopulationResult {
  const w = world;
  store.clams.value = w.resources.clams;
  store.twigs.value = w.resources.twigs;

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
      if (EntityTypeTag.kind[eid] !== EntityKind.PredatorNest) continue;
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
  w.autoBehaviors.defend = store.autoDefendEnabled.value;
  w.autoBehaviors.attack = store.autoAttackEnabled.value;
  w.autoBehaviors.scout = store.autoScoutEnabled.value;

  store.lowClams.value = w.resources.clams < 50;
  store.lowTwigs.value = w.resources.twigs < 50;

  // --- Control group counts ---
  const groupCounts: Record<number, number> = {};
  for (const [gnum, eids] of Object.entries(w.ctrlGroups)) {
    const alive = eids.filter((eid) => Health.current[eid] > 0);
    if (alive.length > 0) {
      groupCounts[Number(gnum)] = alive.length;
    }
  }
  store.ctrlGroupCounts.value = groupCounts;

  // --- Food population system (POC lines 1261-1270) ---
  // Count current population (all player non-building non-resource entities)
  // and max food capacity (sum of foodProvided from completed lodges/burrows)
  const allEntsForFood = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let curFood = 0;
  let maxFoodCap = 0;
  let idleWorkers = 0;
  let armyUnits = 0;

  for (let i = 0; i < allEntsForFood.length; i++) {
    const eid = allEntsForFood[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;

    if (hasComponent(w.ecs, eid, IsBuilding)) {
      // Completed buildings with foodProvided contribute to max food
      if (Building.progress[eid] >= 100) {
        const def = ENTITY_DEFS[kind];
        if (def.foodProvided) {
          maxFoodCap += def.foodProvided;
        }
      }
    } else if (!hasComponent(w.ecs, eid, IsResource)) {
      // Non-building, non-resource player entities count as population
      curFood += ENTITY_DEFS[kind]?.foodCost ?? 1;
      if (kind === EntityKind.Gatherer) {
        if (UnitStateMachine.state[eid] === UnitState.Idle) {
          idleWorkers++;
        }
      } else {
        armyUnits++;
      }
    }
  }

  // Count food reserved by units currently in training queues so that
  // syncUIStore's entity-based recount doesn't lose the reservation made
  // when the player clicked "Train".
  let queuedFood = 0;
  const allTrainingBldgs = query(w.ecs, [TrainingQueue, FactionTag, IsBuilding]);
  for (let i = 0; i < allTrainingBldgs.length; i++) {
    const bEid = allTrainingBldgs[i];
    if (FactionTag.faction[bEid] !== Faction.Player) continue;
    const slots = trainingQueueSlots.get(bEid);
    if (!slots) continue;
    for (let qi = 0; qi < slots.length; qi++) {
      const def = ENTITY_DEFS[slots[qi] as EntityKind];
      queuedFood += def.foodCost ?? 1;
    }
  }

  w.resources.food = curFood + queuedFood;
  w.resources.maxFood = maxFoodCap;
  store.food.value = curFood + queuedFood;
  store.maxFood.value = maxFoodCap;
  store.idleWorkerCount.value = idleWorkers;
  store.armyCount.value = armyUnits;

  // Track peak army
  if (armyUnits > w.stats.peakArmy) {
    w.stats.peakArmy = armyUnits;
  }

  // --- Peace timer display ---
  const peaceful = w.frameCount < w.peaceTimer;
  store.isPeaceful.value = peaceful;
  if (peaceful) {
    store.peaceCountdown.value = Math.ceil((w.peaceTimer - w.frameCount) / 60);
  } else {
    store.peaceCountdown.value = -1;
  }

  // --- Time display ---
  const totalMinutes = w.timeOfDay;
  const displayHours = Math.floor(totalMinutes / 60) % 24;
  const displayMinutes = Math.floor(totalMinutes) % 60;
  const day = Math.floor(w.frameCount / DAY_FRAMES) + 1;
  store.gameDay.value = day;
  store.gameTimeDisplay.value = `Day ${day} - ${String(displayHours).padStart(2, '0')}:${String(displayMinutes).padStart(2, '0')}`;

  // Game over stats
  if (w.state === 'win' || w.state === 'lose') {
    store.goTitle.value = w.state === 'win' ? 'Victory' : 'Defeat';
    store.goTitleColor.value = w.state === 'win' ? 'text-amber-400' : 'text-red-500';
    store.goDesc.value =
      w.state === 'win' ? 'All predator nests destroyed!' : 'All lodges destroyed!';

    const days = Math.floor(w.frameCount / DAY_FRAMES);
    const remainFrames = w.frameCount % DAY_FRAMES;
    const hours = Math.floor((remainFrames / DAY_FRAMES) * 24);
    store.goTimeSurvived.value = `${days} day${days !== 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`;
    store.goFrameCount.value = w.frameCount;

    const statLines = [
      `Time: ${store.goTimeSurvived.value}`,
      `Kills: ${w.stats.unitsKilled}`,
      `Losses: ${w.stats.unitsLost}`,
      `Resources gathered: ${w.stats.resourcesGathered}`,
      `Buildings built: ${w.stats.buildingsBuilt}`,
      `Peak army: ${w.stats.peakArmy}`,
    ];
    store.goStatLines.value = statLines;
    store.goStatsText.value = statLines.join(' | ');

    // Performance rating: 1-3 stars
    const daysSurvived = Math.max(1, days);
    const killRatio = w.stats.unitsLost > 0 ? w.stats.unitsKilled / w.stats.unitsLost : 10;
    let stars = 1;
    if (w.state === 'win') {
      stars = 2;
      if (daysSurvived <= 10 && killRatio >= 2) stars = 3;
      else if (daysSurvived <= 20 || killRatio >= 1.5) stars = 2;
    } else {
      if (daysSurvived >= 10 && killRatio >= 1) stars = 2;
      if (daysSurvived >= 20 && killRatio >= 2) stars = 3;
    }
    store.goRating.value = stars;
  }

  // Wave countdown timer
  if (w.frameCount >= w.peaceTimer) {
    const framesSinceLastWave = w.frameCount % WAVE_INTERVAL;
    const framesUntilNext = WAVE_INTERVAL - framesSinceLastWave;
    store.waveCountdown.value = Math.ceil(framesUntilNext / 60);
  } else {
    store.waveCountdown.value = -1;
  }

  // Global production queue
  const trainingBuildings = query(w.ecs, [
    Position,
    TrainingQueue,
    Building,
    FactionTag,
    IsBuilding,
    Health,
  ]);
  const prodQueue: store.QueueItem[] = [];
  for (let i = 0; i < trainingBuildings.length; i++) {
    const eid = trainingBuildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const slots = trainingQueueSlots.get(eid) ?? [];
    if (slots.length === 0) continue;
    const unitKind = slots[0] as EntityKind;
    const progress = Math.max(
      0,
      Math.min(100, ((TRAIN_TIMER - TrainingQueue.timer[eid]) / TRAIN_TIMER) * 100),
    );
    prodQueue.push({
      buildingKind: EntityTypeTag.kind[eid],
      unitLabel: entityKindName(unitKind),
      progress,
      entityId: eid,
    });
  }
  store.globalProductionQueue.value = prodQueue;

  return { idleWorkers, armyUnits, maxFoodCap };
}
