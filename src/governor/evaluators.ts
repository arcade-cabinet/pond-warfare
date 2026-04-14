/**
 * Goal Evaluators — Score functions for the Governor brain.
 *
 * Each evaluator calculates a desirability score (0-1) based on
 * store signals, then sets the corresponding goal when selected.
 */

import { type GameEntity, GoalEvaluator } from 'yuka';
import { ENTITY_DEFS, isWingBuilding } from '@/config/entity-defs';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import {
  AttackGoal,
  countAvailableAttackers,
  countAvailableSiegeAttackers,
  MIN_ATTACK_ARMY,
} from './goals/attack-goal';
import { hasCurrentRunTrack } from './current-run-upgrades';
import { BuildGoal } from './goals/build-goal';
import { LODGE_REPAIR_LOG_COST } from '@/game/lodge-repair';
import { DefendGoal } from './goals/defend-goal';
import { canDefendWith } from './goals/combat-roster';
import { findIdleMudpaws, GatherGoal, needsGatherRebalance } from './goals/gather-goal';
import { TrainGoal } from './goals/train-goal';
import type { Governor } from './governor';
import { getGovernorCombatUnits, getGovernorGatherUnits } from './roster-units';
import {
  getGovernorCombatTarget,
  getGovernorMudpawTarget,
  getGovernorReservedBuildKind,
} from './train-policy';

function hasBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((b) => b.kind === kind);
}

function hasCompletedBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((b) => b.kind === kind && b.hp >= b.maxHp);
}

/**
 * Check if a wing-type building is present. For wing buildings (Armory, etc.),
 * presence in buildingRoster means the wing is unlocked on the Lodge.
 */
function hasWingOrBuilding(kind: EntityKind): boolean {
  if (isWingBuilding(kind)) {
    // Wing buildings appear in buildingRoster when the Lodge wing is unlocked
    return store.buildingRoster.value.some((b) => b.kind === kind);
  }
  return hasBuilding(kind);
}

function combatUnitCount(): number {
  return getGovernorCombatUnits(store.unitRoster.value).length;
}

function availableDefenderCount(): number {
  return getGovernorCombatUnits(store.unitRoster.value).filter(canDefendWith).length;
}

function frontlineCombatUnitCount(): number {
  return store.unitRoster.value
    .filter((group) => group.role === 'combat')
    .reduce((sum, group) => sum + group.units.length, 0);
}

function lodgeHpRatio(): number {
  const lodge = store.buildingRoster.value.find((b) => b.kind === EntityKind.Lodge);
  if (!lodge || lodge.maxHp <= 0) return 1;
  return lodge.hp / lodge.maxHp;
}

function nextWaveCountdown(): number | null {
  return store.waveCountdown.value === -1 ? null : store.waveCountdown.value;
}

function baseThreatCount(): number {
  return Math.max(0, Math.trunc(store.baseThreatCount.value || 0));
}

function lightPressureSkirmishWindow(totalArmy: number, readyArmy: number): boolean {
  const threats = baseThreatCount();
  const lodgeHp = lodgeHpRatio();
  const waveCountdown = nextWaveCountdown();
  const armorTrackActive = hasCurrentRunTrack('combat_armor');
  return (
    store.baseUnderAttack.value &&
    threats === 1 &&
    lodgeHp >= (armorTrackActive ? 0.95 : 0.97) &&
    (waveCountdown === null || waveCountdown > (armorTrackActive ? 12 : 14)) &&
    totalArmy >= (armorTrackActive ? MIN_ATTACK_ARMY : MIN_ATTACK_ARMY + 1) &&
    readyArmy >= MIN_ATTACK_ARMY
  );
}

