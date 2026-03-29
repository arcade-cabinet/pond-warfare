/**
 * YukaManager Tests
 *
 * Validates that the Yuka.js AI manager adds enemy vehicles,
 * updates without error, removes enemies, and returns velocity data.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { YukaManager } from '@/ai/yuka-manager';
import { Position } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';

function createEntityWithPosition(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return eid;
}

describe('YukaManager', () => {
  let world: GameWorld;
  let yuka: YukaManager;

  beforeEach(() => {
    world = createGameWorld();
    yuka = new YukaManager();
  });

  it('should add enemy vehicles', () => {
    const eid = createEntityWithPosition(world, 100, 100);
    yuka.addEnemy(eid, 100, 100, 2, 500, 500);
    expect(yuka.has(eid)).toBe(true);
  });

  it('should not add duplicate vehicles for the same entity', () => {
    const eid = createEntityWithPosition(world, 100, 100);
    yuka.addEnemy(eid, 100, 100, 2, 500, 500);
    yuka.addEnemy(eid, 200, 200, 3, 600, 600);
    expect(yuka.has(eid)).toBe(true);
    // Verify there is exactly one vehicle for this entity
    expect(yuka.getVehicleCount()).toBe(1);
  });

  it('should update without error', () => {
    const eid1 = createEntityWithPosition(world, 100, 100);
    const eid2 = createEntityWithPosition(world, 200, 200);
    yuka.addEnemy(eid1, 100, 100, 2, 500, 500);
    yuka.addEnemy(eid2, 200, 200, 3, 400, 400);

    expect(() => {
      yuka.update(1 / 60);
    }).not.toThrow();
  });

  it('should remove enemies', () => {
    const eid = createEntityWithPosition(world, 100, 100);
    yuka.addEnemy(eid, 100, 100, 2, 500, 500);
    expect(yuka.has(eid)).toBe(true);

    yuka.removeEnemy(eid);
    expect(yuka.has(eid)).toBe(false);
  });

  it('should handle removing a non-existent enemy gracefully', () => {
    expect(() => {
      yuka.removeEnemy(9999);
    }).not.toThrow();
  });

  it('should return velocity for registered entities', () => {
    const eid = createEntityWithPosition(world, 100, 100);
    yuka.addEnemy(eid, 100, 100, 2, 500, 500);

    // Update so the vehicle starts moving toward target
    yuka.update(1 / 60);

    const vel = yuka.getVelocity(eid);
    expect(vel).not.toBeNull();
    expect(vel).toHaveLength(2);
  });

  it('should return null velocity for unregistered entities', () => {
    expect(yuka.getVelocity(9999)).toBeNull();
  });

  it('should clear all vehicles', () => {
    const eid1 = createEntityWithPosition(world, 100, 100);
    const eid2 = createEntityWithPosition(world, 200, 200);
    yuka.addEnemy(eid1, 100, 100, 2, 500, 500);
    yuka.addEnemy(eid2, 200, 200, 3, 400, 400);

    yuka.clear();
    expect(yuka.has(eid1)).toBe(false);
    expect(yuka.has(eid2)).toBe(false);
  });
});