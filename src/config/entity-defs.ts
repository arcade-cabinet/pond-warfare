import { EntityKind, ResourceType } from '@/types';

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
  foodProvided?: number;
}

export const ENTITY_DEFS: Record<EntityKind, UnitDef> = {
  [EntityKind.Gatherer]: {
    hp: 30,
    speed: 2.0,
    damage: 2,
    attackRange: 40,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    clamCost: 50,
    twigCost: 0,
    foodCost: 1,
  },
  [EntityKind.Brawler]: {
    hp: 60,
    speed: 1.8,
    damage: 6,
    attackRange: 40,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    clamCost: 100,
    twigCost: 50,
    foodCost: 1,
  },
  [EntityKind.Sniper]: {
    hp: 40,
    speed: 1.6,
    damage: 8,
    attackRange: 180,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    clamCost: 80,
    twigCost: 80,
    foodCost: 1,
  },
  [EntityKind.Gator]: {
    hp: 60,
    speed: 1.8,
    damage: 6,
    attackRange: 40,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
  },
  [EntityKind.Snake]: {
    hp: 60,
    speed: 2.0,
    damage: 4,
    attackRange: 40,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
  },
  [EntityKind.Lodge]: {
    hp: 1500,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 200,
    twigCost: 150,
    foodProvided: 8, // Lodge supports 8 units (was 4) - allows early army
  },
  [EntityKind.Burrow]: {
    hp: 300,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 0,
    twigCost: 75, // Cheaper (was 100) - easier to expand
    foodProvided: 6, // More food cap per burrow (was 4)
  },
  [EntityKind.Armory]: {
    hp: 500,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 180, // Cheaper (was 250) - faster military transition
    twigCost: 120, // Cheaper (was 150)
  },
  [EntityKind.Tower]: {
    hp: 500,
    speed: 0,
    damage: 10,
    attackRange: 200,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 200,
    twigCost: 250,
  },
  [EntityKind.PredatorNest]: {
    hp: 1000,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
  },
  [EntityKind.Cattail]: {
    hp: 1,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: true,
    spriteSize: 16,
    spriteScale: 2.5,
    resourceType: ResourceType.Twigs,
    resourceAmount: 400,
  },
  [EntityKind.Clambed]: {
    hp: 1,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: true,
    spriteSize: 16,
    spriteScale: 2.5,
    resourceType: ResourceType.Clams,
    resourceAmount: 4000,
  },
  [EntityKind.Healer]: {
    hp: 25,
    speed: 1.8,
    damage: 0,
    attackRange: 0,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    clamCost: 80,
    twigCost: 60,
    foodCost: 1,
  },
  [EntityKind.Watchtower]: {
    hp: 800,
    speed: 0,
    damage: 15,
    attackRange: 280,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 400,
    twigCost: 350,
  },
  [EntityKind.BossCroc]: {
    hp: 200,
    speed: 1.2,
    damage: 15,
    attackRange: 50,
    isBuilding: false,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
  },
  [EntityKind.Shieldbearer]: {
    hp: 100,
    speed: 1.4,
    damage: 3,
    attackRange: 35,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    clamCost: 150,
    twigCost: 100,
    foodCost: 1,
  },
  [EntityKind.Scout]: {
    hp: 20,
    speed: 3.0,
    damage: 1,
    attackRange: 30,
    isBuilding: false,
    isResource: false,
    spriteSize: 16,
    spriteScale: 2.5,
    clamCost: 50,
    twigCost: 0,
    foodCost: 1,
  },
  [EntityKind.Catapult]: {
    hp: 50,
    speed: 0.8,
    damage: 20,
    attackRange: 250,
    isBuilding: false,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 300,
    twigCost: 200,
    foodCost: 1,
  },
  [EntityKind.Wall]: {
    hp: 400,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 0,
    twigCost: 50,
  },
  [EntityKind.ScoutPost]: {
    hp: 200,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 100,
    twigCost: 75,
  },
};

