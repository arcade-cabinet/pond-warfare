/**
 * v3 Resource Helpers
 *
 * Getter/setter aliases for the v3 resource naming convention.
 * Fish = clams, Rocks = pearls, Logs = twigs.
 *
 * Also provides nodeKindToResourceType() for consistent mapping
 * from resource node EntityKind to v3 ResourceType.
 */

import { EntityKind, ResourceType, type GameResources } from './types';

/** Get Fish count (alias for clams). */
export function getFish(r: GameResources): number {
  return r.clams;
}

/** Set Fish count (alias for clams). */
export function setFish(r: GameResources, v: number): void {
  r.clams = v;
}

/** Get Rocks count (alias for pearls). */
export function getRocks(r: GameResources): number {
  return r.pearls;
}

/** Set Rocks count (alias for pearls). */
export function setRocks(r: GameResources, v: number): void {
  r.pearls = v;
}

/** Get Logs count (alias for twigs). */
export function getLogs(r: GameResources): number {
  return r.twigs;
}

/** Set Logs count (alias for twigs). */
export function setLogs(r: GameResources, v: number): void {
  r.twigs = v;
}

/**
 * Map an EntityKind (resource node) to the v3 ResourceType it yields.
 * Clambed (fish node) -> Fish, PearlBed (rock deposit) -> Rocks,
 * Cattail (tree cluster) -> Logs.
 */
export function nodeKindToResourceType(kind: EntityKind): ResourceType {
  switch (kind) {
    case EntityKind.Clambed:
      return ResourceType.Fish;
    case EntityKind.PearlBed:
      return ResourceType.Rocks;
    case EntityKind.Cattail:
      return ResourceType.Logs;
    default:
      return ResourceType.None;
  }
}
