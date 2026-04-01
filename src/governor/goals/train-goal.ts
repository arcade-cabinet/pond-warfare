/**
 * TrainGoal — Queues unit production at buildings.
 *
 * Reads buildingRoster to find buildings with available queue slots,
 * then calls the same train() function the BuildingsTab uses.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import { train } from '@/input/selection';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';

/** What each building type can train, in priority order. */
const BUILDING_TRAINS: Record<number, EntityKind[]> = {
  [EntityKind.Lodge]: [EntityKind.Gatherer],
  [EntityKind.Armory]: [EntityKind.Brawler, EntityKind.Sniper, EntityKind.Shieldbearer],
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
      if (!trainable || b.queueItems.length >= 3) continue;

      const unitKind = this.pickUnit(b.kind);
      if (unitKind === null) continue;

      const def = ENTITY_DEFS[unitKind];
      const clamCost = def.clamCost ?? 0;
      const twigCost = def.twigCost ?? 0;
      const foodCost = def.foodCost ?? 1;

      if (store.clams.value >= clamCost && store.twigs.value >= twigCost) {
        train(game.world, b.eid, unitKind, clamCost, twigCost, foodCost);
        trained = true;
        break;
      }
    }

    this.status = trained ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
  }

  private pickUnit(buildingKind: EntityKind): EntityKind | null {
    if (buildingKind === EntityKind.Lodge) {
      return gathererCount() < 4 ? EntityKind.Gatherer : null;
    }
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
