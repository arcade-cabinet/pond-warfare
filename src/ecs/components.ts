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

// Collider
export const Collider = soa({
  radius: [] as number[],
});

// Selectable
export const Selectable = soa({
  selected: [] as number[],
});

// Tag components - empty objects used purely as markers
export const TowerAI = {};
export const IsBuilding = {};
export const IsResource = {};
export const Dead = {};
export const IsProjectile = {};

// Projectile component
export const ProjectileData = soa({
  targetEntity: [] as number[],
  targetX: [] as number[],
  targetY: [] as number[],
  damage: [] as number[],
  ownerEntity: [] as number[],
  speed: [] as number[],
});
