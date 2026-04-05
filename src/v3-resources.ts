/**
 * v3 Resource Helpers
 *
 * Provides nodeKindToResourceType() for consistent mapping
 * from resource node EntityKind to v3 ResourceType.
 */

import { EntityKind, ResourceType } from './types';

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