function safeAttackArmyThreshold(totalArmy: number): number {
  const lodgeHp = lodgeHpRatio();
  const waveCountdown = nextWaveCountdown();
  const mobilityTrackActive = hasCurrentRunTrack('utility_unit_speed');
  const armorTrackActive = hasCurrentRunTrack('combat_armor');
  const frontlineArmy = frontlineCombatUnitCount();

  if (lodgeHp < 0.85) return Number.POSITIVE_INFINITY;
  if (waveCountdown !== null && waveCountdown <= 10) return Number.POSITIVE_INFINITY;

  if (
    armorTrackActive &&
    totalArmy >= MIN_ATTACK_ARMY &&
    lodgeHp >= 0.95 &&
    (waveCountdown === null || waveCountdown > 16)
  ) {
    return MIN_ATTACK_ARMY;
  }

  if (totalArmy >= MIN_ATTACK_ARMY && lodgeHp >= 0.97 && (waveCountdown === null || waveCountdown > 18)) {
    return MIN_ATTACK_ARMY;
  }

  if (totalArmy >= MIN_ATTACK_ARMY + 1 && lodgeHp >= 0.92 && (waveCountdown === null || waveCountdown > 14)) {
    return MIN_ATTACK_ARMY + 1;
  }

  if (
    mobilityTrackActive &&
    frontlineArmy >= MIN_ATTACK_ARMY + 1 &&
    lodgeHp >= 0.95 &&
    (waveCountdown === null || waveCountdown > 18)
  ) {
    return MIN_ATTACK_ARMY + 1;
  }

  return Math.max(MIN_ATTACK_ARMY + 2, 5);
}

function canOpenMobilityAttackWindow(
  totalArmy: number,
  readyArmy: number,
  threshold: number,
): boolean {
  const frontlineArmy = frontlineCombatUnitCount();
  return (
    hasCurrentRunTrack('utility_unit_speed') &&
    threshold > MIN_ATTACK_ARMY &&
    readyArmy >= threshold - 1 &&
    totalArmy >= threshold &&
    frontlineArmy >= threshold
  );
}

function canPressureSafely(totalArmy: number, readyArmy: number): boolean {
  const threshold = safeAttackArmyThreshold(totalArmy);
  return (
    Number.isFinite(threshold) &&
    threshold <= MIN_ATTACK_ARMY + 1 &&
    (readyArmy >= threshold || canOpenMobilityAttackWindow(totalArmy, readyArmy, threshold))
  );
}

function demolishRaidWindowReady(totalArmy: number, readyArmy: number): boolean {
  const waveCountdown = nextWaveCountdown();
  const threats = baseThreatCount();
  const lodgeHp = lodgeHpRatio();
  const raidWindow = threats <= 1 && lodgeHp >= 0.9 && (waveCountdown === null || waveCountdown > 10);
  return (
    hasCurrentRunTrack('siege_demolish_power') &&
    storeV3.progressionLevel.value >= 6 &&
    raidWindow &&
    totalArmy >= 2 &&
    readyArmy >= 2 &&
    countAvailableSiegeAttackers() >= 2
  );
}

function proactiveTowerWindowReady(): boolean {
  const def = ENTITY_DEFS[EntityKind.Tower];
  const towerDamageTrackActive = hasCurrentRunTrack('defense_tower_damage');
  return (
    storeV3.progressionLevel.value >= 6 &&
    !hasBuilding(EntityKind.Tower) &&
    (hasCompletedBuilding(EntityKind.Armory) || towerDamageTrackActive) &&
    store.fish.value >= (def.fishCost ?? 0) &&
    store.logs.value >= (def.logCost ?? 0)
  );
}

function defensiveWallWindowReady(): boolean {
  const def = ENTITY_DEFS[EntityKind.Wall];
  const lodgeHp = lodgeHpRatio();
  const threats = baseThreatCount();
  const waveCountdown = nextWaveCountdown();
  return (
    storeV3.progressionLevel.value >= 6 &&
    hasCurrentRunTrack('defense_wall_hp') &&
    !hasBuilding(EntityKind.Wall) &&
    lodgeHp >= 0.92 &&
    threats <= 1 &&
    (waveCountdown === null || waveCountdown > 8) &&
    store.fish.value >= (def.fishCost ?? 0) &&
    store.logs.value >= (def.logCost ?? 0)
  );
}

function canAffordBuild(kind: EntityKind): boolean {
  const def = ENTITY_DEFS[kind];
  return store.fish.value >= (def.fishCost ?? 0) && store.logs.value >= (def.logCost ?? 0);
}

function fortificationBudgetRebalanceScore(): number {
  if (storeV3.progressionLevel.value < 6) return 0;
  if (
    hasCurrentRunTrack('defense_wall_hp') &&
    !hasBuilding(EntityKind.Wall) &&
    lodgeHpRatio() >= 0.92 &&
    baseThreatCount() <= 1
  ) {
    return 0.9;
  }
  if (hasCurrentRunTrack('defense_tower_damage') && !hasBuilding(EntityKind.Tower)) return 0.9;
  return 0;
}

