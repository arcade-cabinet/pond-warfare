/**
 * ECS Components (bitECS 0.4)
 *
 * In bitECS 0.4, components are plain objects with SoA (Structure of Arrays)
 * typed array fields created via soa(). They serve as both component
 * identifiers for queries and data stores indexed by entity ID.
 */

import { soa } from 'bitecs';

// Position and movement
export const Position = soa({
  x: [] as number[],
  y: [] as number[],
});

export const Velocity = soa({
  speed: [] as number[],
  speedDebuffTimer: [] as number[],
});

// Rendering
export const Sprite = soa({
  textureId: [] as number[],
  width: [] as number[],
  height: [] as number[],
  facingLeft: [] as number[],
  yOffset: [] as number[],
});

// Health
export const Health = soa({
  current: [] as number[],
  max: [] as number[],
  flashTimer: [] as number[],
  lastDamagedFrame: [] as number[],
});

// Combat
export const Combat = soa({
  damage: [] as number[],
  attackRange: [] as number[],
  attackCooldown: [] as number[],
  kills: [] as number[],
});

// Unit state machine
export const UnitStateMachine = soa({
  state: [] as number[],
  targetX: [] as number[],
  targetY: [] as number[],
  targetEntity: [] as number[],
  returnEntity: [] as number[],
  gatherTimer: [] as number[],
  attackMoveTargetX: [] as number[],
  attackMoveTargetY: [] as number[],
  hasAttackMoveTarget: [] as number[],
});

// Faction tag
export const FactionTag = soa({
  faction: [] as number[],
});

// Entity type tag
export const EntityTypeTag = soa({
  kind: [] as number[],
});

// Resource component (for cattail/clambed)
export const Resource = soa({
  resourceType: [] as number[],
  amount: [] as number[],
});

// Carrying resource (for gatherers returning resources)
export const Carrying = soa({
  resourceType: [] as number[],
  resourceAmount: [] as number[],
});

// Building component
export const Building = soa({
  progress: [] as number[],
  rallyX: [] as number[],
  rallyY: [] as number[],
  hasRally: [] as number[],
});

// Training queue - count + timer, slots stored externally per entity
export const TrainingQueue = soa({
  count: [] as number[],
  timer: [] as number[],
});

// Training queue slots stored in a plain Map since bitECS SoA doesn't support nested arrays
export const trainingQueueSlots = new Map<number, number[]>();

/** Clear world-scoped component state that lives outside bitECS SoA arrays. */
export function resetTransientComponentState(): void {
  trainingQueueSlots.clear();
}

// Collider
export const Collider = soa({
  radius: [] as number[],
});

// Selectable
export const Selectable = soa({
  selected: [] as number[],
});

// Veterancy progression
export const Veterancy = soa({
  rank: [] as number[], // 0=recruit, 1=veteran, 2=elite, 3=hero
  appliedRank: [] as number[], // last rank whose bonuses were applied
});

// Task override: when set, auto-behavior system skips this unit
export const TaskOverride = soa({
  active: [] as number[], // 0 = no override, 1 = has override
  task: [] as number[], // UnitState value for the assigned task
  targetEntity: [] as number[], // target entity for the task (0 = none)
  resourceKind: [] as number[], // EntityKind for gather overrides (0 = none)
});

// Unit stance (controls auto-aggro behavior)
// 0 = Aggressive (chase enemies in vision)
// 1 = Defensive (fight only if recently damaged)
// 2 = Hold (don't auto-move or auto-fight)
export const Stance = soa({
  mode: [] as number[],
});

/** Stance mode constants for readability. */
export const StanceMode = {
  Aggressive: 0,
  Defensive: 1,
  Hold: 2,
} as const;

// Tag components - empty objects used purely as markers
export const TowerAI = {};
export const IsBuilding = {};
export const IsResource = {};
export const Dead = {};
export const IsProjectile = {};
export const LegacySpecialistSnapshot = {};
export const AutonomousSpecialist = {};

// Patrol route tracking (waypoints stored externally in world.patrolWaypoints)
export const Patrol = soa({
  waypointCount: [] as number[],
  currentWaypoint: [] as number[],
  active: [] as number[], // 1 = patrolling, 0 = inactive
});

// Auto-symbol: icon above unit head after completing an order while deselected
export const AutoSymbol = soa({
  active: [] as number[], // 0 = inactive, 1 = showing symbol
  symbolType: [] as number[], // 0=none, 1=gather, 2=attack, 3=heal, 4=scout
  timer: [] as number[], // frames remaining (240 = 4s at 60fps)
  confirmed: [] as number[], // 0 = unconfirmed, 1 = player tapped to confirm
});

/** Symbol type constants for readability. */
export const SymbolType = {
  None: 0,
  Gather: 1,
  Attack: 2,
  Heal: 3,
  Scout: 4,
} as const;

// Commander component (one per commander entity)
export const Commander = soa({
  commanderType: [] as number[], // index into COMMANDERS array (0=marshal, 1=sage, etc.)
  auraRadius: [] as number[],
  auraDamageBonus: [] as number[], // fractional (0.15 = +15%)
  abilityTimer: [] as number[], // frames until ability available (0 = ready)
  abilityCooldown: [] as number[], // frames per cooldown cycle
  isPlayerCommander: [] as number[], // 1=player, 0=enemy
});

// Projectile component
export const ProjectileData = soa({
  targetEntity: [] as number[],
  targetX: [] as number[],
  targetY: [] as number[],
  damage: [] as number[],
  ownerEntity: [] as number[],
  speed: [] as number[],
  damageMultiplier: [] as number[],
  sourceKind: [] as number[], // EntityKind of the unit that fired this projectile
});
