/**
 * Physics Body Sync
 *
 * Keeps the physics engine in sync with ECS entities:
 * creates bodies for new entities, removes them for dead/removed ones.
 */

import { query } from 'bitecs';
import { Collider, Health, Position } from '@/ecs/components';
import { cleanupEntityAnimation } from '@/rendering/animations';
import type { GameLoopState } from './game-loop';

/** Sync physics bodies with ECS entity state. */
export function syncPhysicsBodies(state: GameLoopState): void {
  const allEnts = query(state.world.ecs, [Position, Collider, Health]);
  const current = new Set<number>();
  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    current.add(eid);
    if (Health.current[eid] <= 0) {
      if (state.physicsManager.hasBody(eid)) {
        state.physicsManager.removeBody(eid);
        cleanupEntityAnimation(eid);
      }
      continue;
    }
    if (!state.physicsManager.hasBody(eid)) {
      state.physicsManager.createBody(state.world.ecs, eid);
    }
  }
  for (const eid of state.lastKnownEntities) {
    if (!current.has(eid)) {
      state.physicsManager.removeBody(eid);
      cleanupEntityAnimation(eid);
    }
  }
  state.lastKnownEntities = current;
}