function reservedBuildScore(kind: EntityKind): number {
  if (kind === EntityKind.Wall) return 0.97;
  if (kind === EntityKind.Tower) return 0.94;
  if (kind === EntityKind.Armory) return 0.92;
  return 0.91;
}

/** High score when idle Mudpaws exist — always beats Train to avoid idle waste. */
export class GatherEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    const idle = findIdleMudpaws();
    const affordableFirstArmory =
      storeV3.progressionLevel.value >= 6 &&
      !hasWingOrBuilding(EntityKind.Armory) &&
      canAffordBuild(EntityKind.Armory);
    if (idle.length === 0) {
      if (!needsGatherRebalance()) return 0;
      const fortificationBudgetScore = fortificationBudgetRebalanceScore();
      if (fortificationBudgetScore > 0) return fortificationBudgetScore;
      const towerFollowUpActive =
        storeV3.progressionLevel.value >= 6 &&
        hasCompletedBuilding(EntityKind.Armory) &&
        !hasBuilding(EntityKind.Tower);
      return towerFollowUpActive ? 0.89 : 0.62;
    }
    if (proactiveTowerWindowReady()) {
      return 0.42 + Math.min(idle.length * 0.02, 0.04);
    }
    if (affordableFirstArmory) {
      return 0.42 + Math.min(idle.length * 0.02, 0.04);
    }
    const totalArmy = combatUnitCount();
    const readyArmy = countAvailableAttackers();
    if (lightPressureSkirmishWindow(totalArmy, readyArmy) || canPressureSafely(totalArmy, readyArmy)) {
      return 0.46 + Math.min(idle.length * 0.02, 0.06);
    }
    return 0.85 + Math.min(idle.length * 0.03, 0.1);
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new GatherGoal(gov));
  }
}

/** High score when a needed building is missing. */
export class BuildEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    const towerDamageTrackActive = hasCurrentRunTrack('defense_tower_damage');
    const reservedBuildKind = getGovernorReservedBuildKind();
    if (reservedBuildKind != null && canAffordBuild(reservedBuildKind)) {
      return reservedBuildScore(reservedBuildKind);
    }
    if (demolishRaidWindowReady(combatUnitCount(), countAvailableAttackers())) return 0.74;
    if (towerDamageTrackActive && proactiveTowerWindowReady()) return 0.88;
    if (defensiveWallWindowReady()) return 0.86;
    // Armory is a Lodge wing — check if it's unlocked rather than placed
    if (!hasWingOrBuilding(EntityKind.Armory) && canAffordBuild(EntityKind.Armory)) {
      return storeV3.progressionLevel.value >= 6 ? 0.9 : 0.85;
    }
    if (baseThreatCount() >= 2 && store.fish.value >= (ENTITY_DEFS[EntityKind.Tower].fishCost ?? 0))
      return 0.8;
    if (proactiveTowerWindowReady()) {
      return 0.79;
    }
    if (store.food.value >= store.maxFood.value - 1 && store.logs.value >= 75) return 0.75;
    return 0;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new BuildGoal(gov));
  }
}

/** High score when army is small and resources are available. */
export class TrainEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    if (store.food.value >= store.maxFood.value) return 0;

    const mudpaws = getGovernorGatherUnits(store.unitRoster.value).length;
    const idleMudpaws = findIdleMudpaws().length;
    const army = combatUnitCount();
    const readyArmy = countAvailableAttackers();
    const reservedBuildKind = getGovernorReservedBuildKind();
    const trainSpeedTrackActive = hasCurrentRunTrack('utility_train_speed');
    const armorTrackActive = hasCurrentRunTrack('combat_armor');

    if (reservedBuildKind !== null) return trainSpeedTrackActive ? 0.12 : 0.18;

    // Need Mudpaws for economy — but the target drops on higher-pressure stages.
    if (mudpaws < getGovernorMudpawTarget()) {
      if (idleMudpaws > 0) return 0; // Let Gather goal assign them first
      if (
        armorTrackActive &&
        mudpaws >= 1 &&
        (canPressureSafely(army, readyArmy) || lightPressureSkirmishWindow(army, readyArmy))
      ) {
        return 0.4;
      }
      if (store.fish.value >= 10) return 0.8;
    }

    // Need combat units — always desirable when economy is running
    const combatTarget = getGovernorCombatTarget();
    const lowReserveFillerWindow =
      trainSpeedTrackActive &&
      storeV3.progressionLevel.value >= 6 &&
      army >= combatTarget &&
      store.fish.value < 120;
    if (army < combatTarget && store.fish.value >= 20 && canPressureSafely(army, readyArmy)) {
      return 0.44;
    }
    if (army < combatTarget && store.fish.value >= 20) return 0.75;
    if (lowReserveFillerWindow) {
      return canPressureSafely(army, readyArmy) ? 0.16 : 0.22;
    }

    // Keep training if we can afford it
    if (store.fish.value >= 20 && canPressureSafely(army, readyArmy)) {
      return trainSpeedTrackActive ? 0.34 : 0.42;
    }
    if (store.fish.value >= 20) {
      return trainSpeedTrackActive && army >= combatTarget ? 0.38 : 0.5;
    }
    return 0;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new TrainGoal(gov));
  }
}

