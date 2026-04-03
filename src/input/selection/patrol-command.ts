/**
 * Patrol Command
 *
 * Issues patrol commands to selected player units.
 * If a unit already has a patrol, extends it with a new waypoint.
 * Otherwise starts a new patrol from current position to the clicked point.
 */

import { hasComponent } from 'bitecs';
import { showBark } from '@/config/barks';
import { EntityTypeTag, FactionTag, IsBuilding, Position } from '@/ecs/components';
import { addPatrolWaypoint, hasActivePatrol, startPatrol } from '@/ecs/systems/patrol';
import type { GameWorld } from '@/ecs/world';
import { type EntityKind, Faction } from '@/types';

/**
 * Issue a patrol command to all selected movable player units.
 * Returns `true` when at least one unit was dispatched.
 */
export function issuePatrolCommand(world: GameWorld, worldX: number, worldY: number): boolean {
  const movableUnits = world.selection.filter(
    (eid) =>
      hasComponent(world.ecs, eid, FactionTag) &&
      FactionTag.faction[eid] === Faction.Player &&
      !hasComponent(world.ecs, eid, IsBuilding),
  );

  if (movableUnits.length === 0) return false;

  // Patrol ground ping
  world.groundPings.push({
    x: worldX,
    y: worldY,
    life: 20,
    maxLife: 20,
    color: 'rgba(34, 197, 94, 0.8)',
  });

  let barkShown = false;
  for (const eid of movableUnits) {
    if (hasActivePatrol(world, eid)) {
      // Extend existing patrol with a new waypoint
      addPatrolWaypoint(world, eid, worldX, worldY);
    } else {
      // Start new patrol: current position -> clicked point
      const waypoints = [
        { x: Position.x[eid], y: Position.y[eid] },
        { x: worldX, y: worldY },
      ];
      startPatrol(world, eid, waypoints);
    }

    if (!barkShown) {
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      barkShown = showBark(world, eid, Position.x[eid], Position.y[eid], kind, 'move');
    }
  }

  return movableUnits.length > 0;
}
