import {
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
  SHARED_HEAVY_CHASSIS_KIND,
  SHARED_SABOTEUR_CHASSIS_KIND,
  SHARED_SAPPER_CHASSIS_KIND,
  SHARED_SIEGE_CHASSIS_KIND,
} from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';
import type { UnitDef } from './unit-def';

/**
 * Stats for player-side otter units plus ambient neutral critters.
 *
 * Important:
 * - The live player-facing manual roster is `Mudpaw / Medic / Sapper / Saboteur`.
 * - Reserved alias ids still exist in the enum, but they now collapse onto the
 *   live Sapper/Saboteur stat lines instead of carrying a separate combat model.
 */
const SAPPER_DEF: UnitDef = {
  hp: 40,
  speed: 1.5,
  damage: 15,
  attackRange: 40,
  isBuilding: false,
  isResource: false,
  spriteSize: 16,
  spriteScale: 2.5,
  fishCost: 25,
  rockCost: 15,
  logCost: 0,
  foodCost: 1,
};

const SABOTEUR_DEF: UnitDef = {
  hp: 30,
  speed: 2.5,
  damage: 5,
  attackRange: 40,
  isBuilding: false,
  isResource: false,
  spriteSize: 16,
  spriteScale: 2.5,
  fishCost: 20,
  rockCost: 10,
  logCost: 0,
  foodCost: 1,
};

const RESERVED_UNIT_DEF: UnitDef = {
  hp: 30,
  speed: 2.0,
  damage: 0,
  attackRange: 0,
  isBuilding: false,
  isResource: false,
  spriteSize: 16,
  spriteScale: 2.5,
  fishCost: 0,
  logCost: 0,
  foodCost: 0,
};

export const PLAYER_UNIT_DEFS: Partial<Record<EntityKind, UnitDef>> = {
  // Canonical live manual generalist chassis (`Mudpaw` display label).
  [MUDPAW_KIND]: {
    hp: 30,
    speed: 2.0,
    damage: 2,
    attackRange: 40,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    fishCost: 10,
    logCost: 0,
    foodCost: 1,
  },
  [SHARED_SAPPER_CHASSIS_KIND]: SAPPER_DEF,
  [SHARED_SABOTEUR_CHASSIS_KIND]: SABOTEUR_DEF,
  [MEDIC_KIND]: {
    hp: 35,
    speed: 1.8,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    fishCost: 15,
    logCost: 0,
    foodCost: 1,
  },
  [SHARED_HEAVY_CHASSIS_KIND]: SAPPER_DEF,
  // Shared recon chassis. The live autonomous recon specialist is `Lookout`,
  // which currently rides this lower-level entity kind.
  [LOOKOUT_KIND]: {
    hp: 20,
    speed: 3.0,
    damage: 1,
    attackRange: 30,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    fishCost: 8,
    logCost: 0,
    foodCost: 1,
  },
  [SHARED_SIEGE_CHASSIS_KIND]: SAPPER_DEF,
  [EntityKind.ReservedUnit28]: RESERVED_UNIT_DEF,
  [EntityKind.ReservedUnit29]: RESERVED_UNIT_DEF,
  [EntityKind.Commander]: {
    hp: 150,
    speed: 1.8,
    damage: 8,
    attackRange: 60,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 5.0,
  },
  [EntityKind.ReservedUnit33]: RESERVED_UNIT_DEF,
  [EntityKind.ReservedUnit34]: RESERVED_UNIT_DEF,
  [EntityKind.Shaman]: {
    hp: 30,
    speed: 1.6,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    fishCost: 70,
    logCost: 50,
    foodCost: 1,
  },
  [EntityKind.ReservedUnit40]: RESERVED_UNIT_DEF,
  [EntityKind.ReservedUnit41]: RESERVED_UNIT_DEF,
  // --- Canonical live late-stage manual units ---
  [SAPPER_KIND]: SAPPER_DEF,
  [SABOTEUR_KIND]: SABOTEUR_DEF,
  // Ambient critters (no cost, no combat role)
  [EntityKind.Frog]: {
    hp: 5,
    speed: 0.5,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
  },
  [EntityKind.Fish]: {
    hp: 5,
    speed: 1.0,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
  },
};
