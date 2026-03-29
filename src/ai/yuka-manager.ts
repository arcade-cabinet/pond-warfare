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
  AlignmentBehavior,
  ArriveBehavior,
  CohesionBehavior,
  EntityManager,
  FleeBehavior,
  ObstacleAvoidanceBehavior,
  OffsetPursuitBehavior,
  PursuitBehavior,
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

/** Weight for alignment force during formation movement. */
const ALIGNMENT_WEIGHT = 0.3;
/** Weight for cohesion force during formation movement. */
const COHESION_WEIGHT = 0.4;

/** Weight for obstacle avoidance — low so it only kicks in when close. */
const OBSTACLE_AVOIDANCE_WEIGHT = 0.3;
/** How often (in frames) to refresh the obstacle list from ECS buildings. */
const OBSTACLE_REFRESH_INTERVAL = 60;

export class YukaManager {
  readonly entityManager = new EntityManager();

  /** Map from ECS entity ID to Yuka Vehicle */
  private vehicles = new Map<number, Vehicle>();

  /** Tracks active flee timers: eid -> remaining frames */
  private fleeTimers = new Map<number, number>();

  /** Tracks active wander behaviors per vehicle for cleanup */
  private wanderBehaviors = new Map<number, WanderBehavior>();

  /** Tracks entity IDs that currently have flocking (alignment/cohesion) behaviors */
  private formationEids = new Set<number>();

  /** Tracks active pursuit behaviors per vehicle for cleanup */
  private pursuitTargets = new Map<number, number>();

  /** Shared obstacle list for ObstacleAvoidanceBehavior (built from buildings). */
  private obstacles: Vehicle[] = [];

  /** Frame counter for periodic obstacle list refresh. */
  private obstacleRefreshCounter = 0;

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

