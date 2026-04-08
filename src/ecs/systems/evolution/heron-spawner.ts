/**
 * Flying Heron Spawner
 *
 * At Evolution Tier 2+, periodically spawns Flying Herons from map edges:
 * - Herons ignore terrain speed modifiers (handled in terrain-grid.ts).
 * - Rendered with y-offset -10px (handled in entity-renderer).
 * - Fast scouts: fly toward player base, harass Mudpaws, then flee.
 * - Countered by ranged compatibility saboteur chassis and Towers (1.5x),
 *   weak vs melee compatibility sapper chassis (0.5x).
 *   Damage multipliers are in damage-multipliers.ts.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
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
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
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
function edgeSpawnPosition(world: GameWorld): { sx: number; sy: number } {
  const rng = world.gameRng;
  const ww = world.worldWidth;
  const wh = world.worldHeight;
  const edge = Math.floor(rng.next() * 4);
  switch (edge) {
    case 0: // top
      return { sx: 100 + rng.next() * (ww - 200), sy: 30 };
    case 1: // right
      return { sx: ww - 30, sy: 100 + rng.next() * (wh - 200) };
    case 2: // bottom
      return { sx: 100 + rng.next() * (ww - 200), sy: wh - 30 };
    default: // left
      return { sx: 30, sy: 100 + rng.next() * (wh - 200) };
  }
}

/** Find the nearest player Mudpaw to target. */
function findNearestMudpaw(world: GameWorld, x: number, y: number): number {
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
    if (kind !== MUDPAW_KIND) continue;
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

  const { sx, sy } = edgeSpawnPosition(world);
  const eid = spawnEntity(world, EntityKind.FlyingHeron, sx, sy, Faction.Enemy);
  if (eid < 0) return;

  triggerSpawnPop(eid);
  spawnDustParticles(world, sx, sy);
  audio.heronScreech(sx);

  // Target nearest Mudpaw, fall back to any player unit
  let target = findNearestMudpaw(world, sx, sy);
  if (target === -1) {
    target = findNearestPlayerUnit(world, sx, sy);
  }

  if (target !== -1) {
    sendToTarget(world, eid, target);
  }

  pushGameEvent('Flying Heron spotted!', '#f59e0b', world.frameCount);
}
