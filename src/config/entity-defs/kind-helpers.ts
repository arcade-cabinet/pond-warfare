import { EntityKind } from '@/types';
import { BUILDING_DEFS } from './buildings';

export function entityKindFromString(name: string): EntityKind {
  const map: Record<string, EntityKind> = {
    gatherer: EntityKind.Gatherer,
    mudpaw: EntityKind.Gatherer,
    // Historical compatibility melee/ranged ids.
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
    medic: EntityKind.Healer,
    watchtower: EntityKind.Watchtower,
    boss_croc: EntityKind.BossCroc,
    shieldbearer: EntityKind.Shieldbearer,
    scout: EntityKind.Scout,
    lookout: EntityKind.Scout,
    catapult: EntityKind.Catapult,
    wall: EntityKind.Wall,
    scout_post: EntityKind.ScoutPost,
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
    sapper: EntityKind.Sapper,
    saboteur: EntityKind.Saboteur,
  };
  const kind = map[name];
  if (kind === undefined) {
    throw new Error(`Unknown entity kind: "${name}"`);
  }
  return kind;
}

export function entityKindName(kind: EntityKind): string {
  const names: Record<EntityKind, string> = {
    [EntityKind.Gatherer]: 'Mudpaw',
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
    [EntityKind.Healer]: 'Medic',
    [EntityKind.Watchtower]: 'Watchtower',
    [EntityKind.BossCroc]: 'Boss Croc',
    [EntityKind.Shieldbearer]: 'Shieldbearer',
    // The live player-facing recon specialist on this chassis is `Lookout`.
    [EntityKind.Scout]: 'Lookout',
    [EntityKind.Catapult]: 'Catapult',
    [EntityKind.Wall]: 'Wall',
    [EntityKind.ScoutPost]: 'Scout Post',
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
    [EntityKind.Sapper]: 'Sapper',
    [EntityKind.Saboteur]: 'Saboteur',
  };
  return names[kind];
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
