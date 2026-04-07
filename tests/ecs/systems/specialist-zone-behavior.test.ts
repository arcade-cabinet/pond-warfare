import { addComponent, addEntity, hasComponent } from 'bitecs';
import { describe, expect, it } from 'vitest';
import {
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Patrol,
  Position,
  Resource,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { specialistZoneBehaviorSystem } from '@/ecs/systems/specialist-zone-behavior';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { registerSpecialistEntity } from '@/game/specialist-assignment';
import { LOOKOUT_KIND, MUDPAW_KIND, SABOTEUR_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

function createUnit(world: GameWorld, x: number, y: number, kind: EntityKind): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Velocity);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 50;
  Health.max[eid] = 50;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Carrying.resourceType[eid] = ResourceType.None;
  Velocity.speed[eid] = 2;

  return eid;
}

function createResource(
  world: GameWorld,
  x: number,
  y: number,
  kind: EntityKind,
  resourceType: ResourceType,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  EntityTypeTag.kind[eid] = kind;
  Resource.resourceType[eid] = resourceType;
  Resource.amount[eid] = 100;
  return eid;
}

describe('specialistZoneBehaviorSystem', () => {
  it('sends gather specialists toward resources inside their assigned area', () => {
    const world = createGameWorld();
    world.frameCount = 20;
    const fisher = createUnit(world, 100, 100, MUDPAW_KIND);
    registerSpecialistEntity(world, fisher, 'fisher');
    const assignment = world.specialistAssignments.get(fisher);
    if (!assignment) throw new Error('missing assignment');
    assignment.centerX = 180;
    assignment.centerY = 180;
    world.specialistAssignments.set(fisher, assignment);

    const target = createResource(world, 200, 180, EntityKind.Clambed, ResourceType.Fish);

    specialistZoneBehaviorSystem(world);

    expect(UnitStateMachine.state[fisher]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[fisher]).toBe(target);
  });

  it('starts a patrol for area specialists like lookout', () => {
    const world = createGameWorld();
    world.frameCount = 20;
    const lookout = createUnit(world, 100, 100, LOOKOUT_KIND);
    registerSpecialistEntity(world, lookout, 'lookout');

    specialistZoneBehaviorSystem(world);

    expect(hasComponent(world.ecs, lookout, Patrol)).toBe(true);
    expect(world.patrolWaypoints.get(lookout)?.length).toBe(4);
    expect(UnitStateMachine.state[lookout]).toBe(UnitState.PatrolMove);
  });

  it('returns dual-zone specialists to their anchor area when they drift too far', () => {
    const world = createGameWorld();
    world.frameCount = 20;
    const ranger = createUnit(world, 320, 120, SABOTEUR_KIND);
    registerSpecialistEntity(world, ranger, 'ranger');
    const assignment = world.specialistAssignments.get(ranger);
    if (!assignment) throw new Error('missing assignment');
    assignment.anchorX = 100;
    assignment.anchorY = 100;
    assignment.engagementX = 220;
    assignment.engagementY = 100;
    world.specialistAssignments.set(ranger, assignment);

    specialistZoneBehaviorSystem(world);

    expect(UnitStateMachine.state[ranger]).toBe(UnitState.Move);
    expect(UnitStateMachine.targetX[ranger]).toBe(100);
    expect(UnitStateMachine.targetY[ranger]).toBe(100);
  });
});
