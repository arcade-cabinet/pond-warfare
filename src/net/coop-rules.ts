/**
 * Co-op Multiplayer Gameplay Rules
 *
 * Additive co-op systems gated behind world.coopMode:
 * - Shared resource pool (broadcast resource changes to partner)
 * - Both-survive win condition (game over only when BOTH lodges destroyed)
 * - Co-op difficulty scaling (+50% enemy HP/damage)
 * - Ground ping system (partner pings rendered as world-space rings)
 * - Shared fog of war (partner units reveal fog for you)
 */

import type { GameWorld } from '@/ecs/world';
import type { NetMessage } from './types';

/** Duration of a co-op ground ping in frames (3 seconds at 60fps). */
export const COOP_PING_DURATION = 180;

/** Co-op difficulty multiplier applied to enemy HP and damage. */
export const COOP_ENEMY_STAT_MULT = 1.5;

// ---- Shared Resource Pool ----

/**
 * Build a resource-sync message from the current player resources.
 * Called after a Mudpaw/generalist deposits resources in co-op mode.
 */
export function buildResourceSyncMessage(world: GameWorld): NetMessage {
  return {
    type: 'coop-resource',
    fish: world.resources.fish,
    logs: world.resources.logs,
    rocks: world.resources.rocks,
  };
}

/**
 * Apply received resource sync from co-op partner.
 * Takes the max of local and remote to avoid desyncs from race conditions.
 */
export function applyResourceSync(
  world: GameWorld,
  msg: { fish: number; logs: number; rocks: number },
): void {
  world.resources.fish = Math.max(world.resources.fish, msg.fish);
  world.resources.logs = Math.max(world.resources.logs, msg.logs);
  world.resources.rocks = Math.max(world.resources.rocks, msg.rocks);
}

// ---- Co-op Ground Ping ----

/**
 * Create a co-op ping message at the given world position.
 * Returns the NetMessage to broadcast to the partner.
 */
export function buildPingMessage(x: number, y: number): NetMessage {
  return { type: 'coop-ping', x, y };
}

/**
 * Apply a received co-op ping to the local world-space ground-ping list.
 */
export function applyCoopPing(world: GameWorld, x: number, y: number): void {
  world.groundPings.push({
    x,
    y,
    life: COOP_PING_DURATION,
    maxLife: COOP_PING_DURATION,
    color: 'rgba(56, 189, 248, 0.85)',
  });
}

// ---- Both-Survive Win Condition ----

/**
 * Check co-op win/lose conditions. In co-op:
 * - Lose only when BOTH players' Lodges are destroyed
 * - Win when all enemy nests destroyed (shared goal, same as solo)
 *
 * Returns 'playing' | 'win' | 'lose' | null (null = defer to normal check).
 */
export function checkCoopWinLose(
  playerLodgeAlive: boolean,
  nestsRemaining: boolean,
  partnerLodgeDestroyed: boolean,
): 'playing' | 'win' | 'lose' | null {
  // Victory: all nests destroyed (same as solo)
  if (!nestsRemaining) return 'win';

  // Both lodges gone: defeat
  if (!playerLodgeAlive && partnerLodgeDestroyed) return 'lose';

  // One lodge gone but partner still has theirs: keep playing
  if (!playerLodgeAlive && !partnerLodgeDestroyed) return 'playing';

  return null; // Defer to normal logic
}

/**
 * Build a message to notify partner that our Lodge was destroyed.
 */
export function buildLodgeDestroyedMessage(): NetMessage {
  return { type: 'coop-lodge-destroyed' };
}

// ---- Co-op Difficulty Scaling ----

/**
 * Apply co-op difficulty scaling to the world's enemy stat multiplier.
 * Must be called after applyDifficultyModifiers() during game setup.
 */
export function applyCoopDifficultyScaling(world: GameWorld): void {
  if (!world.coopMode) return;
  world.enemyStatMult *= COOP_ENEMY_STAT_MULT;
}

// ---- Shared Fog of War ----
