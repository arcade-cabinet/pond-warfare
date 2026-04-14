/**
 * Selection Queries & Building Operations
 *
 * Entity lookup, building placement, training queue management.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS, entityKindFromString } from '@/config/entity-defs';
import { TILE_SIZE } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Collider,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueCostSlots,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { isMudpawKind } from '@/game/live-unit-kinds';
import { getPlayerTrainTimer } from '@/game/train-timer';
import { getPlayerTrainingCost } from '@/game/training-costs';
import { type EntityKind, Faction, UnitState } from '@/types';

/**
 * Find the entity closest to (x, y) within click tolerance.
 * Prioritizes non-resource entities and sorts by y descending.
 */
export function getEntityAt(world: GameWorld, x: number, y: number): number | null {
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  const sorted = [...ents]
    .filter((eid) => Health.current[eid] > 0 || hasComponent(world.ecs, eid, IsResource))
    .sort((a, b) => {
      const aRes = hasComponent(world.ecs, a, IsResource) ? 1 : 0;
      const bRes = hasComponent(world.ecs, b, IsResource) ? 1 : 0;
      if (aRes !== bRes) return aRes - bRes;
      return Position.y[b] - Position.y[a];
    });

  // At low zoom, entities are tiny on screen. Ensure hit area is at least
  // 22px in screen space (44px diameter touch target) by scaling up in world space.
  const minWorldHit = 22 / world.zoomLevel;

  for (const eid of sorted) {
    const radius = hasComponent(world.ecs, eid, Collider) ? Collider.radius[eid] : 16;
    const height = hasComponent(world.ecs, eid, Sprite) ? Sprite.height[eid] : 32;
    const hitW = Math.max(minWorldHit, radius + 15);
    const hitH = Math.max(minWorldHit, height / 2 + 15);

    if (Math.abs(Position.x[eid] - x) < hitW && Math.abs(Position.y[eid] - y) < hitH) {
      return eid;
    }
  }
  return null;
}

/**
 * Find a resource entity at (x, y) specifically. Used when a unit overlaps
 * a resource node so the resource can be targeted through the unit.
 */
export function getResourceAt(world: GameWorld, x: number, y: number): number | null {
  const ents = query(world.ecs, [Position, IsResource, EntityTypeTag]);
  const minWorldHit = 22 / world.zoomLevel;

  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    // Skip depleted resources (0 HP means fully gathered)
    if (hasComponent(world.ecs, eid, Health) && Health.current[eid] <= 0) continue;

    const radius = hasComponent(world.ecs, eid, Collider) ? Collider.radius[eid] : 16;
    const height = hasComponent(world.ecs, eid, Sprite) ? Sprite.height[eid] : 32;
    // Use a generous hit area for resources to make them easier to tap
    const hitW = Math.max(minWorldHit, radius + 20);
    const hitH = Math.max(minWorldHit, height / 2 + 20);

    if (Math.abs(Position.x[eid] - x) < hitW && Math.abs(Position.y[eid] - y) < hitH) {
      return eid;
    }
  }
  return null;
}

/** Check if any selected entity is a player-owned non-building unit. */
export function hasPlayerUnitsSelected(world: GameWorld): boolean {
  return (
    world.selection.length > 0 &&
    world.selection.some(
      (eid) =>
        hasComponent(world.ecs, eid, FactionTag) &&
        FactionTag.faction[eid] === Faction.Player &&
        !hasComponent(world.ecs, eid, IsBuilding),
    )
  );
}

/** Check if a building can be placed at the given world coordinates. */
export function canPlaceBuilding(
  world: GameWorld,
  bx: number,
  by: number,
  spriteW: number,
  spriteH: number,
): boolean {
  const hw = spriteW / 2;
  const hh = spriteH / 2;

  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  for (const eid of ents) {
    if (!hasComponent(world.ecs, eid, IsBuilding)) continue;
    const ehw = hasComponent(world.ecs, eid, Sprite) ? Sprite.width[eid] / 2 : 48;
    const ehh = hasComponent(world.ecs, eid, Sprite) ? Sprite.height[eid] / 2 : 48;
    if (
      Math.abs(bx - Position.x[eid]) < hw + ehw - 10 &&
      Math.abs(by - Position.y[eid]) < hh + ehh - 10
    ) {
      return false;
    }
  }

  if (bx - hw < 0 || bx + hw > world.worldWidth || by - hh < 0 || by + hh > world.worldHeight) {
    return false;
  }

  return true;
}

