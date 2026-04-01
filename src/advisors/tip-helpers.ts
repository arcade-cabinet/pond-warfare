/**
 * Advisor Tip Helpers
 *
 * Lightweight ECS query helpers used by tip condition functions.
 * Each runs a single query and filters by faction/kind/state.
 * Keep these small -- they execute every evaluation cycle (~60 frames).
 */

import { query } from 'bitecs';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Resource,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Count completed player buildings of a given kind. */
export function countPlayerBuildings(world: GameWorld, kind: EntityKind): number {
  const ents = query(world.ecs, [Health, IsBuilding, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) === kind) count++;
  }
  return count;
}

/** Count living player combat units (excludes gatherers, healers, commanders). */
export function countPlayerCombatUnits(world: GameWorld): number {
  const ents = query(world.ecs, [Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (
      kind === EntityKind.Brawler ||
      kind === EntityKind.Sniper ||
      kind === EntityKind.Shieldbearer ||
      kind === EntityKind.Catapult ||
      kind === EntityKind.Swimmer ||
      kind === EntityKind.Trapper
    ) {
      count++;
    }
  }
  return count;
}

/** Count living enemy mobile units (excludes buildings). */
export function countEnemyUnits(world: GameWorld): number {
  const ents = query(world.ecs, [Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind !== EntityKind.PredatorNest && kind !== EntityKind.Burrow) count++;
  }
  return count;
}

/** Count idle player gatherers (UnitState.Idle === 0). */
export function countIdleGatherers(world: GameWorld): number {
  const ents = query(world.ecs, [Health, FactionTag, EntityTypeTag, UnitStateMachine]);
  let count = 0;
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Gatherer) continue;
    if (UnitStateMachine.state[eid] === 0) count++;
  }
  return count;
}

/** Sum remaining resource amounts on all clam beds. */
export function totalClamResources(world: GameWorld): number {
  const ents = query(world.ecs, [IsResource, Resource, Health]);
  let total = 0;
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (Health.current[eid] <= 0) continue;
    if (Resource.resourceType[eid] === 1) total += Resource.amount[eid];
  }
  return total;
}

/** True if any tech in the tree has been researched. */
export function anyTechResearched(world: GameWorld): boolean {
  for (const val of Object.values(world.tech)) {
    if (val) return true;
  }
  return false;
}

/** True if player lodge exists and its HP is below max (taking damage). */
export function lodgeUnderPressure(world: GameWorld): boolean {
  const ents = query(world.ecs, [Health, IsBuilding, FactionTag, EntityTypeTag]);
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Lodge) continue;
    if (Health.current[eid] > 0 && Health.current[eid] < Health.max[eid]) return true;
  }
  return false;
}
