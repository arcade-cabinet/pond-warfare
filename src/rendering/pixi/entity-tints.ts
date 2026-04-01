/**
 * Entity Status Effect Tints
 *
 * Determines PixiJS tint color for entities based on active status effects.
 */

import { Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, type EntityKind as EntityKindType } from '@/types';

// Tint constants for status effects
const TINT_CHAMPION = 0xcc88ff;
const TINT_POISONED = 0x66ee66;
const TINT_ENRAGED = 0xff6644;
const TINT_NORMAL = 0xffffff;

/**
 * Determine the PixiJS tint color for an entity based on active status effects.
 * Priority: enraged > poisoned > champion > normal.
 */
export function getStatusTint(eid: number, kind: EntityKindType, world: GameWorld | null): number {
  if (!world) return TINT_NORMAL;

  // Enraged BossCroc (below 30% HP)
  if (kind === EntityKind.BossCroc) {
    const maxHp = Health.max[eid];
    if (maxHp > 0 && Health.current[eid] < maxHp * 0.3) {
      return TINT_ENRAGED;
    }
  }

  // Poisoned (VenomSnake poison)
  if (world.poisonTimers.has(eid)) {
    return TINT_POISONED;
  }

  // Champion enemy
  if (world.championEnemies.has(eid)) {
    return TINT_CHAMPION;
  }

  return TINT_NORMAL;
}
