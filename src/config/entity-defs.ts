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
    foodProvided: 4,
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
    twigCost: 100,
    foodProvided: 4,
  },
  [EntityKind.Armory]: {
    hp: 600,
    speed: 0,
    damage: 0,
    attackRange: 0,
    isBuilding: true,
    isResource: false,
    spriteSize: 32,
    spriteScale: 3,
    clamCost: 250,
    twigCost: 150,
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
    resourceAmount: 1000,
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
    resourceAmount: 25000,
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
};

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
  };
  return names[kind];
}
