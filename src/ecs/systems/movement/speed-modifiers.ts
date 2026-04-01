/**
 * Movement Speed Modifiers
 *
 * Applies contextual speed modifiers: fortified walls slow, trapper debuff,
 * commander aura, rally cry.
 */

import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/**
 * Check if enemy unit is near a player wall and apply 30% slow.
 * Returns the modified speed.
 */
export function applyFortifiedWallsSlow(world: GameWorld, eid: number, speed: number): number {
  const ex = Position.x[eid];
  const ey = Position.y[eid];
  const wallSlowRange = 80;
  const wallCandidates = world.spatialHash ? world.spatialHash.query(ex, ey, wallSlowRange) : [];
  for (let w = 0; w < wallCandidates.length; w++) {
    const wid = wallCandidates[w];
    if (
      (EntityTypeTag.kind[wid] as EntityKind) === EntityKind.Wall &&
      FactionTag.faction[wid] === Faction.Player &&
      Health.current[wid] > 0
    ) {
      const wdx = Position.x[wid] - ex;
      const wdy = Position.y[wid] - ey;
      if (Math.sqrt(wdx * wdx + wdy * wdy) <= wallSlowRange) {
        return speed * 0.7;
      }
    }
  }
  return speed;
}