/**
 * Damage multiplier table for unit counter system.
 * Entries > 1.0 mean the attacker is strong against that defender.
 * Entries < 1.0 mean the attacker is weak against that defender.
 * Missing entries default to 1.0 (neutral).
 */
export const DAMAGE_MULTIPLIERS: Partial<Record<EntityKind, Partial<Record<EntityKind, number>>>> =
  {
    [EntityKind.Brawler]: {
      [EntityKind.Sniper]: 1.5,
      [EntityKind.Healer]: 1.5,
      [EntityKind.Gator]: 0.75,
    },
    [EntityKind.Sniper]: {
      [EntityKind.Healer]: 1.5,
      [EntityKind.Snake]: 1.5,
      [EntityKind.Brawler]: 0.75,
    },
    [EntityKind.Gator]: {
      [EntityKind.Brawler]: 1.5,
      [EntityKind.Sniper]: 0.75,
    },
    [EntityKind.Snake]: {
      [EntityKind.Sniper]: 1.5,
      [EntityKind.Brawler]: 0.75,
    },
    [EntityKind.Shieldbearer]: {
      [EntityKind.Sniper]: 1.5,
      [EntityKind.Gator]: 0.75,
    },
  };

/**
 * Get the damage multiplier for an attacker vs. a defender.
 * Returns 1.0 for matchups not in the table (including BossCroc).
 */
export function getDamageMultiplier(attackerKind: EntityKind, defenderKind: EntityKind): number {
  return DAMAGE_MULTIPLIERS[attackerKind]?.[defenderKind] ?? 1.0;
}

export function entityKindFromString(name: string): EntityKind {
  const map: Record<string, EntityKind> = {
    gatherer: EntityKind.Gatherer,
    brawler: EntityKind.Brawler,
    sniper: EntityKind.Sniper,
    gator: EntityKind.Gator,
    snake: EntityKind.Snake,
    lodge: EntityKind.Lodge,
    burrow: EntityKind.Burrow,
    armory: EntityKind.Armory,
    tower: EntityKind.Tower,
    predator_nest: EntityKind.PredatorNest,
    cattail: EntityKind.Cattail,
    clambed: EntityKind.Clambed,
    healer: EntityKind.Healer,
    watchtower: EntityKind.Watchtower,
    boss_croc: EntityKind.BossCroc,
    shieldbearer: EntityKind.Shieldbearer,
    scout: EntityKind.Scout,
    catapult: EntityKind.Catapult,
    wall: EntityKind.Wall,
    scout_post: EntityKind.ScoutPost,
  };
  const kind = map[name];
  if (kind === undefined) {
    throw new Error(`Unknown entity kind: "${name}"`);
  }
  return kind;
}

export function entityKindName(kind: EntityKind): string {
  const names: Record<EntityKind, string> = {
    [EntityKind.Gatherer]: 'Gatherer',
    [EntityKind.Brawler]: 'Brawler',
    [EntityKind.Sniper]: 'Sniper',
    [EntityKind.Gator]: 'Gator',
    [EntityKind.Snake]: 'Snake',
    [EntityKind.Lodge]: 'Lodge',
    [EntityKind.Burrow]: 'Burrow',
    [EntityKind.Armory]: 'Armory',
    [EntityKind.Tower]: 'Tower',
    [EntityKind.PredatorNest]: 'Predator Nest',
    [EntityKind.Cattail]: 'Cattail',
    [EntityKind.Clambed]: 'Clambed',
    [EntityKind.Healer]: 'Healer',
    [EntityKind.Watchtower]: 'Watchtower',
    [EntityKind.BossCroc]: 'Boss Croc',
    [EntityKind.Shieldbearer]: 'Shieldbearer',
    [EntityKind.Scout]: 'Scout',
    [EntityKind.Catapult]: 'Catapult',
    [EntityKind.Wall]: 'Wall',
    [EntityKind.ScoutPost]: 'Scout Post',
  };
  return names[kind];
}