/** Very high score when base is under attack. */
export class DefendEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    if (!store.baseUnderAttack.value) return 0;
    const threats = baseThreatCount();
    const lodgeHp = lodgeHpRatio();
    const army = combatUnitCount();
    const defenders = availableDefenderCount();
    const combatTarget = getGovernorCombatTarget();
    const affordableFirstArmory =
      storeV3.progressionLevel.value >= 6 &&
      !hasWingOrBuilding(EntityKind.Armory) &&
      canAffordBuild(EntityKind.Armory);
    const canRepairLodge = lodgeHp < 1 && store.logs.value >= LODGE_REPAIR_LOG_COST;

    if (defenders === 0 && !canRepairLodge) {
      return affordableFirstArmory ? 0.4 : 0.28;
    }

    if (lodgeHp < 0.7 || threats >= 3) return 0.95;
    if (
      affordableFirstArmory &&
      lodgeHp >= 0.97 &&
      threats <= 2 &&
      army < Math.max(combatTarget, MIN_ATTACK_ARMY + 1)
    ) {
      return 0.76;
    }
    if (lodgeHp < 0.85 || threats >= 2) return 0.88;
    if (threats === 1 && lodgeHp >= 0.97 && army >= Math.max(combatTarget, MIN_ATTACK_ARMY + 1)) {
      return 0.54;
    }
    if (army < combatTarget) return 0.72;
    return 0.82;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new DefendGoal(gov));
  }
}

/** High score when army is large enough and no immediate threats. */
export class AttackEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    const totalArmy = combatUnitCount();
    const readyArmy = countAvailableAttackers();
    if (demolishRaidWindowReady(totalArmy, readyArmy)) {
      return 0.8;
    }
    const skirmishWindow = lightPressureSkirmishWindow(totalArmy, readyArmy);
    if (store.baseUnderAttack.value && !skirmishWindow) return 0;
    const safeAttackArmy = safeAttackArmyThreshold(totalArmy);
    if (
      !skirmishWindow &&
      readyArmy < safeAttackArmy &&
      !canOpenMobilityAttackWindow(totalArmy, readyArmy, safeAttackArmy)
    ) {
      return 0;
    }
    if (!skirmishWindow && !Number.isFinite(safeAttackArmy)) return 0;

    const openingWindow = skirmishWindow
      ? 0.64
      : safeAttackArmy === MIN_ATTACK_ARMY
        ? 0.78
        : safeAttackArmy === MIN_ATTACK_ARMY + 1
          ? 0.68
          : 0.42;
    const armyPressure = skirmishWindow
      ? Math.min(Math.max(readyArmy - MIN_ATTACK_ARMY, 0) * 0.08, 0.24)
      : Math.min(Math.max(readyArmy - safeAttackArmy, 0) * 0.08, 0.24);
    const reservePressure = Math.min(Math.max(totalArmy - readyArmy, 0) * 0.03, 0.09);
    const fishReservePressure = Math.min(Math.max(store.fish.value - 60, 0) / 320, 0.14);
    const lightPressureTax = skirmishWindow ? 0.06 : 0;
    return Math.min(openingWindow + armyPressure + reservePressure + fishReservePressure - lightPressureTax, 0.82);
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new AttackGoal(gov));
  }
}
