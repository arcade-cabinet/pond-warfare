/**
 * Population & Timers Sync
 *
 * Computes food population, idle worker count, army count, peace timer,
 * time display, game-over stats, wave countdown, enemy economy visibility,
 * resource rate tracking, and global production queue. Writes results to
 * the UI store signals.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import { DAY_FRAMES, EXPLORED_SCALE, TRAIN_TIMER, WAVE_INTERVAL } from '@/constants';
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
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

/** Track previous low-resource state to fire alert only on threshold crossing. */
let _prevLowClams = false;
let _prevLowTwigs = false;
let _prevPeaceWarningPlayed = false;
/** Guard to ensure permadeath save deletion only fires once. */
let _permadeathDeleteFired = false;

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
  w.autoBehaviors.build = store.autoBuildEnabled.value;
  w.autoBehaviors.defend = store.autoDefendEnabled.value;
  w.autoBehaviors.attack = store.autoAttackEnabled.value;
  w.autoBehaviors.heal = store.autoHealEnabled.value;
  w.autoBehaviors.scout = store.autoScoutEnabled.value;

  const nowLowClams = w.resources.clams < 100;
  const nowLowTwigs = w.resources.twigs < 50;
  store.lowClams.value = nowLowClams;
  store.lowTwigs.value = nowLowTwigs;

  // Audio alert on threshold crossing (fire once, not every frame)
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

  // --- Food population system (POC lines 1261-1270) ---
  // Count current population (all player non-building non-resource entities)
  // and max food capacity (sum of foodProvided from completed lodges/burrows)
  const allEntsForFood = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let curFood = 0;
  let maxFoodCap = 0;
  let idleWorkers = 0;
  let armyUnits = 0;

  // Per-type idle counts for contextual auto-behavior menu
  let idleGatherers = 0;
  let idleCombat = 0;
  let idleHealers = 0;
  let idleScouts = 0;

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
      const isIdle = UnitStateMachine.state[eid] === UnitState.Idle;
      if (kind === EntityKind.Gatherer) {
        if (isIdle) {
          idleWorkers++;
          idleGatherers++;
        }
      } else if (kind === EntityKind.Healer) {
        armyUnits++;
        if (isIdle) idleHealers++;
      } else {
        // Combat units (including Scouts): Attack/Defend apply to all
        armyUnits++;
        if (isIdle) {
          idleCombat++;
          // Scout eligibility matches auto-behavior: any unit with speed >= 2.0
          if (hasComponent(w.ecs, eid, Velocity) && Velocity.speed[eid] >= 2.0) {
            idleScouts++;
          }
        }
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
  store.idleWorkerCount.value = idleWorkers + idleCombat + idleHealers;
  store.armyCount.value = armyUnits;

  // Per-type idle counts for contextual auto-behavior menu
  store.idleGathererCount.value = idleGatherers;
  store.idleCombatCount.value = idleCombat;
  store.idleHealerCount.value = idleHealers;
  store.idleScoutCount.value = idleScouts;

  // Track peak army
  if (armyUnits > w.stats.peakArmy) {
    w.stats.peakArmy = armyUnits;
  }

  // --- Peace timer display ---
  const peaceful = w.frameCount < w.peaceTimer;
  store.isPeaceful.value = peaceful;
  if (peaceful) {
    const peaceSecondsLeft = Math.ceil((w.peaceTimer - w.frameCount) / 60);
    store.peaceCountdown.value = peaceSecondsLeft;

    // Peace warning: show alert banner when < 30 seconds remain
    if (peaceSecondsLeft <= 30 && peaceSecondsLeft > 0) {
      store.peaceWarningCountdown.value = peaceSecondsLeft;
      // Tension audio cue: play once at the 30-second mark
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

  // Reset permadeath guard when not in game-over (new game started)
  if (w.state !== 'win' && w.state !== 'lose') {
    _permadeathDeleteFired = false;
  }

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

    store.goMapSeed.value = w.mapSeed;

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

    // Permadeath: delete save on loss (guard to run only once)
    if (w.state === 'lose' && w.permadeath && !_permadeathDeleteFired) {
      _permadeathDeleteFired = true;
      store.hasSaveGame.value = false;
      import('@/storage')
        .then(({ getLatestSave, deleteSave }) =>
          getLatestSave().then((save) => {
            if (save) return deleteSave(save.id);
          }),
        )
        .catch(() => {
          /* best-effort cleanup */
        });
    }
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

  // Base under attack detection: enemies within 400px of any player Lodge
  const BASE_THREAT_RADIUS = 400;
  const BASE_THREAT_RADIUS_SQ = BASE_THREAT_RADIUS * BASE_THREAT_RADIUS;
  let baseAttacked = false;

  // Find player lodges and enemy positions from allEntsForFood (already queried above)
  const lodgePositions: { x: number; y: number }[] = [];
  const enemyPositions: { x: number; y: number }[] = [];

  for (let i = 0; i < allEntsForFood.length; i++) {
    const eid = allEntsForFood[i];
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;

    if (kind === EntityKind.Lodge && faction === Faction.Player) {
      lodgePositions.push({ x: Position.x[eid], y: Position.y[eid] });
    } else if (
      faction === Faction.Enemy &&
      !hasComponent(w.ecs, eid, IsBuilding) &&
      !hasComponent(w.ecs, eid, IsResource)
    ) {
      enemyPositions.push({ x: Position.x[eid], y: Position.y[eid] });
    }
  }

  for (const lodge of lodgePositions) {
    for (const enemy of enemyPositions) {
      const dx = lodge.x - enemy.x;
      const dy = lodge.y - enemy.y;
      if (dx * dx + dy * dy < BASE_THREAT_RADIUS_SQ) {
        baseAttacked = true;
        break;
      }
    }
    if (baseAttacked) break;
  }

  store.baseUnderAttack.value = baseAttacked;

  // --- Objective tracking: enemy nest counts ---
  // Count alive PredatorNests each frame. totalEnemyNests is set once
  // (on first non-zero observation) so that the HUD shows "0/N" from the start.
  let aliveNests = 0;
  for (let i = 0; i < allEntsForFood.length; i++) {
    const eid = allEntsForFood[i];
    if (EntityTypeTag.kind[eid] !== EntityKind.PredatorNest) continue;
    if (Health.current[eid] > 0) aliveNests++;
  }

  // Track peak nest count (new nests can spawn via evolution, so don't freeze at first count)
  if (aliveNests > store.totalEnemyNests.value) {
    store.totalEnemyNests.value = aliveNests;
  }

  const total = store.totalEnemyNests.value;
  const newDestroyed = total > 0 ? total - aliveNests : 0;

  // Detect moment of destruction for pulse feedback
  if (newDestroyed > store.destroyedEnemyNests.value) {
    store.nestJustDestroyed.value = true;
    // Clear the pulse after ~3 seconds (180 frames at 60fps)
    setTimeout(() => {
      store.nestJustDestroyed.value = false;
    }, 3000);
  }
  store.destroyedEnemyNests.value = newDestroyed;

  return { idleWorkers, armyUnits, maxFoodCap };
}
