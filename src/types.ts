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
  EntityKind.Market,
  EntityKind.Dock,
  EntityKind.WallGate,
  EntityKind.Shrine,
]);

export enum ResourceType {
  None = 0,
  /** v2 name retained for backward compat. v3 alias: Fish */
  Clams = 1,
  /** v2 name retained for backward compat. v3 alias: Logs */
  Twigs = 2,
  /** v2 name retained for backward compat. v3 alias: Rocks */
  Pearls = 3,
  /** v3 aliases -- identical numeric values so both names work. */
  Fish = 1,
  Logs = 2,
  Rocks = 3,
}

export enum SpriteId {
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
  // Non-entity visual sprites
  Bones = 50,
  Rubble = 51,
}

/** In-match resources. v3 mapping: clams=fish, twigs=logs, pearls=rocks. */
export interface GameResources {
  clams: number;
  twigs: number;
  pearls: number;
  food: number;
  maxFood: number;
}

/** Re-export v3 resource helpers from dedicated module. */
export {
  getFish,
  getLogs,
  getRocks,
  nodeKindToResourceType,
  setFish,
  setLogs,
  setRocks,
} from './v3-resources';

export interface GameStats {
  unitsKilled: number;
  unitsLost: number;
  unitsTrained: number;
  resourcesGathered: number;
  buildingsBuilt: number;
  buildingsLost: number;
  peakArmy: number;
  pearlsEarned: number;
  totalClamsEarned: number;
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
  color?: string;
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
  costBreakdown?: { clams?: number; twigs?: number; pearls?: number; food?: number };
  requires?: string;
  statLines?: { label: string; value: string }[];
  status?: string;
  statusColor?: string;
}
