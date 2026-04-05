import type { ResourceType } from '@/types';

/** Stats and cost definition for a single entity type. */
export interface UnitDef {
  hp: number;
  speed: number;
  damage: number;
  attackRange: number;
  isBuilding: boolean;
  isResource: boolean;
  spriteSize: 16 | 32;
  spriteScale: number;
  resourceType?: ResourceType;
  resourceAmount?: number;
  foodCost?: number;
  fishCost?: number;
  logCost?: number;
  rockCost?: number;
  foodProvided?: number;
  /**
   * True if this building is a Lodge wing rather than a standalone structure.
   * Wings are conceptually attached to the Lodge and unlocked via the upgrade web.
   */
  isWing?: boolean;
}
