/**
 * Yuka.js AI Manager
 *
 * Wraps Yuka's EntityManager to provide steering behaviors (seek, arrive, flee,
 * separation, wander) for all units (both player and enemy). Each ECS entity
 * gets a paired Yuka Vehicle with appropriate steering behaviors.
 *
 * Behavior setup helpers are in yuka-behaviors.ts.
 * Formation logic is in yuka-formation.ts.
 */

import { type World as EcsWorld, entityExists } from 'bitecs';
import {
  ArriveBehavior,
  EntityManager,
  FleeBehavior,
  ObstacleAvoidanceBehavior,
  PursuitBehavior,
  SeekBehavior,
  Vector3,
  Vehicle,
  WanderBehavior,
} from 'yuka';
import { Position } from '@/ecs/components';
import {
  addBaseBehaviors,
  addFlockingBehaviors,
  clearDirectionalBehaviors,
  FLEE_DURATION_FRAMES,
  OBSTACLE_REFRESH_INTERVAL,
  SEPARATION_NEIGHBORHOOD_RADIUS,
} from './yuka-behaviors';
import { setupFormation } from './yuka-formation';

export class YukaManager {
  readonly entityManager = new EntityManager();

  private vehicles = new Map<number, Vehicle>();
  private fleeTimers = new Map<number, number>();
  private wanderBehaviors = new Map<number, WanderBehavior>();
  private formationEids = new Set<number>();
  private pursuitTargets = new Map<number, number>();
  private obstacles: Vehicle[] = [];
  private obstacleRefreshCounter = 0;

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
    vehicle.position.set(x, 0, y);
    const pixelsPerSec = speed * 60;
    vehicle.maxSpeed = pixelsPerSec;
    vehicle.maxForce = pixelsPerSec * 2;
    vehicle.updateNeighborhood = true;
    vehicle.neighborhoodRadius = SEPARATION_NEIGHBORHOOD_RADIUS;

    addBaseBehaviors(vehicle, this.obstacles);

    const arrive = new ArriveBehavior(new Vector3(targetX, 0, targetY));
    arrive.deceleration = 1.5;
    vehicle.steering.add(arrive);

