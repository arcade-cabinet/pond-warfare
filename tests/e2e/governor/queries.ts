/**
 * Governor ECS Query Helpers
 *
 * Read-only queries against the ECS world for the player governor.
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
import { game } from '@/game';
import { EntityKind, Faction, UnitState } from '@/types';

export function getPlayerEntities(kind?: EntityKind): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player) return false;
    if (Health.current[eid] <= 0) return false;
    if (kind !== undefined && EntityTypeTag.kind[eid] !== kind) return false;
    return true;
  });
}

export function getEnemyNests(): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  return Array.from(all).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Enemy &&
      EntityTypeTag.kind[eid] === EntityKind.PredatorNest &&
      Health.current[eid] > 0,
  );
}

export function getIdleGatherers(): number[] {
  return getPlayerEntities(EntityKind.Gatherer).filter(
    (eid) => UnitStateMachine.state[eid] === UnitState.Idle,
  );
}

export function getNearestResource(wx: number, wy: number): number | null {
  const w = game.world;
  const resources = query(w.ecs, [Position, Health, FactionTag, IsResource]);
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

export function getPlayerLodge(): number | null {
  const lodges = getPlayerEntities(EntityKind.Lodge);
  return lodges.length > 0 ? lodges[0] : null;
}

export function getPlayerArmory(completedOnly = true): number | null {
  const armories = getPlayerEntities(EntityKind.Armory);
  for (const eid of armories) {
    if (!completedOnly || Building.progress[eid] >= 100) return eid;
  }
  return null;
}

export function getPlayerBurrows(): number[] {
  return getPlayerEntities(EntityKind.Burrow);
}

export function getPlayerFishingHuts(): number[] {
  return getPlayerEntities(EntityKind.FishingHut);
}

export function getPlayerHerbalistHuts(): number[] {
  return getPlayerEntities(EntityKind.HerbalistHut);
}

export function getPlayerLodges(): number[] {
  return getPlayerEntities(EntityKind.Lodge);
}

export function getPlayerArmyUnits(): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      !hasComponent(w.ecs, eid, IsBuilding) &&
      !hasComponent(w.ecs, eid, IsResource) &&
      EntityTypeTag.kind[eid] !== EntityKind.Gatherer,
  );
}

/** Game time in seconds (60 frames = 1 second at 1x speed). */
export function gameSeconds(): number {
  return game.world.frameCount / 60;
}
