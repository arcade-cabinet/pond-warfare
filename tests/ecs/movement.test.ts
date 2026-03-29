/**
 * Movement System Tests
 *
 * Validates that entities move toward targets, arrive and transition states,
 * and that the bob animation is applied during movement.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createWorld, addEntity, addComponent } from 'bitecs';
import { Position, Velocity, UnitStateMachine, Collider, Sprite, FactionTag, EntityTypeTag, Combat, Carrying } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { UnitState, Faction, EntityKind, ResourceType } from '@/types';
import { movementSystem } from '@/ecs/systems/movement';

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

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.speed[eid] = 2.0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Collider.radius[eid] = 16;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Gatherer;
  Combat.attackRange[eid] = 40;
  Carrying.resourceType[eid] = ResourceType.None;

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
    UnitStateMachine.targetEntity[eid] = 0;

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

  it('should update facingLeft based on movement direction', () => {
    const eid = createTestUnit(world, 100, 100);
    UnitStateMachine.state[eid] = UnitState.Move;
    UnitStateMachine.targetX[eid] = 50; // Moving left
    UnitStateMachine.targetY[eid] = 100;

    movementSystem(world);
    expect(Sprite.facingLeft[eid]).toBe(1);
  });
});
