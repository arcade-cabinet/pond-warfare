/**
 * Poison Tick Sub-system
 *
 * Applies periodic damage from VenomSnake poison and Venom Coating tech.
 * Runs every 60 frames (1 second).
 */

import { hasComponent } from 'bitecs';
import { Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { spawnParticle } from '@/utils/particles';

/** Process VenomSnake poison: 2 damage/sec. */
export function processPoisonTicks(world: GameWorld): void {
  for (const [eid, remaining] of world.poisonTimers) {
    if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) {
      world.poisonTimers.delete(eid);
      continue;
    }

    Health.current[eid] -= 2;
    Health.flashTimer[eid] = 4;

    if (hasComponent(world.ecs, eid, Position)) {
      for (let i = 0; i < 3; i++) {
        spawnParticle(
          world,
          Position.x[eid] + (world.gameRng.next() - 0.5) * 10,
          Position.y[eid] - 5,
          (world.gameRng.next() - 0.5) * 1,
          -world.gameRng.next() * 1.5,
          15,
          '#22c55e',
          2,
        );
      }
    }

    if (remaining <= 1) {
      world.poisonTimers.delete(eid);
    } else {
      world.poisonTimers.set(eid, remaining - 1);
    }
  }
}

/** Process Venom Coating poison: 1 damage/sec. */
export function processVenomCoatingTicks(world: GameWorld): void {
  for (const [eid, remaining] of world.venomCoatingTimers) {
    if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) {
      world.venomCoatingTimers.delete(eid);
      continue;
    }

    Health.current[eid] -= 1;
    Health.flashTimer[eid] = 4;

    if (hasComponent(world.ecs, eid, Position)) {
      for (let i = 0; i < 2; i++) {
        spawnParticle(
          world,
          Position.x[eid] + (world.gameRng.next() - 0.5) * 8,
          Position.y[eid] - 5,
          (world.gameRng.next() - 0.5) * 0.8,
          -world.gameRng.next() * 1,
          12,
          '#66ee66',
          2,
        );
      }
    }

    if (remaining <= 1) {
      world.venomCoatingTimers.delete(eid);
    } else {
      world.venomCoatingTimers.set(eid, remaining - 1);
    }
  }
}
