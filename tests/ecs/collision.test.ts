/**
 * Collision System Tests
 *
 * Validates that overlapping entities are pushed apart.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { addEntity, addComponent } from 'bitecs';
import { Position, Collider, Velocity, FactionTag, EntityTypeTag, UnitStateMachine, Sprite, Health, Combat, Carrying } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { Faction, EntityKind, ResourceType } from '@/types';
import { collisionSystem } from '@/ecs/systems/collision';

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
  Velocity.speed[eid] = 2.0;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;

  return eid;
}

describe('collisionSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should push apart overlapping units', () => {
    const a = createUnit(world, 100, 100);
    const b = createUnit(world, 105, 100); // Very close, overlapping

    const ax = Position.x[a];
    const bx = Position.x[b];

    collisionSystem(world);

    // Units should have moved apart
    expect(Position.x[a]).toBeLessThan(ax);
    expect(Position.x[b]).toBeGreaterThan(bx);
  });

  it('should not affect non-overlapping units', () => {
    const a = createUnit(world, 100, 100);
    const b = createUnit(world, 200, 200); // Far apart

    const ax = Position.x[a];
    const bx = Position.x[b];

    collisionSystem(world);

    expect(Position.x[a]).toBeCloseTo(ax, 1);
    expect(Position.x[b]).toBeCloseTo(bx, 1);
  });

  it('should clamp units to world bounds', () => {
    const eid = createUnit(world, 5, 5); // Near edge

    collisionSystem(world);

    expect(Position.x[eid]).toBeGreaterThanOrEqual(20);
    expect(Position.y[eid]).toBeGreaterThanOrEqual(20);
  });
});
