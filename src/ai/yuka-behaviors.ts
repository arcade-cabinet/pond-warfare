/**
 * Yuka Steering Behavior Helpers
 *
 * Extracted from YukaManager: behavior setup helpers for separation,
 * obstacle avoidance, and directional behavior clearing.
 */

import {
  AlignmentBehavior,
  CohesionBehavior,
  ObstacleAvoidanceBehavior,
  SeparationBehavior,
  type Vehicle,
} from 'yuka';

/** Separation radius in world units. */
export const SEPARATION_NEIGHBORHOOD_RADIUS = 40;
/** Weight for separation force relative to other steering behaviors. */
export const SEPARATION_WEIGHT = 0.6;

/** Weight for alignment force during formation movement. */
export const ALIGNMENT_WEIGHT = 0.3;
/** Weight for cohesion force during formation movement. */
export const COHESION_WEIGHT = 0.4;

/** Weight for obstacle avoidance. */
export const OBSTACLE_AVOIDANCE_WEIGHT = 0.3;

/** Duration in frames that a flee behavior stays active. */
export const FLEE_DURATION_FRAMES = 90;

/** How often (in frames) to refresh the obstacle list from ECS buildings. */
export const OBSTACLE_REFRESH_INTERVAL = 60;

/** Add standard separation + obstacle avoidance behaviors to a vehicle. */
export function addBaseBehaviors(vehicle: Vehicle, obstacles: Vehicle[]): void {
  const separation = new SeparationBehavior();
  separation.weight = SEPARATION_WEIGHT;
  vehicle.steering.add(separation);

  const obstacleAvoidance = new ObstacleAvoidanceBehavior(obstacles);
  obstacleAvoidance.weight = OBSTACLE_AVOIDANCE_WEIGHT;
  vehicle.steering.add(obstacleAvoidance);
}

/** Add flocking behaviors (alignment + cohesion) to a vehicle. */
export function addFlockingBehaviors(vehicle: Vehicle): void {
  const alignment = new AlignmentBehavior();
  alignment.weight = ALIGNMENT_WEIGHT;
  vehicle.steering.add(alignment);

  const cohesion = new CohesionBehavior();
  cohesion.weight = COHESION_WEIGHT;
  vehicle.steering.add(cohesion);
}

/**
 * Clear directional behaviors (seek, arrive, pursuit, flee, wander)
 * from a vehicle while preserving separation, obstacle avoidance,
 * and flocking behaviors.
 */
export function clearDirectionalBehaviors(vehicle: Vehicle): void {
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