/** Place a building at the current mouse position. */
export function placeBuilding(world: GameWorld, worldX: number, worldY: number): void {
  const type = world.placingBuilding;
  if (!type) return;

  let kind: EntityKind;
  try {
    kind = entityKindFromString(type);
  } catch {
    return;
  }

  const def = ENTITY_DEFS[kind];
  const fishCost = def.fishCost ?? 0;
  const logCost = def.logCost ?? 0;

  const bx = Math.round(worldX / TILE_SIZE) * TILE_SIZE;
  const by = Math.round(worldY / TILE_SIZE) * TILE_SIZE;

  const spriteW = def.spriteSize * def.spriteScale;
  const spriteH = def.spriteSize * def.spriteScale;

  if (!canPlaceBuilding(world, bx, by, spriteW, spriteH)) {
    audio.error();
    world.floatingTexts.push({
      x: bx,
      y: by - 30,
      text: "Can't build here!",
      color: '#ef4444',
      life: 60,
    });
    return;
  }

  if (world.resources.fish >= fishCost && world.resources.logs >= logCost) {
    world.resources.fish -= fishCost;
    world.resources.logs -= logCost;
    const eid = spawnEntity(world, kind, bx, by, Faction.Player);

    for (const selEid of world.selection) {
      if (
        hasComponent(world.ecs, selEid, EntityTypeTag) &&
        isMudpawKind(EntityTypeTag.kind[selEid]) &&
        FactionTag.faction[selEid] === Faction.Player
      ) {
        UnitStateMachine.targetEntity[selEid] = eid;
        UnitStateMachine.targetX[selEid] = bx;
        UnitStateMachine.targetY[selEid] = by;
        UnitStateMachine.state[selEid] = UnitState.BuildMove;
      }
    }

    world.placingBuilding = null;
  }
}

/** Queue a unit for training at a building. */
export function train(
  world: GameWorld,
  buildingEid: number,
  kind: EntityKind,
  fishCost: number,
  logCost: number,
  foodCost: number,
  rockCost = 0,
): void {
  void fishCost;
  void logCost;
  void foodCost;
  void rockCost;
  const count = TrainingQueue.count[buildingEid];
  if (count >= 8) return;
  const adjustedCost = getPlayerTrainingCost(world, kind);

  let queuedFood = 0;
  const allTrainingBldgs = query(world.ecs, [TrainingQueue, FactionTag, IsBuilding]);
  for (let i = 0; i < allTrainingBldgs.length; i++) {
    const bEid = allTrainingBldgs[i];
    if (FactionTag.faction[bEid] !== Faction.Player) continue;
    const slots = trainingQueueSlots.get(bEid);
    if (!slots) continue;
    for (let qi = 0; qi < slots.length; qi++) {
      const def = ENTITY_DEFS[slots[qi] as EntityKind];
      queuedFood += def.foodCost ?? 1;
    }
  }
  world.resources.food = Math.max(world.resources.food, queuedFood);

  if (
    world.resources.fish >= adjustedCost.fish &&
    world.resources.logs >= adjustedCost.logs &&
    world.resources.rocks >= adjustedCost.rocks &&
    world.resources.food + adjustedCost.food <= world.resources.maxFood
  ) {
    world.resources.fish -= adjustedCost.fish;
    world.resources.logs -= adjustedCost.logs;
    world.resources.rocks -= adjustedCost.rocks;
    world.resources.food += adjustedCost.food;

    {
      const slots = trainingQueueSlots.get(buildingEid) ?? [];
      slots[count] = kind;
      trainingQueueSlots.set(buildingEid, slots);
      const costSlots = trainingQueueCostSlots.get(buildingEid) ?? [];
      costSlots[count] = adjustedCost;
      trainingQueueCostSlots.set(buildingEid, costSlots);
      TrainingQueue.count[buildingEid] = count + 1;
      if (count === 0) {
        TrainingQueue.timer[buildingEid] = getPlayerTrainTimer(world, kind);
      }
    }
  }
}

/** Cancel a training queue item and refund costs. */
export function cancelTrain(world: GameWorld, buildingEid: number, index: number): void {
  const count = TrainingQueue.count[buildingEid];
  if (!Number.isInteger(index) || index < 0 || index >= count) return;

  const slots = trainingQueueSlots.get(buildingEid) ?? [];
  const kind = slots[index] as EntityKind | undefined;
  if (kind == null) return;

  const costSlots = trainingQueueCostSlots.get(buildingEid) ?? [];
  const queuedCost = costSlots[index] ?? getPlayerTrainingCost(world, kind);
  world.resources.fish += queuedCost.fish;
  world.resources.logs += queuedCost.logs;
  world.resources.rocks += queuedCost.rocks;
  world.resources.food = Math.max(0, world.resources.food - queuedCost.food);

  slots.splice(index, 1);
  trainingQueueSlots.set(buildingEid, slots);
  costSlots.splice(index, 1);
  trainingQueueCostSlots.set(buildingEid, costSlots);
  TrainingQueue.count[buildingEid] = count - 1;

  if (index === 0 && count - 1 > 0) {
    TrainingQueue.timer[buildingEid] = getPlayerTrainTimer(world, slots[0] as EntityKind);
  }
  if (count - 1 === 0) {
    TrainingQueue.timer[buildingEid] = 0;
  }
}
