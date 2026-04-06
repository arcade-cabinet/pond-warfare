import { EntityKind, ResourceType } from '@/types';
import type { UnitDef } from './unit-def';

/** Stats for all harvestable resource nodes. */
export const RESOURCE_DEFS: Partial<Record<EntityKind, UnitDef>> = {
  [EntityKind.Cattail]: {
    hp: 1,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: true,
    spriteSize: 16,
    spriteScale: 2.5,
    resourceType: ResourceType.Logs,
    resourceAmount: 400,
  },
  [EntityKind.Clambed]: {
    hp: 1,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: true,
    spriteSize: 32,
    spriteScale: 3,
    resourceType: ResourceType.Fish,
    resourceAmount: 4000,
  },
  [EntityKind.PearlBed]: {
    hp: 1,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: true,
    spriteSize: 16,
    spriteScale: 2.5,
    resourceType: ResourceType.Rocks,
    resourceAmount: 500,
  },
};
