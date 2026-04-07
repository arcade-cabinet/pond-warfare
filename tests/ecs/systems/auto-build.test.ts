/**
 * Auto-Build System Tests
 *
 * Validates pressure-based auto-building logic.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import {
  Building,
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { autoBuildSystem } from '@/ecs/systems/auto-build';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

/** Create a completed player building. */
function createBuilding(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = ENTITY_DEFS[kind].hp;
  Health.max[eid] = ENTITY_DEFS[kind].hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;

  return eid;
}

/** Create an idle player Mudpaw. */
function createMudpaw(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Combat);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = MUDPAW_KIND;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

describe('autoBuildSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Set frameCount to a multiple of 300 so the system actually runs
    world.frameCount = 300;
  });

  it('should not build when autoBehaviors.build is false', () => {
    world.autoBehaviors.gatherer = false;
    world.resources.fish = 10000;
    world.resources.logs = 10000;
    world.resources.food = world.resources.maxFood; // Pop cap trigger
    world.resources.maxFood = 8;

    createBuilding(world, EntityKind.Lodge, 500, 500);
    createMudpaw(world, 510, 500);

    const clamsBefore = world.resources.fish;
    autoBuildSystem(world);

    // Resources should not change
    expect(world.resources.fish).toBe(clamsBefore);
  });

  it('should not build when player cannot afford any candidate', () => {
    world.autoBehaviors.gatherer = true;
    world.resources.fish = 0;
    world.resources.logs = 0;
    world.resources.food = world.resources.maxFood;
    world.resources.maxFood = 8;

    createBuilding(world, EntityKind.Lodge, 500, 500);
    createMudpaw(world, 510, 500);

    autoBuildSystem(world);

    // No floating text should appear (no build was triggered)
    expect(world.floatingTexts.length).toBe(0);
  });

  it('should not build when no idle gatherer is available', () => {
    world.autoBehaviors.gatherer = true;
    world.resources.fish = 10000;
    world.resources.logs = 10000;
    world.resources.food = world.resources.maxFood;
    world.resources.maxFood = 8;

    createBuilding(world, EntityKind.Lodge, 500, 500);
    // Create a busy Mudpaw (not idle)
    const gid = createMudpaw(world, 510, 500);
    UnitStateMachine.state[gid] = UnitState.GatherMove;

    const clamsBefore = world.resources.fish;
    autoBuildSystem(world);

    expect(world.resources.fish).toBe(clamsBefore);
  });

  it('should only run every 300 frames', () => {
    world.autoBehaviors.gatherer = true;
    world.resources.fish = 10000;
    world.resources.logs = 10000;
    world.resources.food = world.resources.maxFood;
    world.resources.maxFood = 8;

    createBuilding(world, EntityKind.Lodge, 500, 500);
    createMudpaw(world, 510, 500);

    // frameCount not a multiple of 300
    world.frameCount = 301;
    const clamsBefore = world.resources.fish;
    autoBuildSystem(world);

    expect(world.resources.fish).toBe(clamsBefore);
  });

  it('should successfully auto-build when conditions are met', () => {
    world.autoBehaviors.gatherer = true;
    world.resources.fish = 10000;
    world.resources.logs = 10000;
    // Pop cap reached triggers Burrow build pressure (score 100)
    world.resources.food = 8;
    world.resources.maxFood = 8;
    // frameCount must be multiple of 300
    world.frameCount = 300;

    const lodge = createBuilding(world, EntityKind.Lodge, 800, 800);
    // Set sprite dimensions so canPlaceBuilding overlap checks work properly
    Sprite.width[lodge] = 96;
    Sprite.height[lodge] = 96;

    const gid = createMudpaw(world, 810, 800);

    const twigsBefore = world.resources.logs;
    autoBuildSystem(world);

    // Burrow costs 0 clams, 75 twigs - twigs should have been deducted
    expect(world.resources.logs).toBeLessThan(twigsBefore);
    // Mudpaw should be in BuildMove state
    expect(UnitStateMachine.state[gid]).toBe(UnitState.BuildMove);
    // A floating text should have been created
    expect(world.floatingTexts.length).toBeGreaterThan(0);
  });
});
