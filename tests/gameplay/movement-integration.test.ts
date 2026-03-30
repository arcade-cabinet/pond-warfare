/**
 * Movement Integration Tests
 *
 * Tests the FULL movement pipeline: command → state change → Yuka registration
 * → position update. This is a critical gameplay test that must pass before
 * any merge. Catches the "units bob but don't move" class of bugs.
 */

import { addComponent, addEntity, createWorld } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { YukaManager } from '@/ai/yuka-manager';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { movementSystem } from '@/ecs/systems/movement';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

/** Create a minimal GameWorld for movement testing. */
function createTestWorld(): GameWorld {
  const ecs = createWorld();
  const yukaManager = new YukaManager();

  return {
    ecs,
    frameCount: 0,
    yukaManager,
    selection: [],
    camX: 0,
    camY: 0,
    viewWidth: 800,
    viewHeight: 600,
    zoomLevel: 1,
    spatialHash: {
      clear: () => {},
      insert: () => {},
      query: () => [],
    },
    commanderSpeedBuff: new Set<number>(),
    commanderModifiers: { auraSpeedBonus: 0 },
    floatingTexts: [],
    particles: [],
    tech: {},
    resources: { clams: 0, twigs: 0, pearls: 0 },
  } as unknown as GameWorld;
}

/** Spawn a test unit with all required components. */
function spawnUnit(
  world: GameWorld,
  x: number,
  y: number,
  speed: number,
  kind: EntityKind = EntityKind.Gatherer,
  faction: Faction = Faction.Player,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.speed[eid] = speed;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  Collider.radius[eid] = 10;
  EntityTypeTag.kind[eid] = kind;
  FactionTag.faction[eid] = faction;
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;

  return eid;
}

describe('Movement integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createTestWorld();
  });

  it('single unit moves toward target after being set to Move state', () => {
    const eid = spawnUnit(world, 100, 100, 2.0);
    const targetX = 300;
    const targetY = 300;

    // Simulate issueContextCommand setting state + target
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = targetX;
    UnitStateMachine.targetY[eid] = targetY;

    const startX = Position.x[eid];
    const startY = Position.y[eid];

    // Frame 1: movement system should register with Yuka
    movementSystem(world);

    // Yuka should now have the vehicle registered
    expect(world.yukaManager.has(eid)).toBe(true);

    // Run Yuka update to generate velocity
    world.yukaManager.update(1 / 60, world.ecs);

    // Frame 2: movement system should have Yuka-steered position
    world.frameCount = 1;
    movementSystem(world);
    world.yukaManager.update(1 / 60, world.ecs);

    // Run several more frames to let the unit actually move
    for (let i = 0; i < 300; i++) {
      world.frameCount = i + 2;
      movementSystem(world);
      world.yukaManager.update(1 / 60, world.ecs);
    }

    // Unit should have moved from start position toward target
    const movedX = Position.x[eid];
    const movedY = Position.y[eid];
    const distMoved = Math.sqrt((movedX - startX) ** 2 + (movedY - startY) ** 2);

    expect(distMoved).toBeGreaterThan(1); // Must have moved meaningfully
    // Should be closer to target than start
    const distToTarget = Math.sqrt((movedX - targetX) ** 2 + (movedY - targetY) ** 2);
    const startDistToTarget = Math.sqrt((startX - targetX) ** 2 + (startY - targetY) ** 2);
    expect(distToTarget).toBeLessThan(startDistToTarget);
  });

  it('multiple units all move toward target', () => {
    const units = [
      spawnUnit(world, 100, 100, 2.0),
      spawnUnit(world, 120, 100, 2.0),
      spawnUnit(world, 100, 120, 2.0),
    ];

    for (const eid of units) {
      UnitStateMachine.state[eid] = UnitState.Move;
      UnitStateMachine.targetX[eid] = 400;
      UnitStateMachine.targetY[eid] = 400;
    }

    // Run 60 frames
    for (let i = 0; i < 300; i++) {
      world.frameCount = i;
      movementSystem(world);
      world.yukaManager.update(1 / 60, world.ecs);
    }

    // All units should have moved
    for (const eid of units) {
      const dist = Math.sqrt((Position.x[eid] - 100) ** 2 + (Position.y[eid] - 100) ** 2);
      expect(dist).toBeGreaterThan(1);
    }
  });

  it('unit in GatherMove state moves toward resource', () => {
    const gatherer = spawnUnit(world, 100, 100, 2.0, EntityKind.Gatherer);
    const resource = addEntity(world.ecs);
    addComponent(world.ecs, resource, Position);
    addComponent(world.ecs, resource, Health);
    addComponent(world.ecs, resource, Collider);
    addComponent(world.ecs, resource, IsResource);
    addComponent(world.ecs, resource, EntityTypeTag);
    Position.x[resource] = 300;
    Position.y[resource] = 300;
    Health.current[resource] = 100;
    Collider.radius[resource] = 15;

    UnitStateMachine.state[gatherer] = UnitState.GatherMove;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.targetX[gatherer] = 300;
    UnitStateMachine.targetY[gatherer] = 300;

    for (let i = 0; i < 300; i++) {
      world.frameCount = i;
      movementSystem(world);
      world.yukaManager.update(1 / 60, world.ecs);
    }

    // Should have moved toward the resource
    const dist = Math.sqrt((Position.x[gatherer] - 100) ** 2 + (Position.y[gatherer] - 100) ** 2);
    expect(dist).toBeGreaterThan(1);
  });

  it('unit in AttackMove state moves toward enemy', () => {
    const brawler = spawnUnit(world, 100, 100, 1.8, EntityKind.Brawler);

    UnitStateMachine.state[brawler] = UnitState.AttackMove;
    UnitStateMachine.targetX[brawler] = 400;
    UnitStateMachine.targetY[brawler] = 400;
    UnitStateMachine.targetEntity[brawler] = -1;

    for (let i = 0; i < 300; i++) {
      world.frameCount = i;
      movementSystem(world);
      world.yukaManager.update(1 / 60, world.ecs);
    }

    const dist = Math.sqrt((Position.x[brawler] - 100) ** 2 + (Position.y[brawler] - 100) ** 2);
    expect(dist).toBeGreaterThan(1);
  });

  it('idle units do NOT move', () => {
    const eid = spawnUnit(world, 100, 100, 2.0);
    UnitStateMachine.state[eid] = UnitState.Idle;

    for (let i = 0; i < 30; i++) {
      world.frameCount = i;
      movementSystem(world);
      world.yukaManager.update(1 / 60, world.ecs);
    }

    expect(Position.x[eid]).toBe(100);
    expect(Position.y[eid]).toBe(100);
  });

  it('Yuka vehicle is registered on first movement frame', () => {
    const eid = spawnUnit(world, 100, 100, 2.0);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 300;
    UnitStateMachine.targetY[eid] = 300;

    expect(world.yukaManager.has(eid)).toBe(false);

    // One frame of movement system should register it
    movementSystem(world);

    expect(world.yukaManager.has(eid)).toBe(true);
  });
});
