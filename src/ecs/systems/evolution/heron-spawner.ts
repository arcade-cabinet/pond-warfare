/**
 * Flying Heron Spawner
 *
 * At Evolution Tier 2+, periodically spawns Flying Herons from map edges:
 * - Herons ignore terrain speed modifiers (handled in terrain-grid.ts).
 * - Rendered with y-offset -10px (handled in entity-renderer).
 * - Fast scouts: fly toward player base, attack gatherers, then flee.
 * - Countered by Snipers and Towers (1.5x), weak vs melee (0.5x Brawler).
 *   Damage multipliers are in damage-multipliers.ts.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';
import { pushGameEvent } from '@/ui/game-events';
import { sendToTarget, spawnDustParticles } from './helpers';

/** Minimum evolution tier for heron spawning. */
const HERON_MIN_TIER = 2;

/** Base spawn interval in frames (~15 seconds). */
const HERON_BASE_INTERVAL = 900;

/** Track last heron spawn frame (module-level to keep spawner stateless). */
let lastHeronSpawnFrame = 0;

/** Reset for tests. */
export function resetHeronSpawner(): void {
  lastHeronSpawnFrame = 0;
}

/** Pick a random spawn position along a map edge. */
function edgeSpawnPosition(): { sx: number; sy: number } {
  const edge = Math.floor(Math.random() * 4);
  switch (edge) {
    case 0:
      return { sx: 100 + Math.random() * (WORLD_WIDTH - 200), sy: 30 };
    case 1:
      return { sx: WORLD_WIDTH - 30, sy: 100 + Math.random() * (WORLD_HEIGHT - 200) };
    case 2:
      return { sx: 100 + Math.random() * (WORLD_WIDTH - 200), sy: WORLD_HEIGHT - 30 };
    default:
      return { sx: 30, sy: 100 + Math.random() * (WORLD_HEIGHT - 200) };
  }
}

/** Find the nearest player gatherer to target. */
function findNearestGatherer(world: GameWorld, x: number, y: number): number {
  const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource))
      continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind !== EntityKind.Gatherer) continue;
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

/** Find any alive player unit to target as fallback. */
function findNearestPlayerUnit(world: GameWorld, x: number, y: number): number {
  const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding) || hasComponent(world.ecs, eid, IsResource))
      continue;
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
 * Heron spawner: called from evolutionSystem each frame.
 */
export function heronSpawnerSystem(world: GameWorld): void {
  const evo = world.enemyEvolution;
  if (evo.tier < HERON_MIN_TIER) return;
  if (world.frameCount < world.peaceTimer) return;

  // Scale interval: faster at higher tiers
  const tierBonus = evo.tier - HERON_MIN_TIER;
  const interval = Math.max(450, HERON_BASE_INTERVAL - tierBonus * 90);
  if (world.frameCount - lastHeronSpawnFrame < interval) return;

  lastHeronSpawnFrame = world.frameCount;

  const { sx, sy } = edgeSpawnPosition();
  const eid = spawnEntity(world, EntityKind.FlyingHeron, sx, sy, Faction.Enemy);
  if (eid < 0) return;

  triggerSpawnPop(eid);
  spawnDustParticles(world, sx, sy);
  audio.heronScreech(sx);

  // Target nearest gatherer, fall back to any player unit
  let target = findNearestGatherer(world, sx, sy);
  if (target === -1) {
    target = findNearestPlayerUnit(world, sx, sy);
  }

  if (target !== -1) {
    sendToTarget(world, eid, target);
  }

  pushGameEvent('Flying Heron spotted!', '#f59e0b', world.frameCount);
}
