/**
 * Auto-Training System
 *
 * When auto-attack or auto-defend is enabled, automatically queues manual
 * Lodge training every 120 frames (~2 sec).
 *
 * Priority logic:
 * - If Mudpaws are below the current target: queue Mudpaw at Lodge
 * - If stage >= 2 and support is missing: queue Medic
 * - If stage >= 5 and siege support is missing: queue Sapper
 * - If stage >= 6 and disruption support is missing: queue Saboteur
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  TrainingQueue,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import {
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { train } from '@/input/selection/queries';
import { EntityKind, Faction } from '@/types';

/** Run auto-training every 120 frames (~2 seconds at 60fps). */
const AUTO_TRAIN_INTERVAL = 120;

/** Count alive player units of a specific kind (non-building, non-resource). */
function countPlayerKind(world: GameWorld, kind: EntityKind): number {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < all.length; i++) {
    const eid = all[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) === kind) count++;
  }
  return count;
}

/** Count all alive enemy units (non-building, non-resource). */
function countEnemyUnits(world: GameWorld): number {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < all.length; i++) {
    const eid = all[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    count++;
  }
  return count;
}

/** Find completed player buildings of a given kind with room in their training queue. */
function findTrainableBuildings(world: GameWorld, kind: EntityKind): number[] {
  const buildings = query(world.ecs, [
    Position,
    Health,
    IsBuilding,
    FactionTag,
    EntityTypeTag,
    Building,
    TrainingQueue,
  ]);
  const result: number[] = [];
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== kind) continue;
    if (Building.progress[eid] < 100) continue;
    if (TrainingQueue.count[eid] >= 8) continue;
    result.push(eid);
  }
  return result;
}

/** Try to train a unit at the first available building. Returns true if queued. */
function tryTrain(world: GameWorld, buildingEid: number, unitKind: EntityKind): boolean {
  const def = ENTITY_DEFS[unitKind];
  const fishCost = def.fishCost ?? 0;
  const logCost = def.logCost ?? 0;
  const foodCost = def.foodCost ?? 1;

  // Check affordability before calling train() (train handles it too, but early-out is cheaper)
  if (world.resources.fish < fishCost) return false;
  if (world.resources.logs < logCost) return false;
  if (world.resources.food + foodCost > world.resources.maxFood) return false;

  const prevCount = TrainingQueue.count[buildingEid];
  train(world, buildingEid, unitKind, fishCost, logCost, foodCost);
  return TrainingQueue.count[buildingEid] > prevCount;
}

export function autoTrainSystem(world: GameWorld): void {
  // Only run when combat auto-behavior is enabled
  const { combat } = world.autoBehaviors;
  if (!combat) return;

  // Throttle to every 120 frames (~2 seconds)
  if (world.frameCount % AUTO_TRAIN_INTERVAL !== 0) return;

  // Count player army composition
  const mudpaws = countPlayerKind(world, MUDPAW_KIND);
  const medics = countPlayerKind(world, MEDIC_KIND);
  const sappers = countPlayerKind(world, SAPPER_KIND);
  const saboteurs = countPlayerKind(world, SABOTEUR_KIND);
  const enemies = countEnemyUnits(world);
  const stage = world.panelGrid?.getActivePanels().length ?? 1;

  // Find available production buildings
  const lodges = findTrainableBuildings(world, EntityKind.Lodge);

  if (lodges.length > 0 && world.resources.food < world.resources.maxFood) {
    // Pick the lodge with the shortest queue
    let bestLodge = lodges[0];
    let bestCount = TrainingQueue.count[lodges[0]];
    for (let i = 1; i < lodges.length; i++) {
      const c = TrainingQueue.count[lodges[i]];
      if (c < bestCount) {
        bestCount = c;
        bestLodge = lodges[i];
      }
    }

    const mudpawTarget =
      enemies >= 3 ? (stage >= 5 ? 4 : 3) : stage >= 6 ? 2 : stage >= 4 ? 3 : 4;
    const frontline = mudpaws + sappers + saboteurs;

    if (mudpaws < mudpawTarget) {
      tryTrain(world, bestLodge, MUDPAW_KIND);
      return;
    }
    if (stage >= 2 && medics === 0 && frontline >= 4) {
      tryTrain(world, bestLodge, MEDIC_KIND);
      return;
    }
    if (stage >= 6 && saboteurs === 0 && frontline >= 6) {
      tryTrain(world, bestLodge, SABOTEUR_KIND);
      return;
    }
    if (stage >= 5 && sappers === 0 && frontline >= 4) {
      tryTrain(world, bestLodge, SAPPER_KIND);
      return;
    }
    if (enemies > 0 && mudpaws < mudpawTarget + 1) {
      tryTrain(world, bestLodge, MUDPAW_KIND);
    }
  }
}
