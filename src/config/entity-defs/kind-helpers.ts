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
import { BUILDING_DEFS } from './buildings';

const ENTITY_KIND_ALIASES: Record<string, EntityKind> = {
  mudpaw: MUDPAW_KIND,
  fisher: MUDPAW_KIND,
  logger: MUDPAW_KIND,
  digger: MUDPAW_KIND,
  gator: EntityKind.Gator,
  snake: EntityKind.Snake,
  lodge: EntityKind.Lodge,
  burrow: EntityKind.Burrow,
  armory: EntityKind.Armory,
  tower: EntityKind.Tower,
  predator_nest: EntityKind.PredatorNest,
  cattail: EntityKind.Cattail,
  clambed: EntityKind.Clambed,
  medic: MEDIC_KIND,
  watchtower: EntityKind.Watchtower,
  boss_croc: EntityKind.BossCroc,
  shared_heavy_chassis: SHARED_HEAVY_CHASSIS_KIND,
  lookout: LOOKOUT_KIND,
  guard: SAPPER_KIND,
  ranger: SABOTEUR_KIND,
  bombardier: SAPPER_KIND,
  shared_siege_chassis: SHARED_SIEGE_CHASSIS_KIND,
  wall: EntityKind.Wall,
  lookout_post: EntityKind.LookoutPost,
  armored_gator: EntityKind.ArmoredGator,
  venom_snake: EntityKind.VenomSnake,
  swamp_drake: EntityKind.SwampDrake,
  siege_turtle: EntityKind.SiegeTurtle,
  alpha_predator: EntityKind.AlphaPredator,
  pearl_bed: EntityKind.PearlBed,
  fishing_hut: EntityKind.FishingHut,
  herbalist_hut: EntityKind.HerbalistHut,
  reserved_unit_28: EntityKind.ReservedUnit28,
  reserved_unit_29: EntityKind.ReservedUnit29,
  commander: EntityKind.Commander,
  frog: EntityKind.Frog,
  fish: EntityKind.Fish,
  reserved_unit_33: EntityKind.ReservedUnit33,
  shaman: EntityKind.Shaman,
  burrowing_worm: EntityKind.BurrowingWorm,
  flying_heron: EntityKind.FlyingHeron,
  market: EntityKind.Market,
  reserved_building_39: EntityKind.ReservedBuilding39,
  reserved_unit_40: EntityKind.ReservedUnit40,
  reserved_unit_41: EntityKind.ReservedUnit41,
  reserved_building_42: EntityKind.ReservedBuilding42,
  reserved_building_43: EntityKind.ReservedBuilding43,
  // v3.0.0
  sapper: SAPPER_KIND,
  saboteur: SABOTEUR_KIND,
};

const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
  [MUDPAW_KIND]: 'Mudpaw',
  [SHARED_SAPPER_CHASSIS_KIND]: 'Sapper',
  [SHARED_SABOTEUR_CHASSIS_KIND]: 'Saboteur',
  [EntityKind.Gator]: 'Gator',
  [EntityKind.Snake]: 'Snake',
  [EntityKind.Lodge]: 'Lodge',
  [EntityKind.Burrow]: 'Burrow',
  [EntityKind.Armory]: 'Armory',
  [EntityKind.Tower]: 'Tower',
  [EntityKind.PredatorNest]: 'Predator Nest',
  [EntityKind.Cattail]: 'Cattail',
  [EntityKind.Clambed]: 'Clambed',
  [MEDIC_KIND]: 'Medic',
  [EntityKind.Watchtower]: 'Watchtower',
  [EntityKind.BossCroc]: 'Boss Croc',
  [SHARED_HEAVY_CHASSIS_KIND]: 'Shared Heavy Chassis',
  [LOOKOUT_KIND]: 'Lookout',
  [SHARED_SIEGE_CHASSIS_KIND]: 'Shared Siege Chassis',
  [EntityKind.Wall]: 'Wall',
  [EntityKind.LookoutPost]: 'Lookout Post',
  [EntityKind.ArmoredGator]: 'Armored Gator',
  [EntityKind.VenomSnake]: 'Venom Snake',
  [EntityKind.SwampDrake]: 'Swamp Drake',
  [EntityKind.SiegeTurtle]: 'Siege Turtle',
  [EntityKind.AlphaPredator]: 'Alpha Predator',
  [EntityKind.PearlBed]: 'Pearl Bed',
  [EntityKind.FishingHut]: 'Fishing Hut',
  [EntityKind.HerbalistHut]: 'Herbalist Hut',
  [EntityKind.ReservedUnit28]: 'Reserved Unit',
  [EntityKind.ReservedUnit29]: 'Reserved Unit',
  [EntityKind.Commander]: 'Commander',
  [EntityKind.Frog]: 'Frog',
  [EntityKind.Fish]: 'Fish',
  [EntityKind.ReservedUnit33]: 'Reserved Unit',
  [EntityKind.ReservedUnit34]: 'Reserved Unit',
  [EntityKind.Shaman]: 'Shaman',
  [EntityKind.BurrowingWorm]: 'Burrowing Worm',
  [EntityKind.FlyingHeron]: 'Flying Heron',
  [EntityKind.Market]: 'Market',
  [EntityKind.ReservedBuilding39]: 'Reserved Building',
  [EntityKind.ReservedUnit40]: 'Reserved Unit',
  [EntityKind.ReservedUnit41]: 'Reserved Unit',
  [EntityKind.ReservedBuilding42]: 'Reserved Building',
  [EntityKind.ReservedBuilding43]: 'Reserved Building',
  // v3.0.0
  [SAPPER_KIND]: 'Sapper',
  [SABOTEUR_KIND]: 'Saboteur',
};

export function entityKindFromString(name: string): EntityKind {
  const kind = ENTITY_KIND_ALIASES[name.trim().toLowerCase()];
  if (kind === undefined) {
    throw new Error(`Unknown entity kind: "${name}"`);
  }
  return kind;
}

export function entityKindName(kind: EntityKind): string {
  return ENTITY_KIND_LABELS[kind];
}

/**
 * Check whether a given EntityKind is a Lodge wing (not a standalone building).
 * Wings are buildings that conceptually attach to the Lodge and are unlocked
 * via the upgrade web rather than placed as standalone structures.
 */
export function isWingBuilding(kind: EntityKind): boolean {
  const def = BUILDING_DEFS[kind];
  return def?.isWing === true;
}
