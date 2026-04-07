/**
 * TrainGoal — Queues unit production at buildings.
 *
 * Reads buildingRoster to find buildings with available queue slots,
 * then calls the same train() function the BuildingsTab uses.
 *
 * The Lodge trains the four baseline generalists.
 * The Armory wing (Lodge upgrade) trains the heavier follow-up roster.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import { train } from '@/input/selection';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { getGovernorCombatUnits, getGovernorGatherUnits } from '../roster-units';
import {
  getGovernorCombatTarget,
  getGovernorGathererTarget,
  shouldTrainSupportUnit,
} from '../train-policy';

/** What each building type can train, in priority order. */
const BUILDING_TRAINS: Record<number, EntityKind[]> = {
  [EntityKind.Lodge]: [EntityKind.Gatherer, EntityKind.Healer, EntityKind.Sapper, EntityKind.Saboteur],
  // Armory is a Lodge wing — trains heavier follow-up units when unlocked
  [EntityKind.Armory]: [EntityKind.Brawler, EntityKind.Sniper, EntityKind.Healer, EntityKind.Shieldbearer],
};

/** Count of combat units (non-gatherer, non-healer, non-scout). */
function armySize(): number {
  return getGovernorCombatUnits(store.unitRoster.value).length;
}

function gathererCount(): number {
  return getGovernorGatherUnits(store.unitRoster.value).length;
}

function scoutCount(): number {
  return store.unitRoster.value
    .filter((g) => g.role === 'scout')
    .reduce((sum, g) => sum + g.units.length, 0);
}

function trainableUnits(buildingKind: EntityKind, canTrain: EntityKind[]): EntityKind[] {
  if (buildingKind === EntityKind.Lodge) {
    const stage = Math.max(1, Math.trunc(storeV3.progressionLevel.value || 1));
    const manualUnits = [EntityKind.Gatherer];
    if (stage >= 2) manualUnits.push(EntityKind.Healer);
    if (stage >= 5) manualUnits.push(EntityKind.Sapper);
    if (stage >= 6) manualUnits.push(EntityKind.Saboteur);
    return manualUnits;
  }
  if (canTrain.length > 0) return canTrain;
  return BUILDING_TRAINS[buildingKind] ?? [];
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
    if (trainable.includes(EntityKind.Gatherer) && gathererCount() < getGovernorGathererTarget()) {
      return EntityKind.Gatherer;
    }
    if (trainable.includes(EntityKind.Gatherer) && armySize() < getGovernorCombatTarget()) {
      return EntityKind.Gatherer;
    }
    if (trainable.includes(EntityKind.Healer) && shouldTrainSupportUnit()) {
      return EntityKind.Healer;
    }
    if (trainable.includes(EntityKind.Saboteur) && armySize() >= Math.max(4, getGovernorCombatTarget())) {
      return EntityKind.Saboteur;
    }
    if (trainable.includes(EntityKind.Sapper) && armySize() >= Math.max(2, getGovernorCombatTarget() - 1)) {
      return EntityKind.Sapper;
    }
    if (trainable.includes(EntityKind.Sniper) && armySize() >= 3) return EntityKind.Sniper;
    if (trainable.includes(EntityKind.Brawler)) return EntityKind.Brawler;
    if (trainable.includes(EntityKind.Healer)) return EntityKind.Healer;
    return trainable[0] ?? null;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
