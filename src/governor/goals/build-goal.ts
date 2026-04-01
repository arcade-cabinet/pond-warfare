/**
 * BuildGoal — Decides which building to construct next.
 *
 * Reads buildingRoster and resource signals to determine if the player
 * needs more buildings (Armory, Burrow for pop, Tower for defense).
 * Uses placeBuilding via the same path the UI uses.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import { Position } from '@/ecs/components';
import { game } from '@/game';
import { placeBuilding } from '@/input/selection';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';

/** Building priorities: what to build and when. */
interface BuildNeed {
  kind: EntityKind;
  needed: () => boolean;
}

function hasBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((b) => b.kind === kind);
}

function buildingCount(kind: EntityKind): number {
  return store.buildingRoster.value.filter((b) => b.kind === kind).length;
}

const BUILD_PRIORITIES: BuildNeed[] = [
  { kind: EntityKind.Armory, needed: () => !hasBuilding(EntityKind.Armory) },
  {
    kind: EntityKind.Burrow,
    needed: () =>
      store.food.value >= store.maxFood.value - 1 && buildingCount(EntityKind.Burrow) < 3,
  },
  {
    kind: EntityKind.Tower,
    needed: () => store.baseUnderAttack.value && buildingCount(EntityKind.Tower) < 2,
  },
];

/** Find the Lodge position to place buildings near it. */
function lodgePosition(): { x: number; y: number } | null {
  const lodge = store.buildingRoster.value.find((b) => b.kind === EntityKind.Lodge);
  if (!lodge) return null;
  return { x: Position.x[lodge.eid], y: Position.y[lodge.eid] };
}

export class BuildGoal extends Goal {
  override activate(): void {
    const need = BUILD_PRIORITIES.find((b) => b.needed());
    if (!need) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    const def = ENTITY_DEFS[need.kind];
    const clamCost = def.clamCost ?? 0;
    const twigCost = def.twigCost ?? 0;
    if (store.clams.value < clamCost || store.twigs.value < twigCost) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    const lodge = lodgePosition();
    if (!lodge) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    // Use the proper building placement system (collision detection, construction
    // progress, gatherer assignment) — same path the UI uses
    const w = game.world;
    const kindName = entityKindName(need.kind).toLowerCase().replace(/\s+/g, '_');
    w.placingBuilding = kindName;

    // Select a gatherer to be the builder (placeBuilding assigns them)
    const gatherers = store.unitRoster.value
      .flatMap((g) => g.units)
      .filter((u) => u.kind === EntityKind.Gatherer);
    if (gatherers.length > 0) {
      w.selection = [gatherers[0].eid];
    }

    // Place near lodge with a random offset
    const ox = (Math.random() - 0.5) * 200;
    const oy = (Math.random() - 0.5) * 200;
    placeBuilding(w, lodge.x + ox, lodge.y + oy);
    w.placingBuilding = null;

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
