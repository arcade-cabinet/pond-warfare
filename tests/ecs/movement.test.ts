/**
 * Movement System Tests
 *
 * Validates that entities move toward targets, arrive and transition states,
 * and that the bob animation offset is set during movement.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
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
import { movementSystem } from '@/ecs/systems/movement';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createTestUnit(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Health);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.speed[eid] = 2.0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Collider.radius[eid] = 16;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;
  Combat.attackRange[eid] = 40;
  Carrying.resourceType[eid] = ResourceType.None;
  Health.current[eid] = 100;
  Health.max[eid] = 100;

  return eid;
}

describe('movementSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should move entity toward target position', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 200;
    UnitStateMachine.targetY[eid] = 100;

    const startX = Position.x[eid];
    // First tick registers with Yuka; Yuka update + second tick moves the entity
    movementSystem(world);
    world.yukaManager.update(1 / 60, world.ecs);
    movementSystem(world);
    expect(Position.x[eid]).toBeGreaterThan(startX);
    expect(Position.y[eid]).toBeCloseTo(100, 0);
  });

  it('should transition to Idle on arrival for Move state', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 101; // Very close
    UnitStateMachine.targetY[eid] = 100;

    movementSystem(world);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.Idle);
  });

  it('should transition to Gathering on arrival for GatherMove state', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.GatherMove;
    UnitStateMachine.targetX[eid] = 101;
    UnitStateMachine.targetY[eid] = 100;
    UnitStateMachine.targetEntity[eid] = -1; // -1 sentinel = no target

    movementSystem(world);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.Gathering);
    expect(UnitStateMachine.gatherTimer[eid]).toBe(60);
  });

  it('should not move idle entities', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.Idle;

    movementSystem(world);
    expect(Position.x[eid]).toBe(100);
    expect(Position.y[eid]).toBe(100);
  });

  it('should set bob animation offset during movement', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 200;
    UnitStateMachine.targetY[eid] = 100;

    // Advance frameCount so sin-based bob is non-zero
    world.frameCount = 10;
    movementSystem(world);
    expect(Sprite.yOffset[eid]).not.toBe(0);
  });

  it('should update facingLeft based on movement direction', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 50; // Moving left
    UnitStateMachine.targetY[eid] = 100;

    movementSystem(world);
    expect(Sprite.facingLeft[eid]).toBe(1);
  });
});
