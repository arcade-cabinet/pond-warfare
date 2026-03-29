/**
 * Selection Utilities
 *
 * Ported from various helper methods in the original HTML game:
 * - getEntityAt() (lines 802-811)
 * - hasPlayerUnitsSelected() (line 813)
 * - issueContextCommand() (lines 815-849)
 * - selectIdleWorker() (lines 482-491)
 * - selectArmy() (lines 494-503)
 * - canPlaceBuilding() (lines 853-868)
 * - placeBuilding() (lines 1066-1086)
 * - train() (lines 1088-1094)
 * - cancelTrain() (lines 1096-1106)
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS, entityKindFromString } from '@/config/entity-defs';
import { TILE_SIZE, TRAIN_TIMER, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Carrying,
  Collider,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Selectable,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

/**
 * Find the entity closest to (x, y) within click tolerance.
 * Prioritizes non-resource entities and sorts by y descending (top-most first).
 */
export function getEntityAt(world: GameWorld, x: number, y: number): number | null {
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  // Build a sorted copy: non-resources first, then by y descending
  const sorted = [...ents]
    .filter((eid) => Health.current[eid] > 0 || hasComponent(world.ecs, eid, IsResource))
    .sort((a, b) => {
      const aRes = hasComponent(world.ecs, a, IsResource) ? 1 : 0;
      const bRes = hasComponent(world.ecs, b, IsResource) ? 1 : 0;
      if (aRes !== bRes) return aRes - bRes;
      return Position.y[b] - Position.y[a];
    });

  for (const eid of sorted) {
    const radius = hasComponent(world.ecs, eid, Collider) ? Collider.radius[eid] : 16;
    const height = hasComponent(world.ecs, eid, Sprite) ? Sprite.height[eid] : 32;
    const hitW = Math.max(25, radius + 15);
    const hitH = Math.max(25, height / 2 + 15);

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

/**
 * Issue a context command (right-click or ground click) to selected units.
 * Handles: attack enemy, gather resource, build/repair building, rally point,
 * move with diamond formation pattern.
 */
export function issueContextCommand(
  world: GameWorld,
  target: number | null,
  worldX: number,
  worldY: number,
): void {
  if (world.placingBuilding) {
    world.placingBuilding = null;
    return;
  }

  // Rally point for single selected building
  if (
    world.selection.length === 1 &&
    hasComponent(world.ecs, world.selection[0], IsBuilding) &&
    FactionTag.faction[world.selection[0]] === Faction.Player
  ) {
    audio.click();
    Building.rallyX[world.selection[0]] = worldX;
    Building.rallyY[world.selection[0]] = worldY;
    Building.hasRally[world.selection[0]] = 1;
    return;
  }

  if (world.selection.length === 0) return;

  audio.click();

  // Ground pings
  if (target == null) {
    world.groundPings.push({
      x: worldX,
      y: worldY,
      life: 20,
      maxLife: 20,
      color: 'rgba(34, 197, 94, 0.8)',
    });
  } else if (
    hasComponent(world.ecs, target, FactionTag) &&
    FactionTag.faction[target] === Faction.Enemy
  ) {
    world.groundPings.push({
      x: Position.x[target],
      y: Position.y[target],
      life: 20,
      maxLife: 20,
      color: 'rgba(239, 68, 68, 0.8)',
    });
  } else if (hasComponent(world.ecs, target, IsResource)) {
    world.groundPings.push({
      x: Position.x[target],
      y: Position.y[target],
      life: 20,
      maxLife: 20,
      color: 'rgba(250, 204, 21, 0.8)',
    });
  }

  // Count movable player units for formation
  const movableUnits = world.selection.filter(
    (eid) =>
      hasComponent(world.ecs, eid, FactionTag) &&
      FactionTag.faction[eid] === Faction.Player &&
      !hasComponent(world.ecs, eid, IsBuilding),
  );
  for (let idx = 0; idx < world.selection.length; idx++) {
    const eid = world.selection[idx];
    if (!hasComponent(world.ecs, eid, FactionTag)) continue;
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;

    // Clear stale state before applying any new order
    UnitStateMachine.hasAttackMoveTarget[eid] = 0;
    UnitStateMachine.attackMoveTargetX[eid] = 0;
    UnitStateMachine.attackMoveTargetY[eid] = 0;
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.returnEntity[eid] = -1;

    if (target != null) {
      const tFaction = FactionTag.faction[target] as Faction;
      const isTargetBuilding = hasComponent(world.ecs, target, IsBuilding);
      const isTargetResource = hasComponent(world.ecs, target, IsResource);

      if (tFaction === Faction.Enemy) {
        // Attack
        UnitStateMachine.targetEntity[eid] = target;
        UnitStateMachine.targetX[eid] = Position.x[target];
        UnitStateMachine.targetY[eid] = Position.y[target];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      } else if (isTargetResource && kind === EntityKind.Gatherer) {
        // Gather
        UnitStateMachine.targetEntity[eid] = target;
        UnitStateMachine.targetX[eid] = Position.x[target];
        UnitStateMachine.targetY[eid] = Position.y[target];
        UnitStateMachine.state[eid] = UnitState.GatherMove;
      } else if (
        isTargetBuilding &&
        tFaction === Faction.Player &&
        Building.progress[target] < 100 &&
        kind === EntityKind.Gatherer
      ) {
        // Build
        UnitStateMachine.targetEntity[eid] = target;
        UnitStateMachine.targetX[eid] = Position.x[target];
        UnitStateMachine.targetY[eid] = Position.y[target];
        UnitStateMachine.state[eid] = UnitState.BuildMove;
      } else if (
        EntityTypeTag.kind[target] === EntityKind.Lodge &&
        kind === EntityKind.Gatherer &&
        Carrying.resourceType[eid] !== ResourceType.None
      ) {
        // Return resources
        UnitStateMachine.returnEntity[eid] = target;
        UnitStateMachine.targetX[eid] = Position.x[target];
        UnitStateMachine.targetY[eid] = Position.y[target];
        UnitStateMachine.state[eid] = UnitState.ReturnMove;
      } else if (
        isTargetBuilding &&
        tFaction === Faction.Player &&
        Building.progress[target] >= 100 &&
        Health.current[target] < Health.max[target] &&
        kind === EntityKind.Gatherer
      ) {
        // Repair
        UnitStateMachine.targetEntity[eid] = target;
        UnitStateMachine.targetX[eid] = Position.x[target];
        UnitStateMachine.targetY[eid] = Position.y[target];
        UnitStateMachine.state[eid] = UnitState.RepairMove;
      } else {
        // Move to target vicinity
        UnitStateMachine.targetX[eid] = worldX + (Math.random() - 0.5) * 20;
        UnitStateMachine.targetY[eid] = worldY + (Math.random() - 0.5) * 20;
        UnitStateMachine.state[eid] = UnitState.Move;
      }
    } else {
      // Role-based formation move: positions are assigned below after the loop
      UnitStateMachine.state[eid] = UnitState.Move;
      UnitStateMachine.targetEntity[eid] = -1;
    }
  }

  // --- Role-based formation positioning for ground-move commands ---
  if (target == null && movableUnits.length > 0) {
    const positions = calculateFormationPositions(movableUnits, worldX, worldY, world);
    for (const pos of positions) {
      UnitStateMachine.targetX[pos.eid] = pos.x;
      UnitStateMachine.targetY[pos.eid] = pos.y;
    }

    // Register group with Yuka for coordinated flocking movement
    if (movableUnits.length > 1) {
      for (const eid of movableUnits) {
        const speed = Velocity.speed[eid];
        if (!world.yukaManager.has(eid)) {
          world.yukaManager.addUnit(
            eid,
            Position.x[eid],
            Position.y[eid],
            speed,
            UnitStateMachine.targetX[eid],
            UnitStateMachine.targetY[eid],
          );
        }
      }
      world.yukaManager.setFormation(movableUnits, worldX, worldY);
    }
  }
}

// ---- Formation Helpers ----

/** Spacing between units in a formation row, in world pixels. */
const FORMATION_SPACING = 40;

/**
 * Calculate role-based formation positions for a group move command.
 *
 * Layout:
 * - Front row: melee units (Brawler, Gator)
 * - Middle row: ranged units (Sniper)
 * - Back row: support units (Healer, Gatherer)
 *
 * Each row is centered on the target position with uniform spacing.
 */
function calculateFormationPositions(
  units: number[],
  targetX: number,
  targetY: number,
  _world: GameWorld,
): { eid: number; x: number; y: number }[] {
  // Separate into roles
  const melee: number[] = [];
  const ranged: number[] = [];
  const support: number[] = [];

  for (const eid of units) {
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Brawler || kind === EntityKind.Gator) {
      melee.push(eid);
    } else if (kind === EntityKind.Sniper) {
      ranged.push(eid);
    } else {
      // Healer, Gatherer, or any other type goes to support row
      support.push(eid);
    }
  }

  const positions: { eid: number; x: number; y: number }[] = [];

  // Front row: melee (closest to enemy)
  layoutRow(melee, targetX, targetY, FORMATION_SPACING, positions);
  // Middle row: ranged (one row back)
  layoutRow(ranged, targetX, targetY + FORMATION_SPACING, FORMATION_SPACING, positions);
  // Back row: support (furthest from enemy)
  layoutRow(support, targetX, targetY + FORMATION_SPACING * 2, FORMATION_SPACING, positions);

  return positions;
}

/**
 * Lay out a row of entities centered horizontally on (cx, cy) with the
 * given spacing between each unit.
 */
function layoutRow(
  eids: number[],
  cx: number,
  cy: number,
  spacing: number,
  out: { eid: number; x: number; y: number }[],
): void {
  const count = eids.length;
  for (let i = 0; i < count; i++) {
    const offsetX = (i - (count - 1) / 2) * spacing;
    out.push({ eid: eids[i], x: cx + offsetX, y: cy });
  }
}

/**
 * Select idle worker with cycling.
 * Ported from lines 482-491.
 */
export function selectIdleWorker(world: GameWorld): void {
  audio.selectUnit();
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const idles = ents.filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Gatherer &&
      UnitStateMachine.state[eid] === UnitState.Idle,
  );

  if (idles.length > 0) {
    world.idleWorkerIdx = world.idleWorkerIdx % idles.length;
    // Deselect all
    for (const eid of world.selection) {
      if (hasComponent(world.ecs, eid, Selectable)) {
        Selectable.selected[eid] = 0;
      }
    }
    const target = idles[world.idleWorkerIdx];
    world.selection = [target];
    Selectable.selected[target] = 1;
    world.isTracking = true;
    world.idleWorkerIdx++;
  }
}

