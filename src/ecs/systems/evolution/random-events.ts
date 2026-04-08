/**
 * Random Threat Events
 *
 * Triggers random events during long games:
 * - Predator Migration: enemies spawn from map edge
 * - Nest Fury: burst spawn from a random nest
 * - Alpha Appearance: AlphaPredator spawns from fog
 */

import { audio } from '@/audio/audio-system';
import { spawnEntity } from '@/ecs/archetypes';
import { Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';
import type { SeededRandom } from '@/utils/random';
import { findPlayerLodge, getEnemyNests } from '../ai/helpers';
import { pickRandomUnlocked, sendToPosition, sendToTarget, spawnDustParticles } from './helpers';

/** Pick a random spawn position along a map edge. */
function edgeSpawnPosition(
  rng: SeededRandom,
  edge: number,
  ww: number,
  wh: number,
): { sx: number; sy: number } {
  switch (edge) {
    case 0: // top
      return { sx: 100 + rng.next() * (ww - 200), sy: 50 };
    case 1: // right
      return { sx: ww - 50, sy: 100 + rng.next() * (wh - 200) };
    case 2: // bottom
      return { sx: 100 + rng.next() * (ww - 200), sy: wh - 50 };
    default: // left
      return { sx: 50, sy: 100 + rng.next() * (wh - 200) };
  }
}

/** Spawn a burst of enemies from a nest (used by Nest Fury and Alpha fallback). */
function nestFuryBurst(world: GameWorld, nestEid: number): void {
  const nx = Position.x[nestEid];
  const ny = Position.y[nestEid];

  world.floatingTexts.push({
    x: nx,
    y: ny - 40,
    text: 'Nest Fury!',
    color: '#f59e0b',
    life: 180,
  });
  world.groundPings.push({
    x: nx,
    y: ny,
    life: 180,
    maxLife: 180,
    color: 'rgba(245, 158, 11, 0.85)',
  });
  audio.alert();

  const burstCount = 3 + Math.floor(world.gameRng.next() * 3);
  for (let i = 0; i < burstCount; i++) {
    const unitKind = pickRandomUnlocked(world.gameRng, world.enemyEvolution.unlockedUnits);
    const sx = nx + (world.gameRng.next() - 0.5) * 60;
    const sy = ny + 30 + world.gameRng.next() * 20;
    const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
    if (eid < 0) continue;
    triggerSpawnPop(eid);
    spawnDustParticles(world, sx, sy);
  }
}

/**
 * Trigger a random threat event:
 * - "Predator Migration": 3-5 enemies spawn from a random map edge
 * - "Nest Fury": a random nest doubles production for 2 minutes
 * - "Alpha Appearance": AlphaPredator spawns from fog, patrols toward player base
 */
export function triggerRandomEvent(world: GameWorld): void {
  const rng = world.gameRng;
  const roll = rng.next();
  const lodgeEid = findPlayerLodge(world);
  const ww = world.worldWidth;
  const wh = world.worldHeight;

  if (roll < 0.45) {
    // --- Predator Migration ---
    const count = 3 + Math.floor(rng.next() * 3);
    const edge = Math.floor(rng.next() * 4);

    world.floatingTexts.push({
      x: world.camX + world.viewWidth / 2,
      y: world.camY + 60,
      text: 'Predator Migration!',
      color: '#f59e0b',
      life: 180,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 8);
    audio.alert();

    for (let i = 0; i < count; i++) {
      const { sx, sy } = edgeSpawnPosition(rng, edge, ww, wh);
      const unitKind = pickRandomUnlocked(rng, world.enemyEvolution.unlockedUnits);
      const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (eid < 0) continue;

      triggerSpawnPop(eid);

      if (lodgeEid !== -1) {
        sendToTarget(world, eid, lodgeEid);
      } else {
        const tx = ww / 2 + (rng.next() - 0.5) * 400;
        const ty = wh / 2 + (rng.next() - 0.5) * 400;
        sendToPosition(world, eid, tx, ty);
      }
    }
  } else if (roll < 0.8) {
    // --- Nest Fury ---
    const nests = getEnemyNests(world);
    if (nests.length === 0) return;

    const targetNest = nests[Math.floor(rng.next() * nests.length)];
    nestFuryBurst(world, targetNest);
  } else {
    // --- Alpha Appearance ---
    if (!world.enemyEvolution.unlockedUnits.includes(EntityKind.AlphaPredator)) {
      // Fall back to nest fury
      const fallbackNests = getEnemyNests(world);
      if (fallbackNests.length > 0) {
        const targetNest = fallbackNests[Math.floor(rng.next() * fallbackNests.length)];
        nestFuryBurst(world, targetNest);
      }
      return;
    }

    const edge = Math.floor(rng.next() * 4);
    const { sx, sy } = edgeSpawnPosition(rng, edge, ww, wh);

    const eid = spawnEntity(world, EntityKind.AlphaPredator, sx, sy, Faction.Enemy);
    if (eid < 0) return;

    triggerSpawnPop(eid);

    world.floatingTexts.push({
      x: world.camX + world.viewWidth / 2,
      y: world.camY + 60,
      text: 'Alpha Predator Spotted!',
      color: '#ef4444',
      life: 180,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 12);
    world.groundPings.push({
      x: sx,
      y: sy,
      life: 180,
      maxLife: 180,
      color: 'rgba(239, 68, 68, 0.85)',
    });
    audio.alert();

    if (lodgeEid !== -1) {
      sendToTarget(world, eid, lodgeEid);
    }
  }
}
