/**
 * Auto-Training System
 *
 * When auto-attack or auto-defend is enabled, automatically queues unit
 * training at completed player Armories and Lodges every 120 frames (~2 sec).
 *
 * Priority logic:
 * - If no combat units and enemies exist: queue Brawler at Armory
 * - If combat units < gatherers: queue Brawler at Armory
 * - If snipers < brawlers / 2: queue Sniper at Armory
 * - If no healer and army > 6: queue Healer at Armory
 * - If gatherers < 4: queue Gatherer at Lodge
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
import { train } from '@/input/selection';
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
  const clamCost = def.clamCost ?? 0;
  const twigCost = def.twigCost ?? 0;
  const foodCost = def.foodCost ?? 1;

  // Check affordability before calling train() (train handles it too, but early-out is cheaper)
  if (world.resources.clams < clamCost) return false;
  if (world.resources.twigs < twigCost) return false;
  if (world.resources.food + foodCost > world.resources.maxFood) return false;

  const prevCount = TrainingQueue.count[buildingEid];
  train(world, buildingEid, unitKind, clamCost, twigCost, foodCost);
  return TrainingQueue.count[buildingEid] > prevCount;
}

export function autoTrainSystem(world: GameWorld): void {
  // Only run when attack or defend auto-behavior is enabled
  const { defend, attack } = world.autoBehaviors;
  if (!defend && !attack) return;

  // Throttle to every 120 frames (~2 seconds)
  if (world.frameCount % AUTO_TRAIN_INTERVAL !== 0) return;

  // Count player army composition
  const gatherers = countPlayerKind(world, EntityKind.Gatherer);
  const brawlers = countPlayerKind(world, EntityKind.Brawler);
  const snipers = countPlayerKind(world, EntityKind.Sniper);
  const healers = countPlayerKind(world, EntityKind.Healer);
  const combatUnits = brawlers + snipers + healers;
  const enemies = countEnemyUnits(world);

  // Find available production buildings
  const armories = findTrainableBuildings(world, EntityKind.Armory);
  const lodges = findTrainableBuildings(world, EntityKind.Lodge);

  // --- Train combat units at Armories ---
  if (armories.length > 0 && world.resources.food < world.resources.maxFood) {
    // Pick the armory with the shortest queue
    let bestArmory = armories[0];
    let bestCount = TrainingQueue.count[armories[0]];
    for (let i = 1; i < armories.length; i++) {
      const c = TrainingQueue.count[armories[i]];
      if (c < bestCount) {
        bestCount = c;
        bestArmory = armories[i];
      }
    }

    if (combatUnits === 0 && enemies > 0) {
      // Emergency: no combat units but enemies exist - train Brawler
      tryTrain(world, bestArmory, EntityKind.Brawler);
    } else if (combatUnits < gatherers) {
      // Army is smaller than worker count - train Brawler
      tryTrain(world, bestArmory, EntityKind.Brawler);
    } else if (snipers < Math.floor(brawlers / 2)) {
      // Need ranged support - train Sniper
      tryTrain(world, bestArmory, EntityKind.Sniper);
    } else if (healers === 0 && combatUnits > 6) {
      // No healer and army is large enough to justify one
      tryTrain(world, bestArmory, EntityKind.Healer);
    } else if (brawlers <= snipers) {
      // Default: keep brawler count at least equal to snipers
      tryTrain(world, bestArmory, EntityKind.Brawler);
    }
  }

  // --- Train gatherers at Lodges ---
  if (
    lodges.length > 0 &&
    gatherers < 4 &&
    world.resources.food < world.resources.maxFood
  ) {
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

    tryTrain(world, bestLodge, EntityKind.Gatherer);
  }
}
