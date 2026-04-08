import {
  COMPAT_SABOTEUR_CHASSIS_KIND,
  COMPAT_SAPPER_CHASSIS_KIND,
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';
import { BUILDING_DEFS } from './buildings';

const ENTITY_KIND_ALIASES: Record<string, EntityKind> = {
  gatherer: MUDPAW_KIND,
  mudpaw: MUDPAW_KIND,
  fisher: MUDPAW_KIND,
  logger: MUDPAW_KIND,
  digger: MUDPAW_KIND,
  // Historical compatibility melee/ranged ids.
  brawler: COMPAT_SAPPER_CHASSIS_KIND,
  sniper: COMPAT_SABOTEUR_CHASSIS_KIND,
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
  shieldbearer: EntityKind.Shieldbearer,
  lookout: LOOKOUT_KIND,
  guard: SAPPER_KIND,
  ranger: SABOTEUR_KIND,
  bombardier: SAPPER_KIND,
  catapult: EntityKind.Catapult,
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
  swimmer: EntityKind.Swimmer,
  trapper: EntityKind.Trapper,
  commander: EntityKind.Commander,
  frog: EntityKind.Frog,
  fish: EntityKind.Fish,
  diver: EntityKind.Diver,
  engineer: EntityKind.Engineer,
  shaman: EntityKind.Shaman,
  burrowing_worm: EntityKind.BurrowingWorm,
  flying_heron: EntityKind.FlyingHeron,
  market: EntityKind.Market,
  // v2.0.0
  dock: EntityKind.Dock,
  otter_warship: EntityKind.OtterWarship,
  berserker: EntityKind.Berserker,
  wall_gate: EntityKind.WallGate,
  shrine: EntityKind.Shrine,
  // v3.0.0
  sapper: SAPPER_KIND,
  saboteur: SABOTEUR_KIND,
};

const ENTITY_KIND_LABELS: Record<EntityKind, string> = {
  [MUDPAW_KIND]: 'Mudpaw',
  [COMPAT_SAPPER_CHASSIS_KIND]: 'Sapper',
  [COMPAT_SABOTEUR_CHASSIS_KIND]: 'Saboteur',
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
  [EntityKind.Shieldbearer]: 'Shieldbearer',
  [LOOKOUT_KIND]: 'Lookout',
  [EntityKind.Catapult]: 'Catapult',
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
  [EntityKind.Swimmer]: 'Swimmer',
  [EntityKind.Trapper]: 'Trapper',
  [EntityKind.Commander]: 'Commander',
  [EntityKind.Frog]: 'Frog',
  [EntityKind.Fish]: 'Fish',
  [EntityKind.Diver]: 'Diver',
  [EntityKind.Engineer]: 'Engineer',
  [EntityKind.Shaman]: 'Shaman',
  [EntityKind.BurrowingWorm]: 'Burrowing Worm',
  [EntityKind.FlyingHeron]: 'Flying Heron',
  [EntityKind.Market]: 'Market',
  // v2.0.0
  [EntityKind.Dock]: 'Dock',
  [EntityKind.OtterWarship]: 'Otter Warship',
  [EntityKind.Berserker]: 'Berserker',
  [EntityKind.WallGate]: 'Wall Gate',
  [EntityKind.Shrine]: 'Shrine',
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
