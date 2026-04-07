/**
 * Physics World Manager
 *
 * Wraps Planck.js to provide broadphase-accelerated collision detection
 * for all game entities, replacing the O(n^2) brute-force loop.
 *
 * - Zero-gravity world (top-down RTS).
 * - Dynamic circle bodies for mobile units.
 * - Static circle bodies for buildings (units can't walk through them).
 * - Static edge bodies for world boundary walls.
 * - Each frame: sync ECS Position -> Planck, step, sync Planck -> ECS Position.
 */

import { hasComponent } from 'bitecs';
import { type Body, Circle, Edge, Vec2, World } from 'planck';
import { WORLD_BOUNDS_MARGIN, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { Collider, Health, IsBuilding, IsResource, Position } from '@/ecs/components';

const STEP_DT = 1 / 60;
const VELOCITY_ITERATIONS = 6;
const POSITION_ITERATIONS = 2;

export class PhysicsManager {
  private world: World;
  private bodies: Map<number, Body> = new Map();

  constructor(worldWidth?: number, worldHeight?: number) {
    // Zero gravity for top-down game
    this.world = new World({ gravity: Vec2(0, 0) });
    this.createWorldBounds(worldWidth ?? WORLD_WIDTH, worldHeight ?? WORLD_HEIGHT);
  }

  /** Create 4 static edge bodies as world boundary walls. */
  private createWorldBounds(worldW: number, worldH: number): void {
    const m = WORLD_BOUNDS_MARGIN;
    const w = worldW - m;
    const h = worldH - m;

    const wall = this.world.createBody();
    // Top
    wall.createFixture({ shape: new Edge(Vec2(m, m), Vec2(w, m)) });
    // Bottom
    wall.createFixture({ shape: new Edge(Vec2(m, h), Vec2(w, h)) });
    // Left
    wall.createFixture({ shape: new Edge(Vec2(m, m), Vec2(m, h)) });
    // Right
    wall.createFixture({ shape: new Edge(Vec2(w, m), Vec2(w, h)) });
  }

  /**
   * Register an ECS entity with the physics world.
   * Buildings become static bodies; mobile units become dynamic bodies.
   * Resources are not added (they have no collision behaviour).
   */
  createBody(ecsWorld: any, eid: number): void {
    if (this.bodies.has(eid)) return;

    const isResource = hasComponent(ecsWorld, eid, IsResource);
    if (isResource) return; // resources don't participate in physics

    const isBuilding = hasComponent(ecsWorld, eid, IsBuilding);
    const radius = Collider.radius[eid] || 16;
    const x = Position.x[eid];
    const y = Position.y[eid];
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(radius) || radius <= 0) {
      return;
    }

    const body = this.world.createBody({
      type: isBuilding ? 'static' : 'dynamic',
      position: Vec2(x, y),
      fixedRotation: true,
      linearDamping: 10, // high damping so bodies don't drift after separation
    });

    body.createFixture({
      shape: new Circle(radius),
      friction: 0,
      restitution: 0, // no bounce
      density: 1,
    });

    // Store the eid on the body's user data for identification
    body.setUserData(eid);

    this.bodies.set(eid, body);
  }

  /** Remove an entity's physics body (call on entity death). */
  removeBody(eid: number): void {
    const body = this.bodies.get(eid);
    if (body) {
      this.world.destroyBody(body);
      this.bodies.delete(eid);
    }
  }

  /** Returns true if an entity has a physics body registered. */
  hasBody(eid: number): boolean {
    return this.bodies.has(eid);
  }

  /**
   * Run one physics step:
   * 1. Sync ECS positions -> Planck body positions (for units that moved via movement system).
   * 2. Step the physics world.
   * 3. Sync Planck body positions -> ECS positions (collision resolution).
   */
  step(ecsWorld: any): void {
    // Pre-step: sync ECS -> Planck for dynamic bodies
    for (const [eid, body] of this.bodies) {
      if (body.isStatic()) continue;
      // Skip dead entities
      if (hasComponent(ecsWorld, eid, Health) && Health.current[eid] <= 0) continue;

      const pos = body.getPosition();
      const ex = Position.x[eid];
      const ey = Position.y[eid];
      if (!Number.isFinite(ex) || !Number.isFinite(ey)) continue;

      // Only update Planck if ECS position changed (movement system moved the entity)
      if (Math.abs(pos.x - ex) > 0.01 || Math.abs(pos.y - ey) > 0.01) {
        body.setPosition(Vec2(ex, ey));
        body.setAwake(true);
      }
    }

    // Step physics
    this.world.step(STEP_DT, VELOCITY_ITERATIONS, POSITION_ITERATIONS);

    // Post-step: sync Planck -> ECS for dynamic bodies
    for (const [eid, body] of this.bodies) {
      if (body.isStatic()) continue;
      if (hasComponent(ecsWorld, eid, Health) && Health.current[eid] <= 0) continue;

      const pos = body.getPosition();
      Position.x[eid] = pos.x;
      Position.y[eid] = pos.y;
    }
  }

  /** Clean up the entire physics world. */
  destroy(): void {
    // Destroy all Planck bodies from the world
    for (const body of this.bodies.values()) {
      this.world.destroyBody(body);
    }
    this.bodies.clear();
  }
}
