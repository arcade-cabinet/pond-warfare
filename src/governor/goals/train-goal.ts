/**
 * TrainGoal — Queues unit production at buildings.
 *
 * Reads buildingRoster to find buildings with available queue slots,
 * then calls the same train() function the BuildingsTab uses.
 *
 * The Lodge trains the full manual run roster.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import {
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { train } from '@/input/selection/queries';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { getGovernorCombatUnits, getGovernorGatherUnits } from '../roster-units';
import {
  getGovernorCombatTarget,
  getGovernorMudpawTarget,
  getGovernorReservedBuildKind,
  shouldTrainSupportUnit,
} from '../train-policy';

/** Count of combat units outside the Mudpaw economy chassis. */
function armySize(): number {
  return getGovernorCombatUnits(store.unitRoster.value).length;
}

function mudpawCount(): number {
  return getGovernorGatherUnits(store.unitRoster.value).length;
}

function scoutCount(): number {
  return store.unitRoster.value
    .filter((g) => g.role === 'recon')
    .reduce((sum, g) => sum + g.units.length, 0);
}

function preferredCombatUnit(trainable: EntityKind[]): EntityKind | null {
  if (trainable.includes(SAPPER_KIND)) return SAPPER_KIND;
  if (trainable.includes(SABOTEUR_KIND)) return SABOTEUR_KIND;
  return null;
}

function trainableUnits(buildingKind: EntityKind, canTrain: EntityKind[]): EntityKind[] {
  if (buildingKind === EntityKind.Lodge) {
    const stage = Math.max(1, Math.trunc(storeV3.progressionLevel.value || 1));
    const manualUnits = [MUDPAW_KIND];
    if (stage >= 2) manualUnits.push(MEDIC_KIND);
    if (stage >= 5) manualUnits.push(SAPPER_KIND);
    if (stage >= 6) manualUnits.push(SABOTEUR_KIND);
    return manualUnits;
  }
  return canTrain;
}

export class TrainGoal extends Goal {
  override activate(): void {
    const buildings = store.buildingRoster.value;
    let trained = false;
    const reservedBuildKind = getGovernorReservedBuildKind();
    const combatTarget = getGovernorCombatTarget();

    for (const b of buildings) {
      const trainable = trainableUnits(b.kind, b.canTrain);
      if (!trainable || b.queueItems.length >= 5) continue;

      const unitKind = this.pickUnit(trainable);
      if (unitKind === null) continue;
      if (reservedBuildKind !== null && armySize() >= Math.max(3, combatTarget - 1)) {
        continue;
      }

      const def = ENTITY_DEFS[unitKind];
      const fishCost = def.fishCost ?? 0;
      const logCost = def.logCost ?? 0;
      const foodCost = def.foodCost ?? 1;

      if (store.fish.value >= fishCost && store.logs.value >= logCost) {
        train(game.world, b.eid, unitKind, fishCost, logCost, foodCost);
        trained = true;
        break;
      }
    }

    this.status = trained ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
  }

  private pickUnit(trainable: EntityKind[]): EntityKind | null {
    const combatTarget = getGovernorCombatTarget();
    const wantsSupportUnit = trainable.includes(MEDIC_KIND) && shouldTrainSupportUnit();

    if (trainable.includes(MUDPAW_KIND) && mudpawCount() < getGovernorMudpawTarget()) {
      return MUDPAW_KIND;
    }

    if (wantsSupportUnit) {
      return MEDIC_KIND;
    }

    const dedicatedCombatUnit = preferredCombatUnit(trainable);
    if (dedicatedCombatUnit && armySize() < combatTarget) {
      return dedicatedCombatUnit;
    }
    if (trainable.includes(MUDPAW_KIND) && armySize() < combatTarget) {
      return MUDPAW_KIND;
    }
    if (trainable.includes(SABOTEUR_KIND) && armySize() >= Math.max(4, combatTarget)) {
      return SABOTEUR_KIND;
    }
    if (trainable.includes(SAPPER_KIND) && armySize() >= Math.max(2, combatTarget - 1)) {
      return SAPPER_KIND;
    }
    if (trainable.includes(MEDIC_KIND)) return MEDIC_KIND;
    return trainable[0] ?? null;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
