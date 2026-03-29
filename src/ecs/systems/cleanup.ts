/**
 * Cleanup System
 *
 * Ported from updateLogic() lines 1188-1192 (particle/text/corpse/ping decay) and
 * Entity.update() lines 1579-1584 (building ambient particles) of the original HTML game.
 *
 * Responsibilities:
 * - Decay and remove expired particles (life--, apply velocity, remove when life <= 0)
 * - Decay and remove expired floating texts (life--, move upward, remove when life <= 0)
 * - Decay and remove expired corpses (life--, remove when life <= 0)
 * - Decay and remove expired minimap pings (life--, remove when life <= 0)
 * - Decay and remove expired ground pings (life--, remove when life <= 0)
 * - Building ambient particles: armory smoke (every 5 frames), lodge water bubbles (every 30 frames)
 */

import { query } from 'bitecs';
import { Building, EntityTypeTag, Health, IsBuilding, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';
import { reduceVisualNoise } from '@/ui/store';
import { spawnParticle } from '@/utils/particles';

export function cleanupSystem(world: GameWorld): void {
  // --- Building ambient particles (lines 1579-1584) ---
  // Skip ambient particle spawning when visual noise reduction is enabled
  if (!reduceVisualNoise.value) {
    // Only for completed buildings
    const buildings = query(world.ecs, [Position, Health, IsBuilding, EntityTypeTag, Building]);
    for (let i = 0; i < buildings.length; i++) {
      const eid = buildings[i];
      if (Health.current[eid] <= 0) continue;
      if (Building.progress[eid] < 100) continue;

      const kind = EntityTypeTag.kind[eid] as EntityKind;

      // Armory smoke (original: if (this.type === 'armory' && GAME.frameCount % 5 === 0))
      if (kind === EntityKind.Armory && world.frameCount % 5 === 0) {
        spawnParticle(
          world,
          Position.x[eid] + 8,
          Position.y[eid] - 12,
          (Math.random() - 0.5) * 0.5,
          0.5 + Math.random() * 0.5, // Positive vy = moves up (y -= vy)
          60,
          'rgba(156, 163, 175, 0.4)',
          Math.random() * 3 + 2,
        );
      }

      // Lodge water bubbles (original: if (this.type === 'lodge' && GAME.frameCount % 30 === 0))
      if (kind === EntityKind.Lodge && world.frameCount % 30 === 0) {
        spawnParticle(
          world,
          Position.x[eid] + (Math.random() - 0.5) * 20,
          Position.y[eid] + 10 + Math.random() * 10,
          0,
          0.2, // Positive vy = bubbles float up (y -= vy)
          30,
          'rgba(56, 189, 248, 0.5)',
          2,
        );
      }
    }
  }

  // --- Particle decay (line 1188) ---
  // Use swap-remove to avoid O(n) shifts from splice; order doesn't matter for particles.
  let pLen = world.particles.length;
  for (let i = pLen - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.life--;
    // Original uses p.y -= p.vy (subtracts vy from y, so positive vy moves up)
    p.y -= p.vy;
    p.x += p.vx;
    if (p.life <= 0) {
      world.particlePool.release(p);
      // Swap with last element and pop (O(1) removal)
      pLen--;
      world.particles[i] = world.particles[pLen];
      world.particles.length = pLen;
    }
  }

  // --- Floating text decay (line 1189) ---
  for (let i = world.floatingTexts.length - 1; i >= 0; i--) {
    const f = world.floatingTexts[i];
    f.life--;
    f.y -= 0.5;
    if (f.life <= 0) {
      world.floatingTexts.splice(i, 1);
    }
  }

  // --- Minimap ping decay (line 1190) ---
  for (let i = world.minimapPings.length - 1; i >= 0; i--) {
    world.minimapPings[i].life--;
    if (world.minimapPings[i].life <= 0) {
      world.minimapPings.splice(i, 1);
    }
  }

  // --- Ground ping decay (line 1191) ---
  for (let i = world.groundPings.length - 1; i >= 0; i--) {
    world.groundPings[i].life--;
    if (world.groundPings[i].life <= 0) {
      world.groundPings.splice(i, 1);
    }
  }

  // --- Corpse decay (line 1192) ---
  for (let i = world.corpses.length - 1; i >= 0; i--) {
    world.corpses[i].life--;
    if (world.corpses[i].life <= 0) {
      world.corpses.splice(i, 1);
    }
  }
}
