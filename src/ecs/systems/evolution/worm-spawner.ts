/**
 * Burrowing Worm Spawner
 *
 * At Evolution Tier 3+, periodically spawns Burrowing Worms near
 * player resource nodes:
 * - Worm spawns underground (invisible for 60 frames with ripple).
 * - After emergence: targets nearest player resource node.
 * - When node is destroyed, targets next nearest.
 * - Spawn rate: 1 worm every 600 frames at tier 3, faster at higher tiers.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { spawnEntity } from '@/ecs/archetypes';
import { FactionTag, Health, IsResource, Position, Resource } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';
import { sendToTarget, spawnDustParticles } from './helpers';

/** Minimum evolution tier for worm spawning. */
const WORM_MIN_TIER = 3;

/** Base spawn interval in frames (10 seconds). */
const WORM_BASE_INTERVAL = 600;

/** Frames the worm stays underground before emerging. */
export const WORM_BURROW_DURATION = 60;

/**
 * Find alive player resource nodes (Cattails, Clambeds).
 */
function findPlayerResourceNodes(world: GameWorld): number[] {
  const resources = query(world.ecs, [Position, Health, IsResource, Resource, FactionTag]);
  const result: number[] = [];
  for (let i = 0; i < resources.length; i++) {
    const eid = resources[i];
    // Resource nodes are Neutral but we target ones near player base
    if (Health.current[eid] <= 0) continue;
    if (Resource.amount[eid] <= 0) continue;
    result.push(eid);
  }
  return result;
}

/**
 * Find the nearest resource node to a position.
 */
function findNearestResource(_world: GameWorld, x: number, y: number, nodes: number[]): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const eid = nodes[i];
    if (Health.current[eid] <= 0 || Resource.amount[eid] <= 0) continue;
    const dx = Position.x[eid] - x;
    const dy = Position.y[eid] - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) {
      bestDist = d;
      best = eid;
    }
  }
  return best;
}

/**
 * Worm spawner: called from evolutionSystem each frame.
 */
export function wormSpawnerSystem(world: GameWorld): void {
  const evo = world.enemyEvolution;
  if (evo.tier < WORM_MIN_TIER) return;
  if (world.frameCount < world.peaceTimer) return;

  // Tick burrow timers — emerge worms whose timer expired
  tickBurrowTimers(world);

  // Spawn check: scale interval down at higher tiers
  const tierBonus = evo.tier - WORM_MIN_TIER;
  const interval = Math.max(300, WORM_BASE_INTERVAL - tierBonus * 60);
  if (world.frameCount - world.lastWormSpawnFrame < interval) return;

  const nodes = findPlayerResourceNodes(world);
  if (nodes.length === 0) return;

  // Pick a random resource node to spawn near
  const targetNode = nodes[Math.floor(Math.random() * nodes.length)];
  const nx = Position.x[targetNode];
  const ny = Position.y[targetNode];
  const sx = nx + (Math.random() - 0.5) * 80;
  const sy = ny + (Math.random() - 0.5) * 80;

  const eid = spawnEntity(world, EntityKind.BurrowingWorm, sx, sy, Faction.Enemy);
  if (eid < 0) return;

  world.lastWormSpawnFrame = world.frameCount;

  // Worm starts underground (burrow phase)
  world.wormBurrowTimers.set(eid, WORM_BURROW_DURATION);

  // Ground ripple particles during burrow phase
  for (let j = 0; j < 4; j++) {
    const angle = (j / 4) * Math.PI * 2;
    world.particles.push({
      x: sx,
      y: sy,
      vx: Math.cos(angle) * 0.5,
      vy: Math.sin(angle) * 0.5,
      life: WORM_BURROW_DURATION,
      color: '#92400e',
      size: 2,
    });
  }
}

/**
 * Tick burrow timers. When a worm emerges, assign it to attack the
 * nearest resource node.
 */
function tickBurrowTimers(world: GameWorld): void {
  const toEmerge: number[] = [];

  for (const [eid, remaining] of world.wormBurrowTimers) {
    if (Health.current[eid] <= 0) {
      world.wormBurrowTimers.delete(eid);
      continue;
    }
    if (remaining <= 1) {
      toEmerge.push(eid);
      world.wormBurrowTimers.delete(eid);
    } else {
      world.wormBurrowTimers.set(eid, remaining - 1);
    }
  }

  for (const eid of toEmerge) {
    triggerSpawnPop(eid);
    spawnDustParticles(world, Position.x[eid], Position.y[eid]);
    audio.alert();

    world.floatingTexts.push({
      x: Position.x[eid],
      y: Position.y[eid] - 20,
      text: 'Worm Emerges!',
      color: '#92400e',
      life: 60,
    });

    // Target nearest resource node
    const nodes = findPlayerResourceNodes(world);
    const target = findNearestResource(world, Position.x[eid], Position.y[eid], nodes);
    if (target !== -1) {
      sendToTarget(world, eid, target);
    }
  }
}
