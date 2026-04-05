/**
 * Adversarial Multiplayer Gameplay Rules
 *
 * Lodge-vs-Lodge competitive mode gated behind world.adversarialMode:
 * - Each player has own Lodge and Commander
 * - Enemy waves attack BOTH players
 * - Players CAN attack each other's Lodge and Commander
 * - Win = destroy opponent's Commander or Lodge (while ours survives)
 * - Mutual destruction = both lose (draw is not possible)
 * - Difficulty scaling: +25% enemy HP/damage (lighter than co-op)
 */

import type { GameWorld } from '@/ecs/world';
import type { NetMessage } from './types';

/** Adversarial difficulty multiplier applied to enemy HP and damage. */
export const ADVERSARIAL_ENEMY_STAT_MULT = 1.25;

// ---- Win/Loss Check ----

/**
 * Check adversarial win/lose conditions:
 * - Win when opponent's Commander OR Lodge is destroyed AND we're alive
 * - Lose when our Commander OR Lodge is destroyed
 * - Mutual destruction (same tick) = both lose (return 'lose')
 *
 * Returns 'win' | 'lose' | null (null = defer to normal check).
 */
export function checkAdversarialWinLose(
  playerLodgeAlive: boolean,
  playerCommanderAlive: boolean,
  opponentLodgeDestroyed: boolean,
  opponentCommanderDestroyed: boolean,
): 'win' | 'lose' | null {
  const weAreDead = !playerLodgeAlive || !playerCommanderAlive;
  const theyAreDead = opponentCommanderDestroyed || opponentLodgeDestroyed;

  // Mutual destruction (same tick): both lose — return 'lose'
  if (weAreDead && theyAreDead) return 'lose';

  // Check our state BEFORE declaring victory — can't win if we're also dead
  if (weAreDead) return 'lose';

  // Opponent destroyed and we're alive -> win
  if (theyAreDead) return 'win';

  return null; // Still playing
}

// ---- Adversarial Messages ----

/** Build a message to notify opponent that their Lodge was destroyed by us. */
export function buildAdversarialLodgeDestroyedMessage(): NetMessage {
  return { type: 'adversarial-lodge-destroyed' };
}

/** Build a message to notify opponent that their Commander was destroyed by us. */
export function buildAdversarialCommanderDestroyedMessage(): NetMessage {
  return { type: 'adversarial-commander-destroyed' };
}

// ---- Difficulty Scaling ----

/**
 * Apply adversarial difficulty scaling to the world's enemy stat multiplier.
 * Lighter than co-op (+25% vs +50%) since players also fight each other.
 * Must be called after applyDifficultyModifiers() during game setup.
 */
export function applyAdversarialDifficultyScaling(world: GameWorld): void {
  if (!world.adversarialMode) return;
  world.enemyStatMult *= ADVERSARIAL_ENEMY_STAT_MULT;
}
