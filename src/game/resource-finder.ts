/**
 * Resource Finder — helpers for locating resources by type and clearing
 * manual task overrides from the Forces tab.
 */

import { query } from 'bitecs';
import {
  Health,
  IsResource,
  Position,
  Resource,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, ResourceType, UnitState } from '@/types';

/** Map from EntityKind of a resource node to its ResourceType enum value. */
const KIND_TO_RESOURCE: Partial<Record<EntityKind, ResourceType>> = {
  [EntityKind.Clambed]: ResourceType.Clams,
  [EntityKind.Cattail]: ResourceType.Twigs,
  [EntityKind.PearlBed]: ResourceType.Pearls,
};

/**
 * Find the nearest resource entity of a given type that still has amount > 0.
 * Returns the entity ID of the closest match, or -1 if none found.
 *
 * @param resourceType - The ResourceType to search for (Clams, Twigs, Pearls).
 */
export function findNearestResourceByType(
  world: GameWorld,
  eid: number,
  resourceType: ResourceType,
): number {
  const resources = query(world.ecs, [Position, Health, IsResource, Resource]);
  const ux = Position.x[eid];
  const uy = Position.y[eid];
  let best = -1;
  let bestDist = Infinity;

  for (let i = 0; i < resources.length; i++) {
    const rid = resources[i];
    if (Resource.amount[rid] <= 0) continue;
    if (Resource.resourceType[rid] !== resourceType) continue;

    const dx = Position.x[rid] - ux;
    const dy = Position.y[rid] - uy;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = rid;
    }
  }

  return best;
}

/**
 * Resolve an EntityKind (Clambed, Cattail, PearlBed) to its ResourceType.
 * Returns ResourceType.None for non-resource kinds.
 */
export function kindToResourceType(kind: EntityKind): ResourceType {
  return KIND_TO_RESOURCE[kind] ?? ResourceType.None;
}

/**
 * Clear a unit's manual task override, returning it to the auto-behavior pool.
 * Also resets the unit state to Idle so the auto-behavior system picks it up.
 */
export function clearTaskOverride(eid: number): void {
  TaskOverride.active[eid] = 0;
  TaskOverride.task[eid] = UnitState.Idle;
  TaskOverride.targetEntity[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
}