    this.entityManager.add(vehicle);
    this.vehicles.set(eid, vehicle);
  }

  setTarget(eid: number, targetX: number, targetY: number, isChasing: boolean): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);
    this.pursuitTargets.delete(eid);

    addBaseBehaviors(vehicle, this.obstacles);
    if (this.formationEids.has(eid)) addFlockingBehaviors(vehicle);

    const target = new Vector3(targetX, 0, targetY);
    if (isChasing) {
      vehicle.steering.add(new SeekBehavior(target));
    } else {
      const arrive = new ArriveBehavior(target);
      arrive.deceleration = 1.5;
      vehicle.steering.add(arrive);
    }
  }

  setPursuit(eid: number, targetEid: number): void {
    const vehicle = this.vehicles.get(eid);
    const targetVehicle = this.vehicles.get(targetEid);
    if (!vehicle || !targetVehicle) return;
    if (this.pursuitTargets.get(eid) === targetEid) return;

    clearDirectionalBehaviors(vehicle);
    this.wanderBehaviors.delete(eid);

    const pursuit = new PursuitBehavior(targetVehicle);
    pursuit.weight = 1.0;
    vehicle.steering.add(pursuit);
    this.pursuitTargets.set(eid, targetEid);
  }

  setWander(eid: number, radius = 20, jitter = 80, distance = 40): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;
    if (this.wanderBehaviors.has(eid)) return;

    vehicle.steering.clear();
    addBaseBehaviors(vehicle, this.obstacles);

    const wander = new WanderBehavior(radius, distance, jitter);
    wander.weight = 0.6;
    vehicle.steering.add(wander);
    this.wanderBehaviors.set(eid, wander);
  }

  setFlee(eid: number, fleeX: number, fleeY: number, panicDistance = 200): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);
    this.pursuitTargets.delete(eid);

    addBaseBehaviors(vehicle, this.obstacles);

    const flee = new FleeBehavior(new Vector3(fleeX, 0, fleeY), panicDistance);
    flee.weight = 1.0;
    vehicle.steering.add(flee);
    this.fleeTimers.set(eid, FLEE_DURATION_FRAMES);
  }

  clearFlee(eid: number): void {
    this.fleeTimers.delete(eid);
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;

    vehicle.steering.clear();
    this.wanderBehaviors.delete(eid);
    this.pursuitTargets.delete(eid);
    addBaseBehaviors(vehicle, this.obstacles);
  }

  isFleeing(eid: number): boolean {
    return this.fleeTimers.has(eid);
  }

  /** @deprecated Use addUnit() instead. */
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

  /** @deprecated Use removeUnit() instead. */
  removeEnemy(eid: number): void {
    this.removeUnit(eid);
  }

  has(eid: number): boolean {
    return this.vehicles.has(eid);
  }

  update(deltaTime: number, ecsWorld?: EcsWorld): void {
    this.tickFleeTimers();
    this.entityManager.update(deltaTime);

    const stale: number[] = [];
    for (const [eid, vehicle] of this.vehicles) {
      if (ecsWorld && !entityExists(ecsWorld, eid)) {
        stale.push(eid);
        continue;
      }
      Position.x[eid] = vehicle.position.x;
      Position.y[eid] = vehicle.position.z;
    }
    for (const eid of stale) this.removeUnit(eid);
  }

  syncFromECS(eid: number): void {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return;
    vehicle.position.set(Position.x[eid], 0, Position.y[eid]);
  }

  getVelocity(eid: number): [number, number] | null {
    const vehicle = this.vehicles.get(eid);
    if (!vehicle) return null;
    return [vehicle.velocity.x, vehicle.velocity.z];
  }

  getVehicleCount(): number {
    return this.vehicles.size;
  }

  setFormation(eids: number[], targetX: number, targetY: number): void {
    setupFormation(
      eids,
      targetX,
      targetY,
      this.vehicles,
      this.wanderBehaviors,
      this.pursuitTargets,
      this.formationEids,
      this.obstacles,
    );
  }

  clearFormationBehaviors(eid: number): void {
    this.formationEids.delete(eid);
  }

  isInFormation(eid: number): boolean {
    return this.formationEids.has(eid);
  }

  clear(): void {
    for (const vehicle of this.vehicles.values()) this.entityManager.remove(vehicle);
    this.vehicles.clear();
    this.fleeTimers.clear();
    this.wanderBehaviors.clear();
    this.formationEids.clear();
    this.pursuitTargets.clear();
    this.obstacles = [];
    this.obstacleRefreshCounter = 0;
  }

  setObstacles(obstacles: Array<{ x: number; y: number; radius: number }>): void {
    this.obstacles = obstacles.map((o) => {
      const v = new Vehicle();
      v.position.set(o.x, 0, o.y);
      v.boundingRadius = o.radius;
      return v;
    });
    for (const vehicle of this.vehicles.values()) {
      for (const behavior of vehicle.steering.behaviors) {
        if (behavior instanceof ObstacleAvoidanceBehavior) {
          (behavior as ObstacleAvoidanceBehavior).obstacles = this.obstacles;
        }
      }
    }
  }

  shouldRefreshObstacles(): boolean {
    this.obstacleRefreshCounter++;
    if (this.obstacleRefreshCounter >= OBSTACLE_REFRESH_INTERVAL) {
      this.obstacleRefreshCounter = 0;
      return true;
    }
    return false;
  }

  private tickFleeTimers(): void {
    for (const [eid, remaining] of this.fleeTimers) {
      if (remaining <= 1) this.clearFlee(eid);
      else this.fleeTimers.set(eid, remaining - 1);
    }
  }
}
