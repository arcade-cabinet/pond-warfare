/**
 * Collision System Tests
 *
 * Validates that the Planck.js-backed collision system pushes apart
 * overlapping entities and keeps them within world bounds.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { WORLD_BOUNDS_MARGIN } from '@/constants';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { collisionSystem } from '@/ecs/systems/collision';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { PhysicsManager } from '@/physics/physics-world';
import { EntityKind, Faction } from '@/types';

function createUnit(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Collider.radius[eid] = 16;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  Velocity.speed[eid] = 2.0;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;

  return eid;
}

describe('collisionSystem', () => {
  let world: GameWorld;
  let physics: PhysicsManager;

  beforeEach(() => {
    world = createGameWorld();
    physics = new PhysicsManager();
  });

  it('should push apart overlapping units', () => {
    const a = createUnit(world, 100, 100);
    const b = createUnit(world, 105, 100); // Very close, overlapping

    // Register with physics
    physics.createBody(world.ecs, a);
    physics.createBody(world.ecs, b);

    const ax = Position.x[a];
    const bx = Position.x[b];

    // Run several steps for the physics to resolve
    for (let i = 0; i < 10; i++) {
      collisionSystem(world, physics);
    }

    // Units should have moved apart
    expect(Position.x[a]).toBeLessThan(ax);
    expect(Position.x[b]).toBeGreaterThan(bx);
  });

  it('should not affect non-overlapping units', () => {
    const a = createUnit(world, 100, 100);
    const b = createUnit(world, 200, 200); // Far apart

    physics.createBody(world.ecs, a);
    physics.createBody(world.ecs, b);

    const ax = Position.x[a];
    const bx = Position.x[b];

    collisionSystem(world, physics);

    expect(Position.x[a]).toBeCloseTo(ax, 0);
    expect(Position.x[b]).toBeCloseTo(bx, 0);
  });

  it('should push apart three overlapping units', () => {
    const a = createUnit(world, 100, 100);
    const b = createUnit(world, 105, 100);
    const c = createUnit(world, 110, 100);

    // Register all with physics
    physics.createBody(world.ecs, a);
    physics.createBody(world.ecs, b); // entity id for second unit
    physics.createBody(world.ecs, c);

    // Run several steps for the physics to resolve
    for (let i = 0; i < 10; i++) {
      collisionSystem(world, physics);
    }

    // Leftmost should move left, rightmost should move right
    expect(Position.x[a]).toBeLessThan(100);
    expect(Position.x[c]).toBeGreaterThan(110);
  });

  it('should clamp units to world bounds via edge bodies', () => {
    const eid = createUnit(world, WORLD_BOUNDS_MARGIN + 1, WORLD_BOUNDS_MARGIN + 1);

    physics.createBody(world.ecs, eid);

    // Run several steps
    for (let i = 0; i < 5; i++) {
      collisionSystem(world, physics);
    }

    expect(Position.x[eid]).toBeGreaterThanOrEqual(WORLD_BOUNDS_MARGIN - 1);
    expect(Position.y[eid]).toBeGreaterThanOrEqual(WORLD_BOUNDS_MARGIN - 1);
  });

  it('skips invalid physics bodies instead of poisoning the world step', () => {
    const invalid = createUnit(world, Number.NaN, 100);
    const valid = createUnit(world, 140, 100);

    physics.createBody(world.ecs, invalid);
    physics.createBody(world.ecs, valid);

    expect(physics.hasBody(invalid)).toBe(false);
    expect(physics.hasBody(valid)).toBe(true);
    expect(() => collisionSystem(world, physics)).not.toThrow();
  });
});
