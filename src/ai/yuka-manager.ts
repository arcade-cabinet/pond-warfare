/**
 * Yuka.js AI Manager
 *
 * Wraps Yuka's EntityManager to provide steering behaviors (seek, arrive, flee)
 * for enemy units. Player units remain direct-command driven for snappy response.
 *
 * Each enemy ECS entity gets a paired Yuka Vehicle with appropriate steering
 * behaviors. The Yuka update loop runs each frame, and resulting velocities are
 * synced back to ECS Position components in the movement system.
 */

import { entityExists } from 'bitecs';
import { ArriveBehavior, EntityManager, SeekBehavior, Vector3, Vehicle } from 'yuka';
import { Position } from '@/ecs/components';

export class YukaManager {
  readonly entityManager = new EntityManager();

  /** Map from ECS entity ID to Yuka Vehicle */
  private vehicles = new Map<number, Vehicle>();

  /**
   * Register an enemy entity with a Yuka Vehicle using ArriveBehavior toward a target.
   * ArriveBehavior gives smooth deceleration near the target position.
   */
  addEnemy(
    eid: number,
    x: number,
    y: number,
    speed: number,
    targetX: number,
    targetY: number,
  ): void {
    if (this.vehicles.has(eid)) return;

    const vehicle = new Vehicle();
    vehicle.position.set(x, 0, y); // Yuka uses 3D; we map 2D x,y to x,z
    vehicle.maxSpeed = speed;
    vehicle.maxForce = speed * 2;

    const arrive = new ArriveBehavior(new Vector3(targetX, 0, targetY));
    arrive.deceleration = 1.5;
    vehicle.steering.add(arrive);

    this.entityManager.add(vehicle);
    this.vehicles.set(eid, vehicle);
  }

  /**
   * Update the steering target for an existing enemy vehicle.
   * Switches to SeekBehavior when chasing a moving entity, ArriveBehavior for static targets.
   */
  setTarget(eid: number, targetX: number, targetY: number, isChasing: boolean): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    // Clear existing behaviors
    vehicle.steering.clear();

    const target = new Vector3(targetX, 0, targetY);

    if (isChasing) {
      const seek = new SeekBehavior(target);
      vehicle.steering.add(seek);
    } else {
      const arrive = new ArriveBehavior(target);
      arrive.deceleration = 1.5;
      vehicle.steering.add(arrive);
    }
  }

  /** Remove an enemy entity's Yuka vehicle (on death or cleanup). */
  removeEnemy(eid: number): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;
    this.entityManager.remove(vehicle);
    this.vehicles.delete(eid);
  }

  /** Returns true if the given ECS entity has a registered Yuka vehicle. */
  has(eid: number): boolean {
    return this.vehicles.has(eid);
  }

  /**
   * Run one Yuka update step and sync positions back to ECS.
   * deltaTime is in seconds.
   * @param ecsWorld - ECS world reference for entity existence checks
   */
  update(deltaTime: number, ecsWorld?: any): void {
    this.entityManager.update(deltaTime);

    // Sync Yuka vehicle positions back to ECS Position components
    for (const [eid, vehicle] of this.vehicles) {
      // Skip syncing if entity no longer exists in ECS
      if (ecsWorld && !entityExists(ecsWorld, eid)) continue;
      Position.x[eid] = vehicle.position.x;
      Position.y[eid] = vehicle.position.z; // z -> y in our 2D world
    }
  }

  /** Sync ECS position into the Yuka vehicle (e.g. after external teleport). */
  syncFromECS(eid: number): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;
    vehicle.position.set(Position.x[eid], 0, Position.y[eid]);
  }

  /** Get the Yuka velocity for an entity, returns [vx, vy] or null. */
  getVelocity(eid: number): [number, number] | null {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return null;
    return [vehicle.velocity.x, vehicle.velocity.z];
  }

  /** Get the total number of registered vehicles (for testing). */
  getVehicleCount(): number {
    return this.vehicles.size;
  }

  /** Clear all vehicles (e.g. on game reset). */
  clear(): void {
    for (const vehicle of this.vehicles.values()) {
      this.entityManager.remove(vehicle);
    }
    this.vehicles.clear();
  }
}
