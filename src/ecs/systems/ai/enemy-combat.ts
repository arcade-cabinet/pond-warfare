/**
 * AI System - Enemy Combat
 *
 * Attack decisions, retreat logic, and recon pressure (task #14).
 * Attacks when army exceeds threshold, targets weakest player building,
 * groups units before attacking, retreats damaged units, and sends recon fliers.
 */

import { audio } from '@/audio/audio-system';
import { resolvePersonality } from '@/config/ai-personalities';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_ARMY_ATTACK_THRESHOLD,
  ENEMY_ATTACK_CHECK_INTERVAL,
  ENEMY_LATE_ATTACK_THRESHOLD,
  ENEMY_LATE_GAME_FRAME,
  ENEMY_RALLY_RADIUS,
  ENEMY_RETREAT_HP_PERCENT,
  ENEMY_RECON_INTERVAL,
  ENEMY_SNAKE_COST_FISH,
  ENEMY_SNAKE_COST_LOGS,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Health, Position, UnitStateMachine, Velocity } from '@/ecs/components';
import { getWeatherAttackThresholdMult } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
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

  // --- Recon logic ---
  enemyReconLogic(world, isPeaceful);
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
  // Scale attack threshold: by difficulty, game phase, and AI personality
  let baseThreshold = ENEMY_ARMY_ATTACK_THRESHOLD;
  let lateThreshold = ENEMY_LATE_ATTACK_THRESHOLD;
  if (world.difficulty === 'easy') {
    baseThreshold = 8;
    lateThreshold = 5;
  } else if (world.difficulty === 'hard') {
    baseThreshold = 3;
    lateThreshold = 2;
  } else if (world.difficulty === 'nightmare') {
    baseThreshold = 3;
    lateThreshold = 2;
  } else if (world.difficulty === 'ultraNightmare') {
    baseThreshold = 2;
    lateThreshold = 1;
  }
  // AI personality modifier: adjusts how large the army must be before attacking
  const personality = resolvePersonality(world.aiPersonality, world.frameCount);
  // Weather modifier: fog increases threshold by 50% (enemies wait longer)
  const weatherMult = getWeatherAttackThresholdMult(world);
  baseThreshold = Math.max(
    personality.minArmyForAttack,
    Math.round(baseThreshold * personality.attackThresholdMult * weatherMult),
  );
  lateThreshold = Math.max(
    1,
    Math.round(lateThreshold * personality.attackThresholdMult * weatherMult),
  );
  const attackThreshold = world.frameCount >= ENEMY_LATE_GAME_FRAME ? lateThreshold : baseThreshold;
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

  // Wave announcement banner
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: `Wave Incoming! (${idleUnits.length} units)`,
    color: '#f59e0b',
    life: 150,
  });
  // Amber world-space ping at the target building
  world.groundPings.push({
    x: targetX,
    y: targetY,
    life: 120,
    maxLife: 120,
    color: 'rgba(245, 158, 11, 0.85)',
  });

  // Send them as a group
  for (const eid of idleUnits) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = targetX + (world.gameRng.next() - 0.5) * ENEMY_RALLY_RADIUS;
    UnitStateMachine.targetY[eid] = targetY + (world.gameRng.next() - 0.5) * ENEMY_RALLY_RADIUS;
    UnitStateMachine.state[eid] = UnitState.AttackMove;

    const speed = Velocity.speed[eid] || 1.5;
    world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, targetX, targetY);
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

/** Send recon fliers to explore the map (task #14) */
function enemyReconLogic(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_RECON_INTERVAL !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;
  if (res.fish < ENEMY_SNAKE_COST_FISH || res.logs < ENEMY_SNAKE_COST_LOGS) return;

  // Pick a random nest to spawn from
  const sourceNest = nestEids[Math.floor(world.gameRng.next() * nestEids.length)];
  const nx = Position.x[sourceNest];
  const ny = Position.y[sourceNest];

  const sx = nx + (world.gameRng.next() - 0.5) * 60;
  const sy = ny + 30;

  const reconEid = spawnEntity(world, EntityKind.Snake, sx, sy, Faction.Enemy);
  if (reconEid < 0) return;

  // Spawn pop animation + dust
  triggerSpawnPop(reconEid);
  for (let j = 0; j < 6; j++) {
    const angle = (j / 6) * Math.PI * 2;
    world.particles.push({
      x: sx,
      y: sy + 8,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 0.5 + 0.5,
      life: 15,
      color: '#a8a29e',
      size: 2,
    });
  }

  res.fish -= ENEMY_SNAKE_COST_FISH;
  res.logs -= ENEMY_SNAKE_COST_LOGS;

  // Send recon unit to a random location on the map, biased toward player lodge
  const lodgeEid = findPlayerLodge(world);
  let reconX: number;
  let reconY: number;
  if (lodgeEid !== -1 && world.gameRng.next() > 0.3) {
    // 70% chance to probe toward the lodge area
    reconX = Position.x[lodgeEid] + (world.gameRng.next() - 0.5) * 600;
    reconY = Position.y[lodgeEid] + (world.gameRng.next() - 0.5) * 600;
  } else {
    // Random map exploration — use dynamic world dimensions
    const margin = Math.min(200, world.worldWidth * 0.15);
    reconX = margin + world.gameRng.next() * (world.worldWidth - margin * 2);
    reconY = margin + world.gameRng.next() * (world.worldHeight - margin * 2);
  }

  UnitStateMachine.targetX[reconEid] = reconX;
  UnitStateMachine.targetY[reconEid] = reconY;
  UnitStateMachine.state[reconEid] = UnitState.AttackMovePatrol;
  UnitStateMachine.hasAttackMoveTarget[reconEid] = 1;
  UnitStateMachine.attackMoveTargetX[reconEid] = reconX;
  UnitStateMachine.attackMoveTargetY[reconEid] = reconY;

  const speed = Velocity.speed[reconEid] || ENTITY_DEFS[EntityKind.Snake]?.speed || 2.0;
  world.yukaManager.addUnit(reconEid, sx, sy, speed, reconX, reconY);
}
