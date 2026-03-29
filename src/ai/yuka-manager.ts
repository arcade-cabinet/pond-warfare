/**
 * Yuka.js AI Manager
 *
 * Wraps Yuka's EntityManager to provide steering behaviors (seek, arrive, flee,
 * separation, wander) for all units (both player and enemy). Each ECS entity
 * gets a paired Yuka Vehicle with appropriate steering behaviors. The Yuka
 * update loop runs each frame, and resulting velocities are synced back to ECS
 * Position components in the movement system.
 */

import { type World as EcsWorld, entityExists } from 'bitecs';
import {
  ArriveBehavior,
  EntityManager,
  FleeBehavior,
  SeekBehavior,
  SeparationBehavior,
  Vector3,
  Vehicle,
  WanderBehavior,
} from 'yuka';
import { Position } from '@/ecs/components';

/** Separation radius in world units. Vehicles within this distance push apart. */
const SEPARATION_NEIGHBORHOOD_RADIUS = 40;
/** Weight for separation force relative to other steering behaviors. */
const SEPARATION_WEIGHT = 0.6;

/** Duration in frames that a flee behavior stays active before being removed. */
const FLEE_DURATION_FRAMES = 90; // ~1.5 seconds at 60 fps

export class YukaManager {
  readonly entityManager = new EntityManager();

  /** Map from ECS entity ID to Yuka Vehicle */
  private vehicles = new Map<number, Vehicle>();

  /** Tracks active flee timers: eid -> remaining frames */
  private fleeTimers = new Map<number, number>();

  /** Tracks active wander behaviors per vehicle for cleanup */
  private wanderBehaviors = new Map<number, WanderBehavior>();

  /**
   * Register a unit (any faction) with a Yuka Vehicle using ArriveBehavior
   * toward a target. ArriveBehavior gives smooth deceleration near the target
   * position. SeparationBehavior is always added to prevent unit stacking.
   */
  addUnit(
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

    // Enable neighborhood tracking for SeparationBehavior
    vehicle.updateNeighborhood = true;
    vehicle.neighborhoodRadius = SEPARATION_NEIGHBORHOOD_RADIUS;

    // Separation keeps units from overlapping
    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const arrive = new ArriveBehavior(new Vector3(targetX, 0, targetY));
    arrive.deceleration = 1.5;
    vehicle.steering.add(arrive);

    this.entityManager.add(vehicle);
    this.vehicles.set(eid, vehicle);
  }

  /**
   * Update the steering target for an existing vehicle.
   * Switches to SeekBehavior when chasing a moving entity, ArriveBehavior for
   * static targets. Preserves SeparationBehavior across target changes.
   */
  setTarget(eid: number, targetX: number, targetY: number, isChasing: boolean): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    // Clear all behaviors then re-add separation first
    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

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

  /**
   * Add WanderBehavior to a vehicle so it patrols an area instead of standing
   * still. Clears existing directional behaviors (seek/arrive) but keeps
   * separation. If the vehicle already has a wander behavior, this is a no-op.
   *
   * @param eid  ECS entity ID
   * @param radius  Wander circle radius (larger = wider arcs). Default 20.
   * @param jitter  Random displacement per frame (higher = more erratic). Default 80.
   * @param distance  How far ahead the wander circle is projected. Default 40.
   */
  setWander(eid: number, radius = 20, jitter = 80, distance = 40): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    // Already wandering
    if (this.wanderBehaviors.has(eid)) return;

    // Clear existing behaviors, re-add separation + wander
    vehicle.steering.clear();

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const wander = new WanderBehavior(radius, distance, jitter);
    wander.weight = 0.6;
    vehicle.steering.add(wander);

    this.wanderBehaviors.set(eid, wander);
  }

  /**
   * Temporarily add FleeBehavior so the vehicle runs away from a point.
   * The flee is auto-removed after FLEE_DURATION_FRAMES via tickFleeTimers().
   * Any existing directional behaviors are replaced; separation is preserved.
   *
   * @param eid  ECS entity ID
   * @param fleeX  World X to flee from
   * @param fleeY  World Y to flee from
   * @param panicDistance  Max distance at which flee force is applied. Default 200.
   */
  setFlee(eid: number, fleeX: number, fleeY: number, panicDistance = 200): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const flee = new FleeBehavior(new Vector3(fleeX, 0, fleeY), panicDistance);
    flee.weight = 1.0;
    vehicle.steering.add(flee);

    this.fleeTimers.set(eid, FLEE_DURATION_FRAMES);
  }

  /**
   * Remove an active flee behavior and revert to idle (no directional
   * behavior). Separation is preserved.
   */
  clearFlee(eid: number): void {
    this.fleeTimers.delete(eid);
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);
  }

  /** Returns true if the entity currently has an active flee timer. */
  isFleeing(eid: number): boolean {
    return this.fleeTimers.has(eid);
  }

  /**
   * @deprecated Use addUnit() instead. Kept for backward compatibility.
   */
  addEnemy(
    eid: number,
    x: number,
    y: number,
    speed: number,
    targetX: number,
    targetY: number,
  ): void {
    this.addUnit(eid, x, y, speed, targetX, targetY);
  }

  /** Remove a unit's Yuka vehicle (on death or cleanup). */
  removeUnit(eid: number): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;
    this.entityManager.remove(vehicle);
    this.vehicles.delete(eid);
    this.fleeTimers.delete(eid);
    this.wanderBehaviors.delete(eid);
  }

  /**
   * @deprecated Use removeUnit() instead. Kept for backward compatibility.
   */
  removeEnemy(eid: number): void {
    this.removeUnit(eid);
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
  update(deltaTime: number, ecsWorld?: EcsWorld): void {
    // Tick down flee timers and auto-clear expired ones
    this.tickFleeTimers();

    this.entityManager.update(deltaTime);

    // Sync Yuka vehicle positions back to ECS Position components
    // Collect stale eids to remove after iteration
    const stale: number[] = [];
    for (const [eid, vehicle] of this.vehicles) {
      // Remove stale vehicles whose ECS entity no longer exists
      if (ecsWorld && !entityExists(ecsWorld, eid)) {
        stale.push(eid);
        continue;
      }
      Position.x[eid] = vehicle.position.x;
      Position.y[eid] = vehicle.position.z; // z -> y in our 2D world
    }
    for (const eid of stale) {
      this.removeUnit(eid);
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
    this.fleeTimers.clear();
    this.wanderBehaviors.clear();
  }

  // ---- Internal helpers ----

  /**
   * Decrement flee timers each frame. When a timer expires, the flee behavior
   * is removed and only separation remains (the unit will appear to stop).
   */
  private tickFleeTimers(): void {
    for (const [eid, remaining] of this.fleeTimers) {
      if (remaining <= 1) {
        this.clearFlee(eid);
      } else {
        this.fleeTimers.set(eid, remaining - 1);
      }
    }
  }
}
