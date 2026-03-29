/**
 * AI System - Enemy Training
 *
 * Army training queue management and counter-composition logic (task #13).
 * Replaces old free wave spawning with resource-based training.
 * Also includes nest defense reinforcement and boss wave spawning.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_GATOR_COST_CLAMS,
  ENEMY_GATOR_COST_TWIGS,
  ENEMY_LATE_GAME_FRAME,
  ENEMY_LATE_TRAIN_INTERVAL,
  ENEMY_MID_GAME_FRAME,
  ENEMY_SNAKE_COST_CLAMS,
  ENEMY_SNAKE_COST_TWIGS,
  ENEMY_TRAIN_CHECK_INTERVAL,
  ENEMY_TRAIN_TIME,
  WAVE_INTERVAL,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { countPlayerUnitsOfKind, findPlayerLodge, getEnemyNests } from './helpers';

/**
 * Enemy army training via TrainingQueue (task #13).
 * Adapts unit composition to counter the player's army.
 */
export function enemyTrainingTick(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;
  if (isPeaceful) return;
  // Scale training frequency: faster checks in late game
  const trainInterval =
    world.frameCount >= ENEMY_LATE_GAME_FRAME
      ? ENEMY_LATE_TRAIN_INTERVAL
      : ENEMY_TRAIN_CHECK_INTERVAL;
  if (world.frameCount % trainInterval !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;

  // Analyze player army to decide composition
  const playerSnipers = countPlayerUnitsOfKind(world, EntityKind.Sniper);
  const playerBrawlers = countPlayerUnitsOfKind(world, EntityKind.Brawler);

  // Counter logic: gators counter brawlers, snakes counter snipers
  // Default to 50/50 if player has no army
  let gatorWeight = 0.5;
  const totalPlayerCombat = playerSnipers + playerBrawlers;
  if (totalPlayerCombat > 0) {
    // More snipers -> train more gators (gators are strong vs brawlers, but snakes counter snipers)
    // Actually from DAMAGE_MULTIPLIERS: Snake is strong vs Sniper, Gator is strong vs Brawler
    const sniperRatio = playerSnipers / totalPlayerCombat;
    // If player has many snipers, train more snakes (which counter snipers)
    gatorWeight = 1.0 - sniperRatio * 0.7; // Bias toward snakes when snipers dominate
  }

  // Queue training at each nest that isn't already training
  // Early game (before mid-game): only train 1 unit per check, max 1 in queue
  // Mid game: normal training (max 2 in queue)
  // Late game: aggressive training (max 3 in queue)
  const maxQueueSize =
    world.frameCount >= ENEMY_LATE_GAME_FRAME ? 3 : world.frameCount >= ENEMY_MID_GAME_FRAME ? 2 : 1;
  for (const nestEid of nestEids) {
    const slots = trainingQueueSlots.get(nestEid) ?? [];
    if (slots.length >= maxQueueSize) continue;

    // Decide what to train
    const trainGator = Math.random() < gatorWeight;
    let unitKind: EntityKind;
    let costClams: number;
    let costTwigs: number;

    if (trainGator) {
      unitKind = EntityKind.Gator;
      costClams = ENEMY_GATOR_COST_CLAMS;
      costTwigs = ENEMY_GATOR_COST_TWIGS;
    } else {
      unitKind = EntityKind.Snake;
      costClams = ENEMY_SNAKE_COST_CLAMS;
      costTwigs = ENEMY_SNAKE_COST_TWIGS;
    }

    if (res.clams < costClams || res.twigs < costTwigs) continue;

    // Deduct cost and queue
    res.clams -= costClams;
    res.twigs -= costTwigs;

    slots.push(unitKind);
    trainingQueueSlots.set(nestEid, slots);
    TrainingQueue.count[nestEid] = slots.length;

    // Start timer if this is the first in queue
    if (slots.length === 1) {
      TrainingQueue.timer[nestEid] = ENEMY_TRAIN_TIME;
    }
  }
}

/**
 * Process enemy training queues - tick timers and spawn units.
 * Mirrors the player trainingSystem but for enemy nests.
 */
export function enemyTrainingQueueProcess(world: GameWorld): void {
  const buildings = query(world.ecs, [
    Position,
    TrainingQueue,
    Building,
    FactionTag,
    IsBuilding,
    Health,
    Sprite,
  ]);

  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;

    const slots = trainingQueueSlots.get(eid) ?? [];
    if (slots.length === 0) continue;

    TrainingQueue.timer[eid]--;
    if (TrainingQueue.timer[eid] <= 0) {
      const unitKind = slots[0] as EntityKind;

      const bx = Position.x[eid];
      const by = Position.y[eid];
      const spriteH = Sprite.height[eid];
      const sx = bx + (Math.random() > 0.5 ? 1 : -1) * 30;
      const sy = by + spriteH / 2 + 20;

      const newEid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (newEid < 0) {
        TrainingQueue.timer[eid] = ENEMY_TRAIN_TIME;
        continue;
      }

      // Shift queue
      slots.shift();
      trainingQueueSlots.set(eid, slots);
      TrainingQueue.count[eid] = slots.length;

      if (slots.length > 0) {
        TrainingQueue.timer[eid] = ENEMY_TRAIN_TIME;
      }
    }
  }
}

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

/** Boss wave logic - kept from original, spawns boss crocs periodically */
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
