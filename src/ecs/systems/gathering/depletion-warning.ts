/**
 * Resource Depletion Warning
 *
 * Tracks resource nodes running low (< 20% of max) and fully depleted.
 * Shows floating text warnings and plays alert sounds.
 */

import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { Position, Resource } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';

/** Track which resource entities have already triggered the low-resource warning. */
const _lowWarningFired = new Set<number>();

const DEPLETION_THRESHOLD = 0.2;

/** Check a resource node after gathering and emit warnings if running low or depleted. */
export function checkResourceDepletion(world: GameWorld, tEnt: number, resKind: EntityKind): void {
  const resDef = ENTITY_DEFS[resKind];
  const maxAmt = resDef?.resourceAmount ?? 1;
  const remaining = Resource.amount[tEnt];

  // Low warning: first time resource drops below 20%
  if (remaining > 0 && remaining < maxAmt * DEPLETION_THRESHOLD) {
    if (!_lowWarningFired.has(tEnt)) {
      _lowWarningFired.add(tEnt);
      const warnColor =
        resKind === EntityKind.Cattail
          ? '#f97316'
          : resKind === EntityKind.PearlBed
            ? '#a5b4fc'
            : '#fde047';
      world.floatingTexts.push({
        x: Position.x[tEnt],
        y: Position.y[tEnt] - 20,
        text: 'Running low!',
        color: warnColor,
        life: 60,
      });
    }
  }

  // Full depletion
  if (remaining <= 0) {
    _lowWarningFired.delete(tEnt);
    audio.alert();
    world.floatingTexts.push({
      x: Position.x[tEnt],
      y: Position.y[tEnt] - 20,
      text: 'Depleted!',
      color: '#ef4444',
      life: 90,
    });
  }
}
