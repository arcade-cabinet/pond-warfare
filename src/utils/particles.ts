/**
 * Particle helpers
 *
 * Provides a thin wrapper around the particle pool in GameWorld
 * to avoid raw `world.particles.push({...})` allocations.
 */
import type { GameWorld } from '@/ecs/world';
import type { Particle } from '@/types';

/**
 * Acquire a particle from the pool, initialize it, and add it to
 * the active particles array.
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
): Particle {
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
