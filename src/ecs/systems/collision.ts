/**
 * Collision System
 *
 * Delegates to PhysicsManager (Planck.js) for broadphase-accelerated
 * circle-circle collision detection and separation.
 *
 * The Planck world step handles:
 * - AABB tree broadphase (replaces O(n^2) brute-force)
 * - Proper circle body collision and separation
 * - Stable separation forces
 * - World boundary enforcement via static edge bodies
 */

import type { GameWorld } from '@/ecs/world';
import type { PhysicsManager } from '@/physics/physics-world';

export function collisionSystem(world: GameWorld, physicsManager: PhysicsManager): void {
  physicsManager.step(world.ecs);
}
