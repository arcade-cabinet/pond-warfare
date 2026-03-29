/**
 * AI System - Shared Helpers
 *
 * Query helpers and utility functions used across multiple AI sub-modules.
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_BUILD_RADIUS,
  TILE_SIZE,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { canPlaceBuilding } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';

/** Get all alive enemy nests */
export function getEnemyNests(world: GameWorld): number[] {
  const nests = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
  const result: number[] = [];
  for (let i = 0; i < nests.length; i++) {
    const eid = nests[i];
    if (
      EntityTypeTag.kind[eid] === EntityKind.PredatorNest &&
      FactionTag.faction[eid] === Faction.Enemy &&
      Health.current[eid] > 0 &&
      Building.progress[eid] >= 100
    ) {
      result.push(eid);
    }
  }
  return result;
}

/** Find the player lodge (first alive one) */
export function findPlayerLodge(world: GameWorld): number {
  const buildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return -1;
}

/** Count alive enemy combat units (not gatherers, not buildings) */
export function countEnemyArmy(world: GameWorld): number {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Gatherer) continue;
    count++;
  }
  return count;
}

/** Get alive enemy combat units */
export function getEnemyArmyUnits(world: GameWorld): number[] {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const result: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Gatherer) continue;
    result.push(eid);
  }
  return result;
}

/** Count player units of a specific kind */
export function countPlayerUnitsOfKind(world: GameWorld, targetKind: EntityKind): number {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (EntityTypeTag.kind[eid] === targetKind) count++;
  }
  return count;
}

/** Find a valid placement position near a nest */
export function findBuildPosition(
  world: GameWorld,
  nestEid: number,
  kind: EntityKind,
): { x: number; y: number } | null {
  const nx = Position.x[nestEid];
  const ny = Position.y[nestEid];
  const def = ENTITY_DEFS[kind];
  const spriteW = def.spriteSize * def.spriteScale;
  const spriteH = def.spriteSize * def.spriteScale;

  // Try random positions near the nest, snapping to tile grid
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * ENEMY_BUILD_RADIUS;
    const bx = Math.round((nx + Math.cos(angle) * dist) / TILE_SIZE) * TILE_SIZE;
    const by = Math.round((ny + Math.sin(angle) * dist) / TILE_SIZE) * TILE_SIZE;

    if (canPlaceBuilding(world, bx, by, spriteW, spriteH)) {
      return { x: bx, y: by };
    }
  }
  return null;
}

/**
 * Set a newly spawned building to 1 HP / 1% progress (construction site)
 * and assign nearby idle enemy gatherers to build it.
 */
export function startEnemyConstruction(world: GameWorld, buildingEid: number): void {
  // Set building to construction state (1 HP, 1% progress)
  Building.progress[buildingEid] = 1;
  Health.current[buildingEid] = 1;

  const bx = Position.x[buildingEid];
  const by = Position.y[buildingEid];

  // Find nearby idle enemy gatherers and assign them to build
  const allUnits = query(world.ecs, [
    Position,
    Health,
    FactionTag,
    EntityTypeTag,
    UnitStateMachine,
  ]);
  let assigned = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (EntityTypeTag.kind[eid] !== EntityKind.Gatherer) continue;
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    // Only redirect idle gatherers or those returning resources
    if (state !== UnitState.Idle && state !== UnitState.ReturnMove) continue;

    const dx = Position.x[eid] - bx;
    const dy = Position.y[eid] - by;
    const dSq = dx * dx + dy * dy;
    if (dSq > 600 * 600) continue; // Only nearby gatherers

    UnitStateMachine.targetEntity[eid] = buildingEid;
    UnitStateMachine.targetX[eid] = bx;
    UnitStateMachine.targetY[eid] = by;
    UnitStateMachine.state[eid] = UnitState.BuildMove;

    const speed = Velocity.speed[eid] || ENTITY_DEFS[EntityKind.Gatherer]?.speed || 2.0;
    world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, bx, by);

    assigned++;
    if (assigned >= 2) break; // Send at most 2 gatherers per construction
  }
}

/** Find the weakest alive player building */
export function findWeakestPlayerBuilding(world: GameWorld): number {
  const buildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  let weakest = -1;
  let lowestHp = Infinity;
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] < lowestHp) {
      lowestHp = Health.current[eid];
      weakest = eid;
    }
  }
  return weakest;
}
