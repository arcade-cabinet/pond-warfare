/**
 * Patrol System Tests
 *
 * Validates patrol waypoint advancement, looping, damage-pause for
 * defensive units, and regular move clearing patrol.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Patrol,
  Position,
  Sprite,
  Stance,
  StanceMode,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { arrive } from '@/ecs/systems/movement/arrive';
import {
  addPatrolWaypoint,
  clearPatrol,
  hasActivePatrol,
  patrolSystem,
  startPatrol,
} from '@/ecs/systems/patrol';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

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
  addComponent(world.ecs, eid, Stance);
  addComponent(world.ecs, eid, Patrol);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Velocity.speed[eid] = 2.0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Collider.radius[eid] = 16;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = SAPPER_KIND;
  Combat.attackRange[eid] = 40;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  Stance.mode[eid] = StanceMode.Aggressive;

  return eid;
}

describe('patrol system', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should start a patrol and set unit to PatrolMove', () => {
    const eid = createTestUnit(world, 100, 100);
    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 },
    ];

    startPatrol(world, eid, waypoints);

    expect(Patrol.active[eid]).toBe(1);
    expect(Patrol.waypointCount[eid]).toBe(3);
    expect(Patrol.currentWaypoint[eid]).toBe(0);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.PatrolMove);
    expect(UnitStateMachine.targetX[eid]).toBe(100);
    expect(UnitStateMachine.targetY[eid]).toBe(100);
    expect(hasActivePatrol(world, eid)).toBe(true);
  });

  it('should advance to the next waypoint on arrival', () => {
    const eid = createTestUnit(world, 100, 100);
    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
      { x: 300, y: 300 },
    ];

    startPatrol(world, eid, waypoints);

    // Simulate arrival at waypoint 0 -> should advance to waypoint 1
    arrive(world, eid, UnitState.PatrolMove);

    expect(Patrol.currentWaypoint[eid]).toBe(1);
    expect(UnitStateMachine.targetX[eid]).toBe(300);
    expect(UnitStateMachine.targetY[eid]).toBe(100);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.PatrolMove);
  });

  it('should loop back to the first waypoint after the last', () => {
    const eid = createTestUnit(world, 100, 100);
    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ];

    startPatrol(world, eid, waypoints);

    // Arrive at wp0, advance to wp1
    arrive(world, eid, UnitState.PatrolMove);
    expect(Patrol.currentWaypoint[eid]).toBe(1);

    // Arrive at wp1, loop back to wp0
    arrive(world, eid, UnitState.PatrolMove);
    expect(Patrol.currentWaypoint[eid]).toBe(0);
    expect(UnitStateMachine.targetX[eid]).toBe(100);
    expect(UnitStateMachine.targetY[eid]).toBe(100);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.PatrolMove);
  });

  it('should pause patrol when defensive unit takes damage', () => {
    const eid = createTestUnit(world, 100, 100);
    Stance.mode[eid] = StanceMode.Defensive;

    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ];
    startPatrol(world, eid, waypoints);

    // Simulate taking damage very recently (5 frames ago)
    world.frameCount = 10;
    Health.lastDamagedFrame[eid] = 5;

    patrolSystem(world);

    expect(Patrol.active[eid]).toBe(0);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.Idle);
  });

  it('should NOT pause patrol for aggressive stance units on damage', () => {
    const eid = createTestUnit(world, 100, 100);
    Stance.mode[eid] = StanceMode.Aggressive;

    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ];
    startPatrol(world, eid, waypoints);

    // Simulate taking damage very recently (5 frames ago)
    world.frameCount = 10;
    Health.lastDamagedFrame[eid] = 5;

    patrolSystem(world);

    // Should still be patrolling since stance is Aggressive, not Defensive
    expect(Patrol.active[eid]).toBe(1);
  });

  it('should clear patrol when clearPatrol is called', () => {
    const eid = createTestUnit(world, 100, 100);
    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ];

    startPatrol(world, eid, waypoints);
    expect(hasActivePatrol(world, eid)).toBe(true);

    clearPatrol(world, eid);

    expect(Patrol.active[eid]).toBe(0);
    expect(Patrol.waypointCount[eid]).toBe(0);
    expect(world.patrolWaypoints.has(eid)).toBe(false);
    expect(hasActivePatrol(world, eid)).toBe(false);
  });

  it('should add waypoints to existing patrol', () => {
    const eid = createTestUnit(world, 100, 100);
    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ];

    startPatrol(world, eid, waypoints);
    addPatrolWaypoint(world, eid, 300, 300);

    const stored = world.patrolWaypoints.get(eid)!;
    expect(stored.length).toBe(3);
    expect(stored[2]).toEqual({ x: 300, y: 300 });
    expect(Patrol.waypointCount[eid]).toBe(3);
  });

  it('should clean up patrol data for dead entities', () => {
    const eid = createTestUnit(world, 100, 100);
    const waypoints = [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ];

    startPatrol(world, eid, waypoints);

    // Kill the entity
    Health.current[eid] = 0;

    world.frameCount = 10;
    patrolSystem(world);

    expect(Patrol.active[eid]).toBe(0);
    expect(world.patrolWaypoints.has(eid)).toBe(false);
  });

  it('should go idle on arrival when patrol has no waypoints', () => {
    const eid = createTestUnit(world, 100, 100);
    addComponent(world.ecs, eid, Patrol);

    // Set patrol active but with no waypoints stored
    Patrol.active[eid] = 1;
    Patrol.waypointCount[eid] = 0;
    UnitStateMachine.state[eid] = UnitState.PatrolMove;

    arrive(world, eid, UnitState.PatrolMove);

    expect(Patrol.active[eid]).toBe(0);
    expect(UnitStateMachine.state[eid]).toBe(UnitState.Idle);
  });

  it('should go idle on arrival when patrol is not active', () => {
    const eid = createTestUnit(world, 100, 100);
    Patrol.active[eid] = 0;
    UnitStateMachine.state[eid] = UnitState.PatrolMove;

    arrive(world, eid, UnitState.PatrolMove);

    expect(UnitStateMachine.state[eid]).toBe(UnitState.Idle);
  });
});
