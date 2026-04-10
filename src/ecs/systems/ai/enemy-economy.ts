/**
 * AI System - Enemy Economy
 *
 * Enemy harvester spawning and resource gathering logic (task #11).
 * Nests spawn harvester units to collect resources that feed the enemy economy.
 */

import { hasComponent, query } from 'bitecs';
import { resolvePersonality } from '@/config/ai-personalities';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_HARVESTER_COST,
  ENEMY_HARVESTER_RADIUS,
  ENEMY_HARVESTER_SPAWN_INTERVAL,
  ENEMY_MAX_HARVESTERS_PER_NEST,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
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
import { ENEMY_HARVESTER_KIND } from '@/game/live-unit-kinds';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction, UnitState } from '@/types';
import { spawnDustBurst } from '@/utils/particles';
import { getEnemyNests } from './helpers';

/** Get difficulty-adjusted enemy harvester spawn interval. */
function getHarvesterSpawnInterval(world: GameWorld): number {
  switch (world.difficulty) {
    case 'easy':
      return Math.floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 1.5);
    case 'hard':
      return Math.floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 0.75);
    case 'nightmare':
      return Math.floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 0.5);
    case 'ultraNightmare':
      return Math.floor(ENEMY_HARVESTER_SPAWN_INTERVAL * 0.33);
    default:
      return ENEMY_HARVESTER_SPAWN_INTERVAL;
  }
}

/** Spawn enemy harvester units at nests to collect resources (task #11) */
export function enemyEconomyTick(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;
  if (isPeaceful) return;
  const spawnInterval = getHarvesterSpawnInterval(world);
  if (world.frameCount % spawnInterval !== 0) return;

  const nestEids = getEnemyNests(world);
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Carrying]);
  const resourceNodes = query(world.ecs, [Position, Resource, IsResource]);

  for (const nestEid of nestEids) {
    if (world.enemyResources.fish < ENEMY_HARVESTER_COST) continue;

    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    // Count nearby enemy harvester units
    let harvesterCount = 0;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Enemy) continue;
      if (EntityTypeTag.kind[u] !== ENEMY_HARVESTER_KIND) continue;
      if (hasComponent(world.ecs, u, IsBuilding)) continue;
      if (Health.current[u] <= 0) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < ENEMY_HARVESTER_RADIUS * ENEMY_HARVESTER_RADIUS) {
        harvesterCount++;
      }
    }

    // AI personality adjusts max harvester units per nest
    const personality = resolvePersonality(world.aiPersonality, world.frameCount);
    const maxHarvesters = Math.max(
      1,
      Math.round(ENEMY_MAX_HARVESTERS_PER_NEST * personality.harvesterRate),
    );
    if (harvesterCount >= Math.min(maxHarvesters, personality.maxHarvestersPerNest)) continue;

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

    const sx = nx + (world.gameRng.next() - 0.5) * 60;
    const sy = ny + 30 + (world.gameRng.next() - 0.5) * 30;

    const gEid = spawnEntity(world, ENEMY_HARVESTER_KIND, sx, sy, Faction.Enemy);
    if (gEid < 0) continue;

    // Spawn pop animation + dust
    triggerSpawnPop(gEid);
    spawnDustBurst(world, sx, sy);

    world.enemyResources.fish -= ENEMY_HARVESTER_COST;

    UnitStateMachine.targetEntity[gEid] = closestResource;
    UnitStateMachine.targetX[gEid] = Position.x[closestResource];
    UnitStateMachine.targetY[gEid] = Position.y[closestResource];
    UnitStateMachine.state[gEid] = UnitState.GatherMove;

    const speed = Velocity.speed[gEid] || ENTITY_DEFS[ENEMY_HARVESTER_KIND]?.speed || 2.0;
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
