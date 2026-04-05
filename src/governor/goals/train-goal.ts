/**
 * TrainGoal — Queues unit production at buildings.
 *
 * Reads buildingRoster to find buildings with available queue slots,
 * then calls the same train() function the BuildingsTab uses.
 *
 * The Lodge trains basic units (Gatherer, Brawler, Scout).
 * The Armory wing (Lodge upgrade) trains advanced units (Sniper, Healer, Shieldbearer).
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import { train } from '@/input/selection';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';

/** What each building type can train, in priority order. */
const BUILDING_TRAINS: Record<number, EntityKind[]> = {
  [EntityKind.Lodge]: [EntityKind.Gatherer, EntityKind.Brawler, EntityKind.Scout],
  // Armory is a Lodge wing — trains advanced units when unlocked
  [EntityKind.Armory]: [EntityKind.Sniper, EntityKind.Healer, EntityKind.Shieldbearer],
};

/** Count of combat units (non-gatherer, non-healer, non-scout). */
function armySize(): number {
  return store.unitRoster.value
    .filter((g) => g.role === 'combat')
    .reduce((sum, g) => sum + g.units.length, 0);
}

function gathererCount(): number {
  return store.unitRoster.value
    .filter((g) => g.role === 'gatherer')
    .reduce((sum, g) => sum + g.units.length, 0);
}

export class TrainGoal extends Goal {
  override activate(): void {
    const buildings = store.buildingRoster.value;
    let trained = false;

    for (const b of buildings) {
      const trainable = BUILDING_TRAINS[b.kind];
      if (!trainable || b.queueItems.length >= 5) continue;

      const unitKind = this.pickUnit(b.kind);
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

  private pickUnit(buildingKind: EntityKind): EntityKind | null {
    if (buildingKind === EntityKind.Lodge) {
      if (gathererCount() < 4) return EntityKind.Gatherer;
      if (armySize() < 6) return EntityKind.Brawler;
      return EntityKind.Scout;
    }
    // Armory wing trains advanced units
    if (buildingKind === EntityKind.Armory) {
      return armySize() % 2 === 0 ? EntityKind.Brawler : EntityKind.Sniper;
    }
    return null;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