/**
 * Select all army units (non-gatherer player units).
 * Ported from lines 494-503.
 */
export function selectArmy(world: GameWorld): void {
  audio.selectUnit();
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const army = ents.filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      !hasComponent(world.ecs, eid, IsBuilding) &&
      !hasComponent(world.ecs, eid, IsResource) &&
      EntityTypeTag.kind[eid] !== EntityKind.Gatherer &&
      Health.current[eid] > 0,
  );

  if (army.length > 0) {
    for (const eid of world.selection) {
      if (hasComponent(world.ecs, eid, Selectable)) {
        Selectable.selected[eid] = 0;
      }
    }
    world.selection = Array.from(army);
    for (const eid of army) {
      Selectable.selected[eid] = 1;
    }
    world.isTracking = true;
  }
}

/**
 * Check if a building can be placed at the given world coordinates.
 * Ported from lines 853-868.
 */
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

  // World bounds
  if (bx - hw < 0 || bx + hw > WORLD_WIDTH || by - hh < 0 || by + hh > WORLD_HEIGHT) {
    return false;
  }

  return true;
}

/**
 * Place a building at the current mouse position.
 * Ported from lines 1066-1086.
 */
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
  const clamCost = def.clamCost ?? 0;
  const twigCost = def.twigCost ?? 0;

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

  if (world.resources.clams >= clamCost && world.resources.twigs >= twigCost) {
    world.resources.clams -= clamCost;
    world.resources.twigs -= twigCost;
    const eid = spawnEntity(world, kind, bx, by, Faction.Player);

    // Send selected gatherers to build
    for (const selEid of world.selection) {
      if (
        hasComponent(world.ecs, selEid, EntityTypeTag) &&
        EntityTypeTag.kind[selEid] === EntityKind.Gatherer &&
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

/**
 * Queue a unit for training at a building.
 * Ported from lines 1088-1094.
 */
export function train(
  world: GameWorld,
  buildingEid: number,
  kind: EntityKind,
  clamCost: number,
  twigCost: number,
  foodCost: number,
): void {
  const count = TrainingQueue.count[buildingEid];
  if (count >= 8) return;

  if (
    world.resources.clams >= clamCost &&
    world.resources.twigs >= twigCost &&
    world.resources.food + foodCost <= world.resources.maxFood
  ) {
    world.resources.clams -= clamCost;
    world.resources.twigs -= twigCost;
    // Food reservation is handled by syncUIStore counting queued units;
    // no need to increment food here.

    {
      const slots = trainingQueueSlots.get(buildingEid) ?? [];
      slots[count] = kind;
      trainingQueueSlots.set(buildingEid, slots);
      TrainingQueue.count[buildingEid] = count + 1;
      if (count === 0) {
        TrainingQueue.timer[buildingEid] = TRAIN_TIMER;
      }
    }
  }
}

/**
 * Cancel a training queue item and refund costs.
 * Ported from lines 1096-1106.
 */
export function cancelTrain(world: GameWorld, buildingEid: number, index: number): void {
  const count = TrainingQueue.count[buildingEid];
  if (!Number.isInteger(index) || index < 0 || index >= count) return;

  const slots = trainingQueueSlots.get(buildingEid) ?? [];
  const kind = slots[index] as EntityKind | undefined;
  if (kind == null) return;

  // Refund costs
  const def = ENTITY_DEFS[kind];
  world.resources.clams += def.clamCost ?? 0;
  world.resources.twigs += def.twigCost ?? 0;
  world.resources.food -= def.foodCost ?? 1;

  // Shift remaining queue items down
  slots.splice(index, 1);
  trainingQueueSlots.set(buildingEid, slots);
  TrainingQueue.count[buildingEid] = count - 1;

  // Reset timer if we removed the active item
  if (index === 0 && count - 1 > 0) {
    TrainingQueue.timer[buildingEid] = TRAIN_TIMER;
  }
  if (count - 1 === 0) {
    TrainingQueue.timer[buildingEid] = 0;
  }
}
