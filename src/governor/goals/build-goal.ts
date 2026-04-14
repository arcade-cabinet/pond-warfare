/**
 * BuildGoal — Decides which building to construct next.
 *
 * Reads buildingRoster and resource signals to determine if the player
 * needs more buildings. Wing buildings (Armory, Burrow, etc.) are Lodge
 * upgrades — the Governor treats their presence in the roster as the
 * wing being unlocked. Non-wing buildings (Tower) are placed standalone.
 */

import { Goal } from 'yuka';
import { ENTITY_DEFS, entityKindName, isWingBuilding } from '@/config/entity-defs';
import { Position } from '@/ecs/components';
import { game } from '@/game';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { placeBuilding } from '@/input/selection/queries';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { hasCurrentRunTrack } from '../current-run-upgrades';

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

function hasCompletedBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((b) => b.kind === kind && b.hp >= b.maxHp);
}

function currentStage(): number {
  return Math.max(1, Math.trunc(storeV3.progressionLevel.value || 1));
}

const BUILD_PRIORITIES: BuildNeed[] = [
  {
    kind: EntityKind.Tower,
    needed: () =>
      currentStage() >= 6 &&
      hasCurrentRunTrack('defense_tower_damage') &&
      buildingCount(EntityKind.Tower) < 1,
  },
  {
    kind: EntityKind.Wall,
    needed: () =>
      currentStage() >= 6 &&
      hasCurrentRunTrack('defense_wall_hp') &&
      buildingCount(EntityKind.Wall) < 1,
  },
  // Armory is a Lodge wing — check if unlocked
  { kind: EntityKind.Armory, needed: () => !hasBuilding(EntityKind.Armory) },
  {
    kind: EntityKind.Tower,
    needed: () => store.baseUnderAttack.value && buildingCount(EntityKind.Tower) < 2,
  },
  {
    kind: EntityKind.Tower,
    needed: () =>
      currentStage() >= 6 &&
      hasCompletedBuilding(EntityKind.Armory) &&
      buildingCount(EntityKind.Tower) < 1,
  },
  {
    kind: EntityKind.Burrow,
    needed: () =>
      store.food.value >= store.maxFood.value - 1 && buildingCount(EntityKind.Burrow) < 3,
  },
];

/** Find the Lodge position to place buildings near it. */
function lodgePosition(): { x: number; y: number } | null {
  const lodge = store.buildingRoster.value.find((b) => b.kind === EntityKind.Lodge);
  if (!lodge) return null;
  return { x: Position.x[lodge.eid], y: Position.y[lodge.eid] };
}

function towerPlacement(
  lodge: { x: number; y: number },
  forwardBiasStrong: boolean,
  centeredLane: boolean,
): { x: number; y: number } {
  if (centeredLane) {
    return {
      x: lodge.x,
      y: lodge.y - 150,
    };
  }
  const angleSpread = forwardBiasStrong ? Math.PI / 5 : Math.PI / 3;
  const angle = -Math.PI / 2 + (game.world.gameRng.next() - 0.5) * angleSpread;
  const baseRadius = forwardBiasStrong ? 170 : 190;
  const radiusJitter = forwardBiasStrong ? 30 : 60;
  const radius = baseRadius + (game.world.gameRng.next() - 0.5) * radiusJitter;
  return {
    x: lodge.x + Math.cos(angle) * radius,
    y: lodge.y + Math.sin(angle) * radius,
  };
}

function wallPlacement(lodge: { x: number; y: number }): { x: number; y: number } {
  return {
    x: lodge.x,
    y: lodge.y - 120,
  };
}

export class BuildGoal extends Goal {
  override activate(): void {
    const need = BUILD_PRIORITIES.find((b) => b.needed());
    if (!need) {
      this.status = Goal.STATUS.COMPLETED;
      return;
    }

    const def = ENTITY_DEFS[need.kind];
    const fishCost = def.fishCost ?? 0;
    const logCost = def.logCost ?? 0;
    if (store.fish.value < fishCost || store.logs.value < logCost) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    const lodge = lodgePosition();
    if (!lodge) {
      this.status = Goal.STATUS.FAILED;
      return;
    }

    // Wing buildings are Lodge upgrades — still use placeBuilding path
    // which handles spawning the ECS entity near the Lodge
    const w = game.world;
    const kindName = entityKindName(need.kind).toLowerCase().replace(/\s+/g, '_');
    w.placingBuilding = kindName;

    // Select a Mudpaw/generalist to be the builder (placeBuilding assigns them)
    const generalists = store.unitRoster.value
      .flatMap((g) => g.units)
      .filter((u) => u.kind === MUDPAW_KIND);
    if (generalists.length > 0) {
      const builderCount =
        need.kind === EntityKind.Wall && hasCurrentRunTrack('defense_wall_hp')
          ? 2
          : need.kind === EntityKind.Tower && hasCurrentRunTrack('defense_tower_damage')
            ? 3
            : need.kind === EntityKind.Armory || need.kind === EntityKind.Tower
              ? 2
              : 1;
      w.selection = generalists.slice(0, builderCount).map((unit) => unit.eid);
    }

    if (need.kind === EntityKind.Tower) {
      const trackDrivenTower =
        hasCurrentRunTrack('defense_tower_damage') && buildingCount(EntityKind.Tower) < 1;
      const placement = towerPlacement(
        lodge,
        trackDrivenTower || currentStage() >= 6,
        trackDrivenTower,
      );
      placeBuilding(w, placement.x, placement.y);
    } else if (need.kind === EntityKind.Wall) {
      const placement = wallPlacement(lodge);
      placeBuilding(w, placement.x, placement.y);
    } else {
      // Place near the lodge, but keep wing buildings outside the lodge's own
      // footprint so the placement check does not reject every attempt.
      const isWing = isWingBuilding(need.kind);
      const angle = w.gameRng.next() * Math.PI * 2;
      const baseRadius = isWing ? 140 : 200;
      const radiusJitter = isWing ? 24 : 80;
      const radius = baseRadius + (w.gameRng.next() - 0.5) * radiusJitter;
      placeBuilding(w, lodge.x + Math.cos(angle) * radius, lodge.y + Math.sin(angle) * radius);
    }
    w.placingBuilding = null;

    this.status = Goal.STATUS.COMPLETED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