    // Obstacle avoidance steers around buildings
    const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
    obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
    vehicle.steering.add(obstacleAvoidance);

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
   * If the unit is in a formation, AlignmentBehavior and CohesionBehavior are
   * also preserved for coordinated group movement.
   */
  setTarget(eid: number, targetX: number, targetY: number, isChasing: boolean): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    // Clear all behaviors then re-add separation + obstacle avoidance first
    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);
    this.pursuitTargets.delete(eid);

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
    obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
    vehicle.steering.add(obstacleAvoidance);

    // Preserve flocking behaviors for units in a formation
    if (this.formationEids.has(eid)) {
      const alignment = new AlignmentBehavior();
      alignment.weight = ALIGNMENT_WEIGHT;
      vehicle.steering.add(alignment);

      const cohesion = new CohesionBehavior();
      cohesion.weight = COHESION_WEIGHT;
      vehicle.steering.add(cohesion);
    }

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
   * Use PursuitBehavior to intercept a moving target vehicle.
   * Instead of seeking the target's current position, this predicts where
   * the target WILL BE and steers to intercept. Much smarter for chasing
   * retreating units.
   *
   * Falls back to setTarget() with isChasing=true if either entity is not
   * registered with Yuka.
   */
  setPursuit(eid: number, targetEid: number): void {
    const vehicle = this.vehicles.get(eid);
    const targetVehicle = this.vehicles.get(targetEid);
    if (!vehicle || !targetVehicle) return;

    // Skip if already pursuing the same target
    if (this.pursuitTargets.get(eid) === targetEid) return;

    // Clear existing directional behaviors, keep separation + obstacle avoidance
    this.clearDirectionalBehaviors(vehicle);

    const pursuit = new PursuitBehavior(targetVehicle);
    pursuit.weight = 1.0;
    vehicle.steering.add(pursuit);

    this.pursuitTargets.set(eid, targetEid);
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

    // Clear existing behaviors, re-add separation + obstacle avoidance + wander
    vehicle.steering.clear();

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
    obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
    vehicle.steering.add(obstacleAvoidance);

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
    this.pursuitTargets.delete(eid);

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
    obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
    vehicle.steering.add(obstacleAvoidance);

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
    this.pursuitTargets.delete(eid);

    const separation = new SeparationBehavior();
    separation.weight = SEPARATION_WEIGHT;
    vehicle.steering.add(separation);

    const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
    obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
    vehicle.steering.add(obstacleAvoidance);
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
    this.formationEids.delete(eid);
    this.pursuitTargets.delete(eid);
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

  /**
   * Set up formation movement for a group of entities. Each vehicle gets
   * AlignmentBehavior and CohesionBehavior in addition to existing
   * SeparationBehavior, producing coordinated flocking during the move.
   * Each entity seeks its own individual formation offset target.
   *
   * Call this after registering units with addUnit() / setTarget().
   *
   * @param eids  ECS entity IDs of all units in the formation
   * @param targetX  Group center target X
   * @param targetY  Group center target Y
   */
  setFormation(eids: number[], targetX: number, targetY: number): void {
    // Need at least one entity; first entity becomes leader
    if (eids.length === 0) return;

    const leaderEid = eids[0];
    const leaderVehicle = this.vehicles.get(leaderEid);

    // Set up the leader with standard arrive behavior toward the group center
    if (leaderVehicle) {
      leaderVehicle.steering.clear();
      this.wanderBehaviors.delete(leaderEid);
      this.pursuitTargets.delete(leaderEid);

      const separation = new SeparationBehavior();
      separation.weight = SEPARATION_WEIGHT;
      leaderVehicle.steering.add(separation);

      const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
      obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
      leaderVehicle.steering.add(obstacleAvoidance);

      const arrive = new ArriveBehavior(new Vector3(targetX, 0, targetY));
      arrive.deceleration = 1.5;
      leaderVehicle.steering.add(arrive);

      this.formationEids.add(leaderEid);
    }

    // Followers use OffsetPursuitBehavior to maintain exact offset from leader
    for (let i = 1; i < eids.length; i++) {
      const eid = eids[i];
      const vehicle = this.vehicles.get(eid);
      if (!vehicle || !leaderVehicle) continue;

      vehicle.steering.clear();
      this.wanderBehaviors.delete(eid);
      this.pursuitTargets.delete(eid);

      const separation = new SeparationBehavior();
      separation.weight = SEPARATION_WEIGHT;
      vehicle.steering.add(separation);

      const obstacleAvoidance = new ObstacleAvoidanceBehavior(this.obstacles);
      obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
      vehicle.steering.add(obstacleAvoidance);

      // Calculate offset from leader's current position to this unit's
      // target position. The ECS has already assigned per-unit formation
      // offsets in UnitStateMachine.targetX/Y, so we derive the offset
      // from the difference between the unit's target and the group center.
      const unitTargetX = vehicle.position.x; // Will be corrected by movement system
      const unitTargetZ = vehicle.position.z;
      const offsetX = unitTargetX - leaderVehicle.position.x;
      const offsetZ = unitTargetZ - leaderVehicle.position.z;
      const offset = new Vector3(offsetX, 0, offsetZ);

      const offsetPursuit = new OffsetPursuitBehavior(leaderVehicle, offset);
      offsetPursuit.weight = 1.0;
      vehicle.steering.add(offsetPursuit);

      this.formationEids.add(eid);
    }
  }

  /**
   * Remove flocking behaviors (alignment, cohesion) from a unit, reverting
   * to normal separation-only steering. Called automatically when a unit
   * arrives at its destination, or can be called manually.
   */
  clearFormationBehaviors(eid: number): void {
    this.formationEids.delete(eid);
    // No need to rebuild steering here; the movement system's setTarget()
    // or removeUnit() will replace behaviors on the next frame.
  }

  /** Returns true if the entity currently has formation flocking behaviors. */
  isInFormation(eid: number): boolean {
    return this.formationEids.has(eid);
  }

  /** Clear all vehicles (e.g. on game reset). */
  clear(): void {
    for (const vehicle of this.vehicles.values()) {
      this.entityManager.remove(vehicle);
    }
    this.vehicles.clear();
    this.fleeTimers.clear();
    this.wanderBehaviors.clear();
    this.formationEids.clear();
    this.pursuitTargets.clear();
    this.obstacles = [];
    this.obstacleRefreshCounter = 0;
  }

  /**
   * Set obstacle entities that units should steer around (typically buildings).
   * Call this periodically with the current set of building positions.
   * Each obstacle is represented as a Vehicle with position and boundingRadius.
   */
  setObstacles(obstacles: Array<{ x: number; y: number; radius: number }>): void {
    // Rebuild the obstacle vehicle list
    this.obstacles = obstacles.map((o) => {
      const v = new Vehicle();
      v.position.set(o.x, 0, o.y);
      v.boundingRadius = o.radius;
      return v;
    });

    // Update existing obstacle avoidance behaviors with the new list
    for (const vehicle of this.vehicles.values()) {
      for (const behavior of vehicle.steering.behaviors) {
        if (behavior instanceof ObstacleAvoidanceBehavior) {
          (behavior as ObstacleAvoidanceBehavior).obstacles = this.obstacles;
        }
      }
    }
  }

  /** Returns true if the obstacle list should be refreshed this frame. */
  shouldRefreshObstacles(): boolean {
    this.obstacleRefreshCounter++;
    if (this.obstacleRefreshCounter >= OBSTACLE_REFRESH_INTERVAL) {
      this.obstacleRefreshCounter = 0;
      return true;
    }
    return false;
  }

  // ---- Internal helpers ----

  /**
   * Clear directional behaviors (seek, arrive, pursuit, flee, wander)
   * from a vehicle while preserving separation, obstacle avoidance,
   * and flocking behaviors.
   */
  private clearDirectionalBehaviors(vehicle: Vehicle): void {
    const keep: import('yuka').SteeringBehavior[] = [];
    for (const b of vehicle.steering.behaviors) {
      if (
        b instanceof SeparationBehavior ||
        b instanceof ObstacleAvoidanceBehavior ||
        b instanceof AlignmentBehavior ||
        b instanceof CohesionBehavior
      ) {
        keep.push(b);
      }
    }
    vehicle.steering.clear();
    for (const b of keep) {
      vehicle.steering.add(b);
    }
  }

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
