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
}

export enum ResourceType {
  None = 0,
  Clams = 1,
  Twigs = 2,
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
  Bones = 12,
  Rubble = 13,
}

export interface GameResources {
  clams: number;
  twigs: number;
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
  x: number;
  y: number;
  spriteId: SpriteId;
  life: number;
  maxLife: number;
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
