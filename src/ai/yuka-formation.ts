/**
 * Yuka Formation Movement
 *
 * Formation setup logic extracted from YukaManager.
 */

import {
  ArriveBehavior,
  OffsetPursuitBehavior,
  Vector3,
  type Vehicle,
  type WanderBehavior,
} from 'yuka';
import { UnitStateMachine } from '@/ecs/components';
import { addBaseBehaviors } from './yuka-behaviors';

/**
 * Set up formation movement for a group of vehicles.
 * Leader gets ArriveBehavior, followers get OffsetPursuitBehavior.
 */
export function setupFormation(
  eids: number[],
  targetX: number,
  targetY: number,
  vehicles: Map<number, Vehicle>,
  wanderBehaviors: Map<number, WanderBehavior>,
  pursuitTargets: Map<number, number>,
  formationEids: Set<number>,
  obstacles: Vehicle[],
): void {
  if (eids.length === 0) return;

  const leaderEid = eids[0];
  const leaderVehicle = vehicles.get(leaderEid);

  if (leaderVehicle) {
    leaderVehicle.steering.clear();
    wanderBehaviors.delete(leaderEid);
    pursuitTargets.delete(leaderEid);

    addBaseBehaviors(leaderVehicle, obstacles);

    const arrive = new ArriveBehavior(new Vector3(targetX, 0, targetY));
    arrive.deceleration = 1.5;
    leaderVehicle.steering.add(arrive);

    formationEids.add(leaderEid);
  }

  for (let i = 1; i < eids.length; i++) {
    const eid = eids[i];
    const vehicle = vehicles.get(eid);
    if (!vehicle || !leaderVehicle) continue;

    vehicle.steering.clear();
    wanderBehaviors.delete(eid);
    pursuitTargets.delete(eid);

    addBaseBehaviors(vehicle, obstacles);

    const unitTargetX = UnitStateMachine.targetX[eid];
    const unitTargetZ = UnitStateMachine.targetY[eid];
    const offsetX = unitTargetX - leaderVehicle.position.x;
    const offsetZ = unitTargetZ - leaderVehicle.position.z;
    const offset = new Vector3(offsetX, 0, offsetZ);

    const offsetPursuit = new OffsetPursuitBehavior(leaderVehicle, offset);
    offsetPursuit.weight = 1.0;
    vehicle.steering.add(offsetPursuit);

    formationEids.add(eid);
  }
}
