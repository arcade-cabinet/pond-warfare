/**
 * BuildGoal — Decides which building to construct next.
 *
 * Reads buildingRoster and resource signals to determine if the player
 * needs more buildings (Armory, Burrow for pop, Tower for defense).
 * Uses placeBuilding via the same path the UI uses.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { TILE_SIZE } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Position } from '@/ecs/components';
import { game } from '@/game';
import { EntityKind, Faction } from '@/types';
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

    // Place near lodge with a random offset
    const ox = (Math.random() - 0.5) * 200;
    const oy = (Math.random() - 0.5) * 200;
    const bx = Math.round((lodge.x + ox) / TILE_SIZE) * TILE_SIZE;
    const by = Math.round((lodge.y + oy) / TILE_SIZE) * TILE_SIZE;

    const w = game.world;
    w.resources.clams -= clamCost;
    w.resources.twigs -= twigCost;
    spawnEntity(w, need.kind, bx, by, Faction.Player);

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
