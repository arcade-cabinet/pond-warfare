/**
 * AI System - Enemy Combat
 *
 * Attack decisions, retreat logic, and scouting (task #14).
 * Attacks when army exceeds threshold, targets weakest player building,
 * groups units before attacking, retreats damaged units, and sends scouts.
 */

import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_ARMY_ATTACK_THRESHOLD,
  ENEMY_ATTACK_CHECK_INTERVAL,
  ENEMY_LATE_ATTACK_THRESHOLD,
  ENEMY_LATE_GAME_FRAME,
  ENEMY_RALLY_RADIUS,
  ENEMY_RETREAT_HP_PERCENT,
  ENEMY_SCOUT_INTERVAL,
  ENEMY_SNAKE_COST_CLAMS,
  ENEMY_SNAKE_COST_TWIGS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Health, Position, UnitStateMachine, Velocity } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import {
  countEnemyArmy,
  findPlayerLodge,
  findWeakestPlayerBuilding,
  getEnemyArmyUnits,
  getEnemyNests,
} from './helpers';

/** Enemy attack decision-making tick */
export function enemyCombatTick(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;

  // --- Enemy attack decision-making ---
  enemyAttackDecision(world, isPeaceful);

  // --- Retreat damaged units ---
  enemyRetreatLogic(world);

  // --- Scout logic ---
  enemyScoutLogic(world, isPeaceful);
}

/**
 * Enemy attack decision-making (task #14).
 * Attacks when army exceeds threshold, targets weakest player building,
 * groups units before sending them.
 */
function enemyAttackDecision(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_ATTACK_CHECK_INTERVAL !== 0) return;

  const armySize = countEnemyArmy(world);
  // Scale attack threshold: by difficulty and game phase
  let baseThreshold = ENEMY_ARMY_ATTACK_THRESHOLD;
  let lateThreshold = ENEMY_LATE_ATTACK_THRESHOLD;
  if (world.difficulty === 'easy') {
    baseThreshold = 8;
    lateThreshold = 5;
  } else if (world.difficulty === 'hard') {
    baseThreshold = 3;
    lateThreshold = 2;
  }
  const attackThreshold =
    world.frameCount >= ENEMY_LATE_GAME_FRAME ? lateThreshold : baseThreshold;
  if (armySize < attackThreshold) return;

  // Find target: weakest player building
  const target = findWeakestPlayerBuilding(world);
  if (target === -1) return;

  const targetX = Position.x[target];
  const targetY = Position.y[target];

  // Get idle or near-nest army units to send
  const armyUnits = getEnemyArmyUnits(world);
  const idleUnits: number[] = [];
  for (const eid of armyUnits) {
    const state = UnitStateMachine.state[eid] as UnitState;
    // Only mobilize idle units or units near nests (not already attacking)
    if (state === UnitState.Idle) {
      idleUnits.push(eid);
    }
  }

  // Only attack if we can send enough idle units (grouping)
  if (idleUnits.length < Math.min(ENEMY_ARMY_ATTACK_THRESHOLD, 3)) return;

  audio.alert();

  // Send them as a group
  for (const eid of idleUnits) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = targetX + (Math.random() - 0.5) * ENEMY_RALLY_RADIUS;
    UnitStateMachine.targetY[eid] = targetY + (Math.random() - 0.5) * ENEMY_RALLY_RADIUS;
    UnitStateMachine.state[eid] = UnitState.AttackMove;

    const speed = Velocity.speed[eid] || 1.5;
    world.yukaManager.addEnemy(eid, Position.x[eid], Position.y[eid], speed, targetX, targetY);
  }
}

/** Retreat damaged enemy units below HP threshold (task #14) */
function enemyRetreatLogic(world: GameWorld): void {
  // Check every 60 frames for performance
  if (world.frameCount % 60 !== 0) return;

  const armyUnits = getEnemyArmyUnits(world);
  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  for (const eid of armyUnits) {
    const state = UnitStateMachine.state[eid] as UnitState;
    // Only check units that are fighting or attack-moving
    if (state !== UnitState.Attacking && state !== UnitState.AttackMove) continue;

    const hpRatio = Health.max[eid] > 0 ? Health.current[eid] / Health.max[eid] : 1;
    if (hpRatio >= ENEMY_RETREAT_HP_PERCENT) continue;

    // Retreat to nearest nest
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    let nearestNest = nestEids[0];
    let minDist = Infinity;
    for (const nestEid of nestEids) {
      const dx = Position.x[nestEid] - ex;
      const dy = Position.y[nestEid] - ey;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDist) {
        minDist = dSq;
        nearestNest = nestEid;
      }
    }

    // Flee toward nest
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.targetX[eid] = Position.x[nearestNest];
    UnitStateMachine.targetY[eid] = Position.y[nearestNest];
    UnitStateMachine.state[eid] = UnitState.Move;

    const speed = Velocity.speed[eid] || 1.5;
    world.yukaManager.addUnit(eid, ex, ey, speed, Position.x[nearestNest], Position.y[nearestNest]);
  }
}

/** Send scout snakes to explore the map (task #14) */
function enemyScoutLogic(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_SCOUT_INTERVAL !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;
  if (res.clams < ENEMY_SNAKE_COST_CLAMS || res.twigs < ENEMY_SNAKE_COST_TWIGS) return;

  // Pick a random nest to spawn from
  const sourceNest = nestEids[Math.floor(Math.random() * nestEids.length)];
  const nx = Position.x[sourceNest];
  const ny = Position.y[sourceNest];

  const sx = nx + (Math.random() - 0.5) * 60;
  const sy = ny + 30;

  const scoutEid = spawnEntity(world, EntityKind.Snake, sx, sy, Faction.Enemy);
  if (scoutEid < 0) return;

  res.clams -= ENEMY_SNAKE_COST_CLAMS;
  res.twigs -= ENEMY_SNAKE_COST_TWIGS;

  // Send scout to a random location on the map, biased toward player lodge
  const lodgeEid = findPlayerLodge(world);
  let scoutX: number;
  let scoutY: number;
  if (lodgeEid !== -1 && Math.random() > 0.3) {
    // 70% chance to scout toward the lodge area
    scoutX = Position.x[lodgeEid] + (Math.random() - 0.5) * 600;
    scoutY = Position.y[lodgeEid] + (Math.random() - 0.5) * 600;
  } else {
    // Random map exploration
    scoutX = 200 + Math.random() * (WORLD_WIDTH - 400);
    scoutY = 200 + Math.random() * (WORLD_HEIGHT - 400);
  }

  UnitStateMachine.targetX[scoutEid] = scoutX;
  UnitStateMachine.targetY[scoutEid] = scoutY;
  UnitStateMachine.state[scoutEid] = UnitState.AttackMovePatrol;
  UnitStateMachine.hasAttackMoveTarget[scoutEid] = 1;
  UnitStateMachine.attackMoveTargetX[scoutEid] = scoutX;
  UnitStateMachine.attackMoveTargetY[scoutEid] = scoutY;

  const speed = Velocity.speed[scoutEid] || ENTITY_DEFS[EntityKind.Snake]?.speed || 2.0;
  world.yukaManager.addEnemy(scoutEid, sx, sy, speed, scoutX, scoutY);
}
