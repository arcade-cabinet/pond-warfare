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
  Retreat = 12,
  PatrolMove = 13,
}

/**
 * Shared stable entity ids.
 *
 * Numeric ids remain stable for saved data and ECS state, while the member
 * names reflect the canonical live roster and the shared chassis that still
 * back a few runtime mappings.
 */
export enum EntityKind {
  Mudpaw = 0,
  SharedSapperChassis = 1,
  SharedSaboteurChassis = 2,
  Gator = 3,
  Snake = 4,
  Lodge = 5,
  Burrow = 6,
  Armory = 7,
  Tower = 8,
  PredatorNest = 9,
  Cattail = 10,
  Clambed = 11,
  Medic = 12,
  Watchtower = 13,
  BossCroc = 14,
  Shieldbearer = 15,
  Lookout = 16,
  Catapult = 17,
  Wall = 18,
  LookoutPost = 19,
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
  Commander = 30,
  Frog = 31,
  Fish = 32,
  Diver = 33,
  Engineer = 34,
  Shaman = 35,
  BurrowingWorm = 36,
  FlyingHeron = 37,
  Market = 38,
  // v2.0.0 entities
  Dock = 39,
  OtterWarship = 40,
  Berserker = 41,
  WallGate = 42,
  Shrine = 43,
  // v3.0.0 entities
  Sapper = 44,
  Saboteur = 45,
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
  EntityKind.LookoutPost,
  EntityKind.FishingHut,
  EntityKind.HerbalistHut,
  EntityKind.Market,
  EntityKind.Dock,
  EntityKind.WallGate,
  EntityKind.Shrine,
]);

export enum ResourceType {
  None = 0,
  Fish = 1,
  Logs = 2,
  Rocks = 3,
}

/**
 * Shared stable sprite ids.
 *
 * Like `EntityKind`, these numeric ids stay stable while the member names
 * follow the canonical live roster and the shared chassis still used under it.
 */
export enum SpriteId {
  Mudpaw = 0,
  SharedSapperChassis = 1,
  SharedSaboteurChassis = 2,
  Gator = 3,
  Snake = 4,
  Lodge = 5,
  Burrow = 6,
  Armory = 7,
  Tower = 8,
  PredatorNest = 9,
  Cattail = 10,
  Clambed = 11,
  Medic = 12,
  Watchtower = 13,
  BossCroc = 14,
  Shieldbearer = 15,
  Lookout = 16,
  Catapult = 17,
  Wall = 18,
  LookoutPost = 19,
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
  Commander = 30,
  Frog = 31,
  Fish = 32,
  Diver = 33,
  Engineer = 34,
  Shaman = 35,
  BurrowingWorm = 36,
  FlyingHeron = 37,
  Market = 38,
  // v2.0.0 sprites
  Dock = 39,
  OtterWarship = 40,
  Berserker = 41,
  WallGate = 42,
  Shrine = 43,
  // v3.0.0 sprites
  Sapper = 44,
  Saboteur = 45,
  // Non-entity visual sprites
  Bones = 50,
  Rubble = 51,
}

/** In-match resources. v3: Fish, Logs, Rocks. */
export interface GameResources {
  fish: number;
  logs: number;
  rocks: number;
  food: number;
  maxFood: number;
}

/** Re-export nodeKindToResourceType from dedicated module. */
export { nodeKindToResourceType } from './v3-resources';

export interface GameStats {
  unitsKilled: number;
  unitsLost: number;
  unitsTrained: number;
  resourcesGathered: number;
  buildingsBuilt: number;
  buildingsLost: number;
  peakArmy: number;
  pearlsEarned: number;
  totalFishEarned: number;
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
  costBreakdown?: { fish?: number; logs?: number; rocks?: number; food?: number };
  requires?: string;
  statLines?: { label: string; value: string }[];
  status?: string;
  statusColor?: string;
}

/** Extended game stats tracked per match for achievements. */
export interface ExtendedStats {
  weatherTypesExperienced: number;
  warshipKills: number;
  bridgesBuilt: number;
  diverAmbushKills: number;
  marketTrades: number;
  maxBerserkerKills: number;
  shrineAbilitiesUsed: number;
  coopMode: boolean;
  dailyChallengesCompleted: number;
  playerLevel: number;
  perfectPuzzleCount: number;
  randomEventsExperienced: number;
  wallsBuilt: number;
  enemiesBlockedByGates: number;
}
