export enum Faction {
  Player = 0,
  Enemy = 1,
  Neutral = 2,
}

export enum UnitState {
  Idle = 0,
  Move = 1,
  GatherMove = 2,
  Gathering = 3,
  ReturnMove = 4,
  BuildMove = 5,
  Building = 6,
  RepairMove = 7,
  Repairing = 8,
  AttackMove = 9,
  Attacking = 10,
  AttackMovePatrol = 11,
}

export enum EntityKind {
  Gatherer = 0,
  Brawler = 1,
  Sniper = 2,
  Gator = 3,
  Snake = 4,
  Lodge = 5,
  Burrow = 6,
  Armory = 7,
  Tower = 8,
  PredatorNest = 9,
  Cattail = 10,
  Clambed = 11,
  Healer = 12,
  Watchtower = 13,
  BossCroc = 14,
  Shieldbearer = 15,
  Scout = 16,
  Catapult = 17,
  Wall = 18,
  ScoutPost = 19,
  ArmoredGator = 20,
  VenomSnake = 21,
  SwampDrake = 22,
  SiegeTurtle = 23,
  AlphaPredator = 24,
  PearlBed = 25,
  FishingHut = 26,
  HerbalistHut = 27,
  Swimmer = 28,
  Trapper = 29,
}

/** Entity kinds that represent buildings (get larger vision radius, etc.). */
export const BUILDING_KINDS: ReadonlySet<EntityKind> = new Set([
  EntityKind.Lodge,
  EntityKind.Burrow,
  EntityKind.Armory,
  EntityKind.Tower,
  EntityKind.PredatorNest,
  EntityKind.Watchtower,
  EntityKind.Wall,
  EntityKind.ScoutPost,
  EntityKind.FishingHut,
  EntityKind.HerbalistHut,
]);

export enum ResourceType {
  None = 0,
  Clams = 1,
  Twigs = 2,
  Pearls = 3,
}

/**
 * Sprite identifiers for all procedurally-generated sprites.
 *
 * IMPORTANT: Values 0–19 correspond to EntityKind values for entity sprites,
 * ensuring that entity kinds can be directly used as sprite IDs. The enum
 * explicitly references EntityKind for these entries so that changes to
 * EntityKind will be caught at compile time.
 *
 * Bones and Rubble are non-entity visual sprites (corpse/ruin overlays) and
 * remain independent values.
 */
export enum SpriteId {
  Gatherer = EntityKind.Gatherer,
  Brawler = EntityKind.Brawler,
  Sniper = EntityKind.Sniper,
  Gator = EntityKind.Gator,
  Snake = EntityKind.Snake,
  Lodge = EntityKind.Lodge,
  Burrow = EntityKind.Burrow,
  Armory = EntityKind.Armory,
  Tower = EntityKind.Tower,
  PredatorNest = EntityKind.PredatorNest,
  Cattail = EntityKind.Cattail,
  Clambed = EntityKind.Clambed,
  Healer = EntityKind.Healer,
  Watchtower = EntityKind.Watchtower,
  BossCroc = EntityKind.BossCroc,
  Shieldbearer = EntityKind.Shieldbearer,
  Scout = EntityKind.Scout,
  Catapult = EntityKind.Catapult,
  Wall = EntityKind.Wall,
  ScoutPost = EntityKind.ScoutPost,
  ArmoredGator = EntityKind.ArmoredGator,
  VenomSnake = EntityKind.VenomSnake,
  SwampDrake = EntityKind.SwampDrake,
  SiegeTurtle = EntityKind.SiegeTurtle,
  AlphaPredator = EntityKind.AlphaPredator,
  PearlBed = EntityKind.PearlBed,
  FishingHut = EntityKind.FishingHut,
  HerbalistHut = EntityKind.HerbalistHut,
  Swimmer = EntityKind.Swimmer,
  Trapper = EntityKind.Trapper,
  // Non-entity visual sprites
  Bones = 30,
  Rubble = 31,
}

export interface GameResources {
  clams: number;
  twigs: number;
  pearls: number;
  food: number;
  maxFood: number;
}

export interface GameStats {
  unitsKilled: number;
  unitsLost: number;
  resourcesGathered: number;
  buildingsBuilt: number;
  peakArmy: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface Corpse {
  id: number;
  x: number;
  y: number;
  spriteId: SpriteId;
  life: number;
  maxLife: number;
}

let nextCorpseId = 1;
export function createCorpseId(): number {
  return nextCorpseId++;
}
/** Reset the corpse ID counter (useful for tests and game restarts). */
export function resetCorpseIdCounter(): void {
  nextCorpseId = 1;
}

export interface MinimapPing {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

export interface GroundPing {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
}

export interface ProjectileTrail {
  x: number;
  y: number;
  life: number;
}

export type GameState = 'playing' | 'win' | 'lose';

export interface TooltipData {
  title: string;
  cost: string;
  description: string;
  hotkey: string;
  /** Individual resource costs for detailed breakdown */
  costBreakdown?: { clams?: number; twigs?: number; pearls?: number; food?: number };
  /** Tech requirement label, e.g. "Requires: Eagle Eye" */
  requires?: string;
}
