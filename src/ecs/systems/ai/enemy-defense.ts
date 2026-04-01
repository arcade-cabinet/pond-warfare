/**
 * AI System - Enemy Defense & Boss Waves
 *
 * Nest defense reinforcement when nests are under attack,
 * and periodic boss croc wave spawning.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_GATOR_COST_CLAMS,
  ENEMY_GATOR_COST_TWIGS,
  ENEMY_SNAKE_COST_CLAMS,
  ENEMY_SNAKE_COST_TWIGS,
  WAVE_INTERVAL,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction, UnitState } from '@/types';
import { spawnDustBurst } from '@/utils/particles';
import { findPlayerLodge, getEnemyNests } from './helpers';

/** Nest defense reinforcement - spawn defenders when nest is under attack */
export function nestDefenseReinforcement(world: GameWorld): void {
  if (world.frameCount % 600 !== 0) return;

  const nestEids = getEnemyNests(world);
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  for (const nestEid of nestEids) {
    if (Health.current[nestEid] >= Health.max[nestEid] * 0.5) continue;

    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    // Count nearby enemy defenders
    let defenderCount = 0;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Enemy) continue;
      if (hasComponent(world.ecs, u, IsBuilding)) continue;
      if (Health.current[u] <= 0) continue;
      if (EntityTypeTag.kind[u] === EntityKind.Gatherer) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < 300 * 300) {
        defenderCount++;
      }
    }

    if (defenderCount >= 4) continue;

    // Cost check: defenders still cost resources now
    const trainGator = Math.random() > 0.5;
    const costClams = trainGator ? ENEMY_GATOR_COST_CLAMS : ENEMY_SNAKE_COST_CLAMS;
    const costTwigs = trainGator ? ENEMY_GATOR_COST_TWIGS : ENEMY_SNAKE_COST_TWIGS;
    if (world.enemyResources.clams < costClams || world.enemyResources.twigs < costTwigs) continue;

    const unitKind = trainGator ? EntityKind.Gator : EntityKind.Snake;
    const sx = nx + (Math.random() - 0.5) * 60;
    const sy = ny + 30;

    const defEid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
    if (defEid < 0) continue;

    triggerSpawnPop(defEid);
    spawnDustBurst(world, sx, sy);

    world.enemyResources.clams -= costClams;
    world.enemyResources.twigs -= costTwigs;

    // Find nearest player unit to attack
    let closestTarget = -1;
    let minDistSq = 400 * 400;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Player) continue;
      if (Health.current[u] <= 0) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestTarget = u;
      }
    }

    const defSpeed = Velocity.speed[defEid] || ENTITY_DEFS[unitKind]?.speed || 1.5;

    if (closestTarget !== -1) {
      UnitStateMachine.targetEntity[defEid] = closestTarget;
      UnitStateMachine.targetX[defEid] = Position.x[closestTarget];
      UnitStateMachine.targetY[defEid] = Position.y[closestTarget];
      UnitStateMachine.state[defEid] = UnitState.AttackMove;

      world.yukaManager.addEnemy(
        defEid,
        sx,
        sy,
        defSpeed,
        Position.x[closestTarget],
        Position.y[closestTarget],
      );
    } else {
      world.yukaManager.addEnemy(defEid, sx, sy, defSpeed, nx, ny);
    }
  }
}

/** Boss wave logic - spawns boss crocs periodically */
export function bossWaveLogic(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;
  if (isPeaceful) return;
  if (world.frameCount <= world.peaceTimer + 10 * WAVE_INTERVAL) return;
  if (world.frameCount % (WAVE_INTERVAL * 3) !== 0) return;

  const nestEids = getEnemyNests(world);
  const lodgeEid = findPlayerLodge(world);

  for (const nestEid of nestEids) {
    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];
    const sx = nx + (Math.random() - 0.5) * 60;
    const sy = ny + 30;

    const eid = spawnEntity(world, EntityKind.BossCroc, sx, sy, Faction.Enemy);
    if (eid < 0) continue;

    triggerSpawnPop(eid);

    audio.alert();
    world.floatingTexts.push({
      x: sx,
      y: sy - 40,
      text: 'BOSS CROC!',
      color: '#ef4444',
      life: 120,
    });
    world.minimapPings.push({ x: sx, y: sy, life: 180, maxLife: 180 });
    world.shakeTimer = Math.max(world.shakeTimer, 15);

    if (lodgeEid !== -1) {
      UnitStateMachine.targetEntity[eid] = lodgeEid;
      UnitStateMachine.targetX[eid] = Position.x[lodgeEid];
      UnitStateMachine.targetY[eid] = Position.y[lodgeEid];
      UnitStateMachine.state[eid] = UnitState.AttackMove;

      const speed = Velocity.speed[eid] || ENTITY_DEFS[EntityKind.BossCroc]?.speed || 1.2;
      world.yukaManager.addEnemy(eid, sx, sy, speed, Position.x[lodgeEid], Position.y[lodgeEid]);
    }
  }
}
