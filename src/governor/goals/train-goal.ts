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

    for (const b of buildings) {
      const trainable = trainableUnits(b.kind, b.canTrain);
      if (!trainable || b.queueItems.length >= 5) continue;

      const unitKind = this.pickUnit(trainable);
      if (unitKind === null) continue;

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
    if (trainable.includes(MUDPAW_KIND) && mudpawCount() < getGovernorMudpawTarget()) {
      return MUDPAW_KIND;
    }
    if (trainable.includes(MUDPAW_KIND) && armySize() < getGovernorCombatTarget()) {
      return MUDPAW_KIND;
    }
    if (trainable.includes(MEDIC_KIND) && shouldTrainSupportUnit()) {
      return MEDIC_KIND;
    }
    if (trainable.includes(SABOTEUR_KIND) && armySize() >= Math.max(4, getGovernorCombatTarget())) {
      return SABOTEUR_KIND;
    }
    if (trainable.includes(SAPPER_KIND) && armySize() >= Math.max(2, getGovernorCombatTarget() - 1)) {
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
