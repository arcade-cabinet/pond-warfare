/**
 * AI System - Shared Helpers
 *
 * Query helpers and utility functions used across multiple AI sub-modules.
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { ENEMY_BUILD_RADIUS, TILE_SIZE } from '@/constants';
import {
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import {
  ENEMY_HARVESTER_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { canPlaceBuilding } from '@/input/selection/queries';
import { EntityKind, Faction, UnitState } from '@/types';

/** Get all alive enemy production buildings (nests or lodges depending on faction setup). */
export function getEnemyNests(world: GameWorld): number[] {
  const nests = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
  // When player is predator, AI controls otters whose base building is Lodge
  const nestKind = world.playerFaction === 'predator' ? EntityKind.Lodge : EntityKind.PredatorNest;
  const result: number[] = [];
  for (let i = 0; i < nests.length; i++) {
    const eid = nests[i];
    if (
      EntityTypeTag.kind[eid] === nestKind &&
      FactionTag.faction[eid] === Faction.Enemy &&
      Health.current[eid] > 0 &&
      Building.progress[eid] >= 100
    ) {
      result.push(eid);
    }
  }
  return result;
}

/** Find the player's main base building (Lodge for otters, PredatorNest for predators). */
export function findPlayerLodge(world: GameWorld): number {
  const lodgeKind = world.playerFaction === 'predator' ? EntityKind.PredatorNest : EntityKind.Lodge;
  const buildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (
      EntityTypeTag.kind[eid] === lodgeKind &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return -1;
}

/** Count alive enemy combat units (not harvester units, not buildings) */
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
    if (kind === ENEMY_HARVESTER_KIND) continue;
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
    if (kind === ENEMY_HARVESTER_KIND) continue;
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

export interface PlayerCombatPressure {
  frontline: number;
  projected: number;
}

/**
 * Summarize the live player army into the counter buckets enemy training cares
 * about. Frontline maps to gator-style answers; projected maps to snake-style
 * answers. Economy, recon, and heal specialists do not contribute here.
 */
export function getPlayerCombatPressure(
  world: Pick<GameWorld, 'ecs' | 'specialistAssignments'>,
): PlayerCombatPressure {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let frontline = 0;
  let projected = 0;

  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource)) {
      continue;
    }

    const specialistRole = getSpecialistCounterRole(world, eid);
    if (specialistRole === 'frontline') {
      frontline++;
      continue;
    }
    if (specialistRole === 'projected') {
      projected++;
      continue;
    }
    if (specialistRole === 'ignore') continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Commander) {
      frontline++;
      continue;
    }

    if (kind === MUDPAW_KIND) continue;

    const def = ENTITY_DEFS[kind];
    const damage = hasComponent(world.ecs, eid, Combat) ? Combat.damage[eid] : (def?.damage ?? 0);
    if (damage <= 0) continue;
    const attackRange = hasComponent(world.ecs, eid, Combat)
      ? Combat.attackRange[eid]
      : (def?.attackRange ?? 0);
    if (attackRange >= 120) projected++;
    else frontline++;
  }

  return { frontline, projected };
}

function getSpecialistCounterRole(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
): 'frontline' | 'projected' | 'ignore' | null {
  const runtimeId = world.specialistAssignments.get(eid)?.runtimeId;
  if (!runtimeId) return null;

  switch (runtimeId) {
    case 'guard':
      return 'frontline';
    case 'ranger':
    case 'bombardier':
      return 'projected';
    case 'fisher':
    case 'logger':
    case 'digger':
    case 'shaman':
    case 'lookout':
      return 'ignore';
    default:
      return inferLiveRosterCounterRole(EntityTypeTag.kind[eid] as EntityKind);
  }
}

function inferLiveRosterCounterRole(kind: EntityKind): 'frontline' | null {
  if (kind === SAPPER_KIND || kind === SABOTEUR_KIND) {
    return 'frontline';
  }
  return null;
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
    const angle = world.gameRng.next() * Math.PI * 2;
    const dist = 80 + world.gameRng.next() * ENEMY_BUILD_RADIUS;
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
 * and assign nearby idle enemy harvester units to build it.
 */
export function startEnemyConstruction(world: GameWorld, buildingEid: number): void {
  // Set building to construction state (1 HP, 1% progress)
  Building.progress[buildingEid] = 1;
  Health.current[buildingEid] = 1;

  const bx = Position.x[buildingEid];
  const by = Position.y[buildingEid];

  // Find nearby idle enemy harvester units and assign them to build
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
    if (EntityTypeTag.kind[eid] !== ENEMY_HARVESTER_KIND) continue;
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    // Only redirect idle harvester units or those returning resources
    if (state !== UnitState.Idle && state !== UnitState.ReturnMove) continue;

    const dx = Position.x[eid] - bx;
    const dy = Position.y[eid] - by;
    const dSq = dx * dx + dy * dy;
    if (dSq > 600 * 600) continue; // Only nearby harvesters

    UnitStateMachine.targetEntity[eid] = buildingEid;
    UnitStateMachine.targetX[eid] = bx;
    UnitStateMachine.targetY[eid] = by;
    UnitStateMachine.state[eid] = UnitState.BuildMove;

    const speed = Velocity.speed[eid] || ENTITY_DEFS[ENEMY_HARVESTER_KIND]?.speed || 2.0;
    world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, bx, by);

    assigned++;
    if (assigned >= 2) break; // Send at most 2 harvester units per construction
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

/** Find alive resource nodes (Cattails, Clambeds, PearlBeds). */
export function findResourceNodes(world: GameWorld): number[] {
  const resources = query(world.ecs, [Position, Health, IsResource]);
  const result: number[] = [];
  for (let i = 0; i < resources.length; i++) {
    const eid = resources[i];
    if (Health.current[eid] <= 0) continue;
    result.push(eid);
  }
  return result;
}

/** Find nearest entity from a list to the given position. */
export function findNearestEntity(x: number, y: number, entities: number[]): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    const dx = Position.x[eid] - x;
    const dy = Position.y[eid] - y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestDist) {
      bestDist = dSq;
      best = eid;
    }
  }
  return best;
}

/** Find alive player fortifications (Walls, Towers, Watchtowers). */
export function findPlayerFortifications(world: GameWorld): number[] {
  const buildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  const result: number[] = [];
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Wall || kind === EntityKind.Tower || kind === EntityKind.Watchtower) {
      result.push(eid);
    }
  }
  return result;
}

/** Find alive damaged enemy units (non-building, non-resource). */
export function findDamagedEnemyUnits(world: GameWorld): number[] {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const result: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] >= Health.max[eid]) continue;
    result.push(eid);
  }
  return result;
}
