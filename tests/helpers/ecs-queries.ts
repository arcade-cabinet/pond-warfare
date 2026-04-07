/**
 * Shared ECS Query Helpers for Integration Tests
 *
 * Read-only queries against the ECS world. Accepts a GameWorld parameter
 * so tests can use them without the game singleton.
 */

import { hasComponent, query } from 'bitecs';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

export function getPlayerEntities(world: GameWorld, kind?: EntityKind): number[] {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player) return false;
    if (Health.current[eid] <= 0) return false;
    if (kind !== undefined && EntityTypeTag.kind[eid] !== kind) return false;
    return true;
  });
}

export function getEnemyEntities(world: GameWorld, kind?: EntityKind): number[] {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Enemy) return false;
    if (Health.current[eid] <= 0) return false;
    if (kind !== undefined && EntityTypeTag.kind[eid] !== kind) return false;
    return true;
  });
}

export function getEnemyNests(world: GameWorld): number[] {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  return Array.from(all).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Enemy &&
      EntityTypeTag.kind[eid] === EntityKind.PredatorNest &&
      Health.current[eid] > 0,
  );
}

export function getIdleMudpaws(world: GameWorld): number[] {
  return getPlayerEntities(world, EntityKind.Gatherer).filter(
    (eid) => UnitStateMachine.state[eid] === UnitState.Idle,
  );
}

export function getNearestResource(world: GameWorld, wx: number, wy: number): number | null {
  const resources = query(world.ecs, [Position, Health, FactionTag, IsResource]);
  let best: number | null = null;
  let bestDist = Infinity;
  for (const eid of resources) {
    if (Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - wx;
    const dy = Position.y[eid] - wy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = eid;
    }
  }
  return best;
}

export function getPlayerLodge(world: GameWorld): number | null {
  const lodges = getPlayerEntities(world, EntityKind.Lodge);
  return lodges.length > 0 ? lodges[0] : null;
}

export function getPlayerArmory(world: GameWorld, completedOnly = true): number | null {
  const armories = getPlayerEntities(world, EntityKind.Armory);
  for (const eid of armories) {
    if (!completedOnly || Building.progress[eid] >= 100) return eid;
  }
  return null;
}

export function getPlayerBurrows(world: GameWorld): number[] {
  return getPlayerEntities(world, EntityKind.Burrow);
}

export function getPlayerFishingHuts(world: GameWorld): number[] {
  return getPlayerEntities(world, EntityKind.FishingHut);
}

export function getPlayerHerbalistHuts(world: GameWorld): number[] {
  return getPlayerEntities(world, EntityKind.HerbalistHut);
}

export function getPlayerLodges(world: GameWorld): number[] {
  return getPlayerEntities(world, EntityKind.Lodge);
}

export function getPlayerArmyUnits(world: GameWorld): number[] {
  const all = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      !hasComponent(world.ecs, eid, IsBuilding) &&
      !hasComponent(world.ecs, eid, IsResource) &&
      EntityTypeTag.kind[eid] !== EntityKind.Commander,
  );
}

/** Game time in seconds (60 frames = 1 second at 1x speed). */
export function gameSeconds(world: GameWorld): number {
  return world.frameCount / 60;
}
