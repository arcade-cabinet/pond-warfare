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
  clamCost?: number;
  twigCost?: number;
  pearlCost?: number;
  foodProvided?: number;
}
