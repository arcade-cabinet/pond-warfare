/**
 * Checksum – FNV-1a state hashing for multiplayer drift detection.
 *
 * Hashes deterministic game state (entity positions, HP, resources) every
 * ~300 frames (~5 seconds). Cosmetic state (particles, camera) is excluded.
 */

import { query } from 'bitecs';
import { Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';

/** FNV-1a 32-bit offset basis. */
const FNV_OFFSET = 0x811c9dc5;
/** FNV-1a 32-bit prime. */
const FNV_PRIME = 0x01000193;

/** How often (in frames) to compute and compare checksums. */
export const CHECKSUM_INTERVAL = 300;

/** Feed a 32-bit integer into an FNV-1a hash state. */
function fnvHash32(hash: number, value: number): number {
  // Hash each byte of the 32-bit value
  for (let i = 0; i < 4; i++) {
    hash ^= (value >> (i * 8)) & 0xff;
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash;
}

/** Feed a float (truncated to integer) into the hash. */
function fnvHashFloat(hash: number, value: number): number {
  return fnvHash32(hash, Math.round(value * 100));
}

/**
 * Compute a deterministic checksum over gameplay-relevant world state.
 * Excludes cosmetic data (particles, floating text, camera position).
 */
export function computeChecksum(world: GameWorld): number {
  let hash = FNV_OFFSET;

  // Frame count
  hash = fnvHash32(hash, world.frameCount);

  // Resources (player + enemy)
  hash = fnvHash32(hash, world.resources.clams);
  hash = fnvHash32(hash, world.resources.twigs);
  hash = fnvHash32(hash, world.enemyResources.clams);
  hash = fnvHash32(hash, world.enemyResources.twigs);

  // Entity positions and health — sorted by entity ID for determinism
  const entities = query(world.ecs, [Position, Health]);
  const sorted = Array.from(entities).sort((a, b) => a - b);

  for (const eid of sorted) {
    hash = fnvHash32(hash, eid);
    hash = fnvHashFloat(hash, Position.x[eid]);
    hash = fnvHashFloat(hash, Position.y[eid]);
    hash = fnvHash32(hash, Health.current[eid]);
  }

  return hash >>> 0;
}
