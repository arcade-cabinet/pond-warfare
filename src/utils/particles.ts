/**
 * Particle helpers
 *
 * Provides a thin wrapper around the particle pool in GameWorld
 * to avoid raw `world.particles.push({...})` allocations.
 */
import type { GameWorld } from '@/ecs/world';
import type { Particle } from '@/types';

/**
 * Spawn a 6-particle circular dust burst at a position.
 * Used when units finish training / spawn.
 */
export function spawnDustBurst(world: GameWorld, x: number, y: number): void {
  for (let j = 0; j < 6; j++) {
    const angle = (j / 6) * Math.PI * 2;
    world.particles.push({
      x,
      y: y + 8,
      vx: Math.cos(angle) * 1.5,
      vy: Math.sin(angle) * 0.5 + 0.5,
      life: 15,
      color: '#a8a29e',
      size: 2,
    });
  }
}

/** Particle throttle counter for probabilistic skip when entity count is high. */
let _particleThrottleCounter = 0;

/**
 * Acquire a particle from the pool, initialize it, and add it to
 * the active particles array.
 *
 * When the active particle count exceeds performance thresholds,
 * particles are probabilistically skipped to maintain frame rate:
 * - > 200 particles: skip 50% of spawns
 * - > 400 particles: skip 75% of spawns
 */
export function spawnParticle(
  world: GameWorld,
  x: number,
  y: number,
  vx: number,
  vy: number,
  life: number,
  color: string,
  size: number,
): Particle | null {
  // Particle throttling based on active count
  const count = world.particles.length;
  _particleThrottleCounter++;
  if (count > 400 && (_particleThrottleCounter & 3) !== 0) return null;
  if (count > 200 && (_particleThrottleCounter & 1) !== 0) return null;

  const p = world.particlePool.acquire();
  p.x = x;
  p.y = y;
  p.vx = vx;
  p.vy = vy;
  p.life = life;
  p.color = color;
  p.size = size;
  world.particles.push(p);
  return p;
}
