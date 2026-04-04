/**
 * Patrol System
 *
 * Manages unit patrol behavior. When a unit with an active patrol takes damage
 * while in Defensive stance, patrol is paused. When a regular move command is
 * issued, patrol is cleared (handled in commands.ts).
 *
 * The actual waypoint advancement on arrival is handled by arrive.ts.
 * This system handles:
 * - Damage-pause for defensive stance units
 * - Cleaning up patrol data for dead entities
 */

import { addComponent, hasComponent, query } from 'bitecs';
import {
  FactionTag,
  Health,
  Patrol,
  Position,
  Stance,
  StanceMode,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { UnitState } from '@/types';

/** Threshold in frames since last damage to pause patrol for defensive units. */
const DAMAGE_PAUSE_FRAMES = 10;

export function patrolSystem(world: GameWorld): void {
  // Run every 10 frames to reduce overhead
  if (world.frameCount % 10 !== 0) return;

  const ents = query(world.ecs, [Position, Health, FactionTag, UnitStateMachine, Patrol]);

  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];

    // Clean up dead entities
    if (Health.current[eid] <= 0) {
      clearPatrol(world, eid);
      continue;
    }

    if (Patrol.active[eid] !== 1) continue;

    // Defensive stance: pause patrol if recently damaged
    const stance = (Stance.mode?.[eid] as number | undefined) ?? StanceMode.Aggressive;
    if (stance === StanceMode.Defensive) {
      const lastDamaged = Health.lastDamagedFrame[eid] ?? 0;
      if (lastDamaged > 0 && world.frameCount - lastDamaged < DAMAGE_PAUSE_FRAMES) {
        Patrol.active[eid] = 0;
        UnitStateMachine.state[eid] = UnitState.Idle;
      }
    }
  }
}

/** Clear all patrol data for an entity. */
export function clearPatrol(world: GameWorld, eid: number): void {
  Patrol.active[eid] = 0;
  Patrol.waypointCount[eid] = 0;
  Patrol.currentWaypoint[eid] = 0;
  world.patrolWaypoints?.delete(eid);
}

/** Start or extend a patrol route for an entity. */
export function startPatrol(
  world: GameWorld,
  eid: number,
  waypoints: { x: number; y: number }[],
): void {
  // Ensure the entity has the Patrol component registered for bitECS queries
  if (!hasComponent(world.ecs, eid, Patrol)) {
    addComponent(world.ecs, eid, Patrol);
  }
  Patrol.active[eid] = 1;
  Patrol.waypointCount[eid] = waypoints.length;
  Patrol.currentWaypoint[eid] = 0;
  world.patrolWaypoints.set(eid, [...waypoints]);

  // Start moving to the first waypoint
  if (waypoints.length > 0) {
    UnitStateMachine.targetX[eid] = waypoints[0].x;
    UnitStateMachine.targetY[eid] = waypoints[0].y;
    UnitStateMachine.state[eid] = UnitState.PatrolMove;
  }
}

/** Add a waypoint to an existing patrol route. */
export function addPatrolWaypoint(world: GameWorld, eid: number, x: number, y: number): void {
  const existing = world.patrolWaypoints.get(eid);
  if (existing) {
    existing.push({ x, y });
    Patrol.waypointCount[eid] = existing.length;
  }
}

/** Check if an entity has an active patrol. */
export function hasActivePatrol(world: GameWorld, eid: number): boolean {
  return Patrol.active[eid] === 1 && (world.patrolWaypoints.get(eid)?.length ?? 0) > 0;
}
