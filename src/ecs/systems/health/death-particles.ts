/**
 * Death Particle Effects
 *
 * Spawns particle bursts when entities die. Extracted from death.ts
 * to keep files under 300 LOC.
 */

import { PALETTE } from '@/constants';
import type { GameWorld } from '@/ecs/world';
import { spawnParticle } from '@/utils/particles';

export function spawnDeathParticles(
  world: GameWorld,
  ex: number,
  ey: number,
  isBuilding: boolean,
  isResource: boolean,
): void {
  if (isBuilding) {
    for (let j = 0; j < 35; j++) {
      const angle = (j / 35) * Math.PI * 2;
      const spread = 2 + world.gameRng.next() * 3;
      spawnParticle(
        world,
        ex,
        ey,
        Math.cos(angle) * spread,
        Math.sin(angle) * spread + 2,
        30,
        PALETTE.mudLight,
        4,
      );
    }
  } else {
    // Larger particle burst for more death spectacle
    const count = isResource ? 20 : 30;
    for (let j = 0; j < count; j++) {
      const angle = (j / count) * Math.PI * 2;
      const spread = 1.5 + world.gameRng.next() * 3;
      spawnParticle(
        world,
        ex,
        ey,
        Math.cos(angle) * spread,
        Math.sin(angle) * spread + 2,
        35,
        PALETTE.clamMeat,
        4,
      );
    }
    if (!isResource) {
      for (let j = 0; j < 8; j++) {
        spawnParticle(
          world,
          ex + (world.gameRng.next() - 0.5) * 12,
          ey + (world.gameRng.next() - 0.5) * 12,
          (world.gameRng.next() - 0.5) * 3,
          world.gameRng.next() * 3 + 1,
          20,
          PALETTE.clamMeat,
          6,
        );
      }
    }
  }
}
