/**
 * AI System - Enemy Economy
 *
 * Gatherer spawning and resource gathering logic (task #11).
 * Nests spawn gatherers to collect resources that feed the enemy economy.
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_GATHERER_COST,
  ENEMY_GATHERER_RADIUS,
  ENEMY_GATHERER_SPAWN_INTERVAL,
  ENEMY_MAX_GATHERERS_PER_NEST,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { triggerSpawnPop } from '@/rendering/animations';
import {
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { getEnemyNests } from './helpers';

/** Get difficulty-adjusted gatherer spawn interval */
function getGathererSpawnInterval(world: GameWorld): number {
  switch (world.difficulty) {
    case 'easy':
      return Math.floor(ENEMY_GATHERER_SPAWN_INTERVAL * 1.5);
    case 'hard':
      return Math.floor(ENEMY_GATHERER_SPAWN_INTERVAL * 0.75);
    case 'nightmare':
      return Math.floor(ENEMY_GATHERER_SPAWN_INTERVAL * 0.5);
    case 'ultraNightmare':
      return Math.floor(ENEMY_GATHERER_SPAWN_INTERVAL * 0.33);
    default:
      return ENEMY_GATHERER_SPAWN_INTERVAL;
  }
}

/** Spawn enemy gatherers at nests to collect resources (task #11) */
export function enemyEconomyTick(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;
  if (isPeaceful) return;
  const spawnInterval = getGathererSpawnInterval(world);
  if (world.frameCount % spawnInterval !== 0) return;

  const nestEids = getEnemyNests(world);
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Carrying]);
  const resourceNodes = query(world.ecs, [Position, Resource, IsResource]);

  for (const nestEid of nestEids) {
    if (world.enemyResources.clams < ENEMY_GATHERER_COST) continue;

    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    // Count nearby enemy gatherers
    let gathererCount = 0;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Enemy) continue;
      if (EntityTypeTag.kind[u] !== EntityKind.Gatherer) continue;
      if (hasComponent(world.ecs, u, IsBuilding)) continue;
      if (Health.current[u] <= 0) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < ENEMY_GATHERER_RADIUS * ENEMY_GATHERER_RADIUS) {
        gathererCount++;
      }
    }

    if (gathererCount >= ENEMY_MAX_GATHERERS_PER_NEST) continue;

    // Find nearest resource node
    let closestResource = -1;
    let minResDist = Infinity;
    for (let j = 0; j < resourceNodes.length; j++) {
      const r = resourceNodes[j];
      if (Resource.amount[r] <= 0) continue;
      const dx = Position.x[r] - nx;
      const dy = Position.y[r] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < minResDist) {
        minResDist = dSq;
        closestResource = r;
      }
    }

    if (closestResource === -1) continue;

    const sx = nx + (Math.random() - 0.5) * 60;
    const sy = ny + 30 + (Math.random() - 0.5) * 30;

    const gEid = spawnEntity(world, EntityKind.Gatherer, sx, sy, Faction.Enemy);
    if (gEid < 0) continue;

    // Spawn pop animation + dust
    triggerSpawnPop(gEid);
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

    world.enemyResources.clams -= ENEMY_GATHERER_COST;

    UnitStateMachine.targetEntity[gEid] = closestResource;
    UnitStateMachine.targetX[gEid] = Position.x[closestResource];
    UnitStateMachine.targetY[gEid] = Position.y[closestResource];
    UnitStateMachine.state[gEid] = UnitState.GatherMove;

    const speed = Velocity.speed[gEid] || ENTITY_DEFS[EntityKind.Gatherer]?.speed || 2.0;
    world.yukaManager.addUnit(
      gEid,
      sx,
      sy,
      speed,
      Position.x[closestResource],
      Position.y[closestResource],
    );
  }
}
