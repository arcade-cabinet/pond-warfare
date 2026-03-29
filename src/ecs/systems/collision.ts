/**
 * Collision System
 *
 * Ported from Entity.update() lines 1727-1740 of the original HTML game.
 *
 * Responsibilities:
 * - Separate overlapping non-building, non-resource entities with a push force of 0.15
 * - Clamp entity positions to world bounds (margin of 20px)
 */

import { hasComponent, query } from 'bitecs';
import { COLLISION_PUSH_FORCE, WORLD_BOUNDS_MARGIN, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { Collider, Health, IsBuilding, IsResource, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';

export function collisionSystem(world: GameWorld): void {
  const ents = query(world.ecs, [Position, Collider, Health]);

  // Original iterates each non-building/non-resource entity against all others.
  // For each mobile entity (not building, not resource), push apart overlapping circles.
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];

    // Skip buildings and resources - they don't get pushed
    // Original: if (o===this || o.isBuilding || o.isResource) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    // Skip dead entities
    if (hasComponent(world.ecs, eid, Health) && Health.current[eid] <= 0) continue;

    const ax = Position.x[eid];
    const ay = Position.y[eid];
    const ar = Collider.radius[eid];

    for (let j = 0; j < ents.length; j++) {
      const other = ents[j];
      if (other === eid) continue;
      // Original: if (o===this || o.isBuilding || o.isResource) continue;
      if (hasComponent(world.ecs, other, IsBuilding)) continue;
      if (hasComponent(world.ecs, other, IsResource)) continue;

      const dx = ax - Position.x[other];
      const dy = ay - Position.y[other];
      const distSq = dx * dx + dy * dy;
      const md = ar + Collider.radius[other];

      // Original: if (distSq < md*md && distSq>0)
      if (distSq < md * md && distSq > 0) {
        const actualDist = Math.sqrt(distSq);
        // Original: let f = (md - actualDist)*0.15;
        const f = (md - actualDist) * COLLISION_PUSH_FORCE;
        Position.x[eid] += (dx / actualDist) * f;
        Position.y[eid] += (dy / actualDist) * f;
      }
    }

    // Keep units in world bounds
    // Original: this.x = Math.max(20, Math.min(WORLD_WIDTH - 20, this.x));
    Position.x[eid] = Math.max(
      WORLD_BOUNDS_MARGIN,
      Math.min(WORLD_WIDTH - WORLD_BOUNDS_MARGIN, Position.x[eid]),
    );
    Position.y[eid] = Math.max(
      WORLD_BOUNDS_MARGIN,
      Math.min(WORLD_HEIGHT - WORLD_BOUNDS_MARGIN, Position.y[eid]),
    );
  }
}
