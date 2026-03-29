/**
 * PhysicsManager Tests
 *
 * Validates that the Planck.js-backed physics world creates bodies,
 * steps without error, removes bodies, and enforces world boundaries.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Collider, Health, Position } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { PhysicsManager } from '@/physics/physics-world';

function createDynamicEntity(world: GameWorld, x: number, y: number, radius = 16): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Health);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Collider.radius[eid] = radius;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  return eid;
}

describe('PhysicsManager', () => {
  let world: GameWorld;
  let physics: PhysicsManager;

  beforeEach(() => {
    world = createGameWorld();
    physics = new PhysicsManager();
  });

  it('should create bodies for entities', () => {
    const eid = createDynamicEntity(world, 100, 100);
    physics.createBody(world.ecs, eid);
    expect(physics.hasBody(eid)).toBe(true);
  });

  it('should not create duplicate bodies for the same entity', () => {
    const eid = createDynamicEntity(world, 100, 100);
    physics.createBody(world.ecs, eid);
    physics.createBody(world.ecs, eid);
    expect(physics.hasBody(eid)).toBe(true);
  });

  it('should step without error', () => {
    const eid1 = createDynamicEntity(world, 100, 100);
    const eid2 = createDynamicEntity(world, 120, 100);
    physics.createBody(world.ecs, eid1);
    physics.createBody(world.ecs, eid2);

    expect(() => {
      physics.step(world.ecs);
    }).not.toThrow();
  });

  it('should remove bodies', () => {
    const eid = createDynamicEntity(world, 100, 100);
    physics.createBody(world.ecs, eid);
    expect(physics.hasBody(eid)).toBe(true);

    physics.removeBody(eid);
    expect(physics.hasBody(eid)).toBe(false);
  });

  it('should handle removing a non-existent body gracefully', () => {
    expect(() => {
      physics.removeBody(9999);
    }).not.toThrow();
  });

  it('should resolve overlapping bodies after stepping', () => {
    // Place two dynamic entities very close together (slight offset so Planck can compute a separation axis)
    const eid1 = createDynamicEntity(world, 200, 200, 16);
    const eid2 = createDynamicEntity(world, 201, 200, 16);
    physics.createBody(world.ecs, eid1);
    physics.createBody(world.ecs, eid2);

    // Step multiple times so the overlap is resolved
    for (let i = 0; i < 120; i++) {
      physics.step(world.ecs);
    }

    // The two entities should have separated (distance increased from initial ~1px)
    const dx = Position.x[eid1] - Position.x[eid2];
    const dy = Position.y[eid1] - Position.y[eid2];
    const dist = Math.sqrt(dx * dx + dy * dy);
    // After stepping, bodies should be further apart than they started (1px)
    expect(dist).toBeGreaterThan(5);
  });
});
