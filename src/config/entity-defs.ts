/**
 * Entity Definitions
 *
 * Assembles the central ENTITY_DEFS record from per-category sub-modules and
 * re-exports all public symbols so existing import paths are unchanged.
 *
 * Sub-modules live in src/config/entity-defs/:
 *   unit-def.ts          – UnitDef interface
 *   player-units.ts      – player-trainable units + neutral critters
 *   enemy-units.ts       – enemy units
 *   buildings.ts         – all buildings
 *   resources.ts         – harvestable resource nodes
 *   damage-multipliers.ts – counter table + getDamageMultiplier
 *   kind-helpers.ts      – entityKindFromString + entityKindName + isWingBuilding
 */

import type { EntityKind } from '@/types';
import { BUILDING_DEFS } from './entity-defs/buildings';
import {
  DAMAGE_MULTIPLIERS,
  getDamageMultiplier,
  SIEGE_BUILDING_MULTIPLIER,
} from './entity-defs/damage-multipliers';
import { ENEMY_UNIT_DEFS } from './entity-defs/enemy-units';
import { entityKindFromString, entityKindName, isWingBuilding } from './entity-defs/kind-helpers';
import { PLAYER_UNIT_DEFS } from './entity-defs/player-units';
import { RESOURCE_DEFS } from './entity-defs/resources';
import type { UnitDef } from './entity-defs/unit-def';

export type { UnitDef };
export {
  DAMAGE_MULTIPLIERS,
  entityKindFromString,
  entityKindName,
  getDamageMultiplier,
  isWingBuilding,
  SIEGE_BUILDING_MULTIPLIER,
};

/** Complete entity definitions map. One entry per EntityKind. */
export const ENTITY_DEFS: Record<EntityKind, UnitDef> = {
  ...PLAYER_UNIT_DEFS,
  ...ENEMY_UNIT_DEFS,
  ...BUILDING_DEFS,
  ...RESOURCE_DEFS,
} as Record<EntityKind, UnitDef>;
