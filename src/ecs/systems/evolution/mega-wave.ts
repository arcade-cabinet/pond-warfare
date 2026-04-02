/**
 * Mega-Wave Logic
 *
 * Triggers escalating mega-waves every 5 minutes after peace ends.
 * Wave types: Predator Assault, Swarm, Siege, Alpha Strike.
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
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';
import { pushGameEvent } from '@/ui/game-events';
import * as store from '@/ui/store';
import { findPlayerLodge, getEnemyNests } from '../ai/helpers';
import { markAsChampion, pickRandomUnlocked, sendToTarget, spawnDustParticles } from './helpers';

/** Stores original speeds for entities affected by swarm speed buff. */
export const swarmBuffOriginalSpeeds = new Map<number, number>();

/**
 * Trigger a mega-wave based on the wave number.
 *
 * Wave 1 (10 min): "Predator Assault" - 2x normal wave from ALL nests
 * Wave 2 (20 min): "Swarm" - 3x wave + all enemies get +10% speed for 60s
 * Wave 3 (30 min): "Siege" - includes SiegeTurtles targeting the Lodge
 * Wave 4+ (45 min+): "Alpha Strike" - AlphaPredator leads massive attack
 */
export function triggerMegaWave(world: GameWorld, waveNumber: number): void {
  const nests = getEnemyNests(world);
  if (nests.length === 0) return;

  const lodgeEid = findPlayerLodge(world);

  let waveName: string;
  let spawnMultiplier: number;
  let includesSiege = false;
  let includesAlpha = false;
  let swarmSpeedBuff = false;

  if (waveNumber >= 9) {
    waveName = 'ALPHA STRIKE';
    spawnMultiplier = 4;
    includesAlpha = true;
    includesSiege = true;
  } else if (waveNumber >= 6) {
    waveName = 'SIEGE';
    spawnMultiplier = 3;
    includesSiege = true;
  } else if (waveNumber >= 4) {
    waveName = 'SWARM';
    spawnMultiplier = 3;
    swarmSpeedBuff = true;
  } else {
    waveName = 'PREDATOR ASSAULT';
    spawnMultiplier = 2;
  }

  // Track wave number
  world.waveNumber++;
  store.waveNumber.value = world.waveNumber;

  // Announce wave
  const isBossWave = includesAlpha;
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 40,
    text: isBossWave ? `BOSS WAVE ${world.waveNumber}!` : `Wave ${world.waveNumber}: ${waveName}`,
    color: isBossWave ? '#ef4444' : '#f59e0b',
    life: isBossWave ? 300 : 240,
  });
  world.shakeTimer = Math.max(world.shakeTimer, isBossWave ? 30 : 20);
  audio.alert();

  // Event feed
  pushGameEvent(
    isBossWave ? `BOSS WAVE ${world.waveNumber}!` : `Enemy wave ${world.waveNumber} incoming`,
    '#ef4444',
    world.frameCount,
  );

  // Spawn units from all nests
  let championsToMark = 2;
  for (const nestEid of nests) {
    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    for (let i = 0; i < spawnMultiplier; i++) {
      const unitKind = pickRandomUnlocked(world.enemyEvolution.unlockedUnits);
      const sx = nx + (Math.random() - 0.5) * 80;
      const sy = ny + 30 + Math.random() * 20;

      const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (eid < 0) continue;

      triggerSpawnPop(eid);
      spawnDustParticles(world, sx, sy);

      if (championsToMark > 0 && i === 0) {
        markAsChampion(world, eid);
        championsToMark--;
      }

      if (lodgeEid !== -1) {
        sendToTarget(world, eid, lodgeEid);
      }
    }

    // Siege wave: also spawn SiegeTurtles
    if (includesSiege && world.enemyEvolution.unlockedUnits.includes(EntityKind.SiegeTurtle)) {
      const sx = nx + (Math.random() - 0.5) * 60;
      const sy = ny + 30;
      const siegeEid = spawnEntity(world, EntityKind.SiegeTurtle, sx, sy, Faction.Enemy);
      if (siegeEid >= 0) {
        triggerSpawnPop(siegeEid);
        spawnDustParticles(world, sx, sy);
        if (lodgeEid !== -1) {
          sendToTarget(world, siegeEid, lodgeEid);
        }
      }
    }

    // Alpha Strike: spawn AlphaPredator from the first nest
    if (
      includesAlpha &&
      nestEid === nests[0] &&
      world.enemyEvolution.unlockedUnits.includes(EntityKind.AlphaPredator)
    ) {
      const sx = nx + (Math.random() - 0.5) * 60;
      const sy = ny + 30;
      const alphaEid = spawnEntity(world, EntityKind.AlphaPredator, sx, sy, Faction.Enemy);
      if (alphaEid >= 0) {
        triggerSpawnPop(alphaEid);
        spawnDustParticles(world, sx, sy);
        if (lodgeEid !== -1) {
          sendToTarget(world, alphaEid, lodgeEid);
        }
        world.floatingTexts.push({
          x: sx,
          y: sy - 40,
          text: 'ALPHA PREDATOR!',
          color: '#ef4444',
          life: 120,
        });
        world.minimapPings.push({ x: sx, y: sy, life: 180, maxLife: 180 });
      }
    }
  }

  // Swarm speed buff: apply +10% speed to all current enemy units for 60 seconds
  if (swarmSpeedBuff) {
    world.enemyEvolution.swarmSpeedBuffExpiry = world.frameCount + 3600;
    swarmBuffOriginalSpeeds.clear();
    const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Velocity]);
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Enemy) continue;
      if (hasComponent(world.ecs, eid, IsBuilding)) continue;
      if (hasComponent(world.ecs, eid, IsResource)) continue;
      if (Health.current[eid] <= 0) continue;
      swarmBuffOriginalSpeeds.set(eid, Velocity.speed[eid]);
      Velocity.speed[eid] *= 1.1;
    }
  }
}
