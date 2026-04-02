/**
 * Survival Mode
 *
 * Endless wave-based mode where enemies spawn from map edges with
 * escalating difficulty. No enemy nests. Score = time + kills + buildings.
 * Game ends when the Lodge is destroyed.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';

/** Frames between waves (2 minutes at 60fps). */
const WAVE_INTERVAL = 7200;

/** Wave interval for boss waves (every 5th wave). */
const BOSS_WAVE_EVERY = 5;

/** Base unit count per wave. Increases each wave. */
const BASE_UNITS_PER_WAVE = 3;

/** Unit types available per wave tier. */
const WAVE_TIERS: EntityKind[][] = [
  [EntityKind.Gator, EntityKind.Snake], // Waves 1-4
  [EntityKind.Gator, EntityKind.Snake, EntityKind.ArmoredGator], // Waves 5-9
  [EntityKind.ArmoredGator, EntityKind.VenomSnake, EntityKind.SwampDrake], // Waves 10-14
  [EntityKind.ArmoredGator, EntityKind.VenomSnake, EntityKind.SwampDrake, EntityKind.SiegeTurtle], // 15+
];

/** Get available unit types for a given wave number. */
function getWaveTier(waveNumber: number): EntityKind[] {
  if (waveNumber >= 15) return WAVE_TIERS[3];
  if (waveNumber >= 10) return WAVE_TIERS[2];
  if (waveNumber >= 5) return WAVE_TIERS[1];
  return WAVE_TIERS[0];
}

/** Pick a random spawn position along the map edge. */
function randomEdgePosition(world: GameWorld): { x: number; y: number } {
  const rng = world.gameRng;
  const edge = Math.floor(rng.next() * 4);
  const margin = 60;
  switch (edge) {
    case 0: // Top
      return { x: margin + rng.next() * (WORLD_WIDTH - margin * 2), y: margin };
    case 1: // Bottom
      return { x: margin + rng.next() * (WORLD_WIDTH - margin * 2), y: WORLD_HEIGHT - margin };
    case 2: // Left
      return { x: margin, y: margin + rng.next() * (WORLD_HEIGHT - margin * 2) };
    default: // Right
      return { x: WORLD_WIDTH - margin, y: margin + rng.next() * (WORLD_HEIGHT - margin * 2) };
  }
}

/** Find the player Lodge entity ID. Returns -1 if not found. */
function findPlayerLodge(world: GameWorld): number {
  const buildings = query(world.ecs, [Position, Health, IsBuilding, FactionTag, EntityTypeTag]);
  for (const eid of buildings) {
    if (
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return -1;
}

/** Check if it's time to spawn the next wave. */
export function shouldSpawnWave(world: GameWorld): boolean {
  if (world.state !== 'playing') return false;
  if (world.frameCount < world.peaceTimer) return false;
  return (world.frameCount - world.peaceTimer) % WAVE_INTERVAL === 0;
}

/** Spawn a survival wave. Returns the number of units spawned. */
export function spawnSurvivalWave(world: GameWorld): number {
  world.waveNumber++;
  const wave = world.waveNumber;

  const isBossWave = wave % BOSS_WAVE_EVERY === 0;
  const unitCount = BASE_UNITS_PER_WAVE + Math.floor(wave * 1.5);
  const availableUnits = getWaveTier(wave);

  // Find player lodge as attack target
  const lodgeEid = findPlayerLodge(world);
  const targetX = lodgeEid >= 0 ? Position.x[lodgeEid] : WORLD_WIDTH / 2;
  const targetY = lodgeEid >= 0 ? Position.y[lodgeEid] : WORLD_HEIGHT / 2;

  let spawned = 0;

  // Regular wave units
  for (let i = 0; i < unitCount; i++) {
    const pos = randomEdgePosition(world);
    const kind = availableUnits[Math.floor(world.gameRng.next() * availableUnits.length)];

    const eid = spawnEntity(world, kind, pos.x, pos.y, Faction.Enemy);
    if (eid < 0) continue;

    triggerSpawnPop(eid);
    const speed = Velocity.speed[eid] || ENTITY_DEFS[kind]?.speed || 1.5;
    world.yukaManager.addEnemy(eid, pos.x, pos.y, speed, targetX, targetY);
    spawned++;
  }

  // Boss wave: spawn extra bosses
  if (isBossWave) {
    const bossCount = Math.max(1, Math.floor(wave / BOSS_WAVE_EVERY));
    for (let i = 0; i < bossCount; i++) {
      const pos = randomEdgePosition(world);
      const bossKind = wave >= 20 ? EntityKind.AlphaPredator : EntityKind.BossCroc;
      const eid = spawnEntity(world, bossKind, pos.x, pos.y, Faction.Enemy);
      if (eid < 0) continue;

      triggerSpawnPop(eid);
      const speed = Velocity.speed[eid] || 1.0;
      world.yukaManager.addEnemy(eid, pos.x, pos.y, speed, targetX, targetY);
      spawned++;
    }
  }

  // Announce wave
  const waveText = isBossWave ? `BOSS WAVE ${wave}!` : `Wave ${wave} (${spawned} enemies)`;
  const waveColor = isBossWave ? '#ef4444' : '#f59e0b';

  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: waveText,
    color: waveColor,
    life: 180,
  });

  if (isBossWave) {
    world.shakeTimer = Math.max(world.shakeTimer, 15);
  }

  audio.alert();
  return spawned;
}

/** Calculate survival mode score. */
export function calculateSurvivalScore(world: GameWorld): number {
  const timeScore = Math.floor(world.frameCount / 60); // 1 point per second
  const killScore = world.stats.unitsKilled * 10; // 10 points per kill

  // Count standing buildings
  let buildingsStanding = 0;
  const buildings = query(world.ecs, [Health, IsBuilding, FactionTag]);
  for (const eid of buildings) {
    if (FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0) {
      buildingsStanding++;
    }
  }
  const buildingScore = buildingsStanding * 50; // 50 points per building

  return timeScore + killScore + buildingScore;
}
