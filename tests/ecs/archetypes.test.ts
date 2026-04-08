/**
 * Archetypes Tests
 *
 * Validates that spawnEntity creates entities with the correct components
 * for different entity kinds (units, buildings, resources).
 */

import { hasComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Carrying,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Sprite,
  TaskOverride,
  UnitStateMachine,
  Velocity,
  Veterancy,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction } from '@/types';

describe('spawnEntity', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('should create a unit with combat, velocity, and carrying components', () => {
    const eid = spawnEntity(world, SAPPER_KIND, 100, 200, Faction.Player);

    expect(hasComponent(world.ecs, eid, Position)).toBe(true);
    expect(hasComponent(world.ecs, eid, Health)).toBe(true);
    expect(hasComponent(world.ecs, eid, Combat)).toBe(true);
    expect(hasComponent(world.ecs, eid, Velocity)).toBe(true);
    expect(hasComponent(world.ecs, eid, UnitStateMachine)).toBe(true);
    expect(hasComponent(world.ecs, eid, Carrying)).toBe(true);
    expect(hasComponent(world.ecs, eid, TaskOverride)).toBe(true);
    expect(hasComponent(world.ecs, eid, Veterancy)).toBe(true);
    expect(Position.x[eid]).toBe(100);
    expect(Position.y[eid]).toBe(200);
    expect(FactionTag.faction[eid]).toBe(Faction.Player);
    expect(EntityTypeTag.kind[eid]).toBe(SAPPER_KIND);
  });

  it('should create a building with IsBuilding and Building components', () => {
    const eid = spawnEntity(world, EntityKind.Lodge, 300, 400, Faction.Player);

    expect(hasComponent(world.ecs, eid, IsBuilding)).toBe(true);
    expect(hasComponent(world.ecs, eid, Building)).toBe(true);
    expect(hasComponent(world.ecs, eid, Sprite)).toBe(true);
    expect(hasComponent(world.ecs, eid, Health)).toBe(true);
    expect(EntityTypeTag.kind[eid]).toBe(EntityKind.Lodge);
  });

  it('should create a resource with IsResource and Resource components', () => {
    const eid = spawnEntity(world, EntityKind.Cattail, 500, 600, Faction.Neutral);

    expect(hasComponent(world.ecs, eid, IsResource)).toBe(true);
    expect(hasComponent(world.ecs, eid, Resource)).toBe(true);
    expect(hasComponent(world.ecs, eid, Health)).toBe(true);
    expect(Resource.amount[eid]).toBeGreaterThan(0);
  });

  it('applies player unit speed multiplier to spawned units', () => {
    world.playerUnitSpeedMultiplier = 1.25;

    const eid = spawnEntity(world, SAPPER_KIND, 100, 200, Faction.Player);

    expect(Velocity.speed[eid]).toBeCloseTo(ENTITY_DEFS[SAPPER_KIND].speed * 1.25, 5);
  });

  it('applies player tower damage multiplier to spawned towers', () => {
    world.playerTowerDamageMultiplier = 1.25;

    const eid = spawnEntity(world, EntityKind.Tower, 300, 400, Faction.Player);

    expect(Combat.damage[eid]).toBe(Math.round(ENTITY_DEFS[EntityKind.Tower].damage * 1.25));
  });

  it('applies player lodge hp multiplier to spawned lodges', () => {
    world.playerLodgeHpMultiplier = 1.15;

    const eid = spawnEntity(world, EntityKind.Lodge, 300, 400, Faction.Player);

    expect(Health.max[eid]).toBe(Math.round(ENTITY_DEFS[EntityKind.Lodge].hp * 1.15));
    expect(Health.current[eid]).toBe(Health.max[eid]);
  });

  it('applies player wall hp multiplier to spawned walls', () => {
    world.playerWallHpMultiplier = 1.15;

    const eid = spawnEntity(world, EntityKind.Wall, 300, 400, Faction.Player);

    expect(Health.max[eid]).toBe(Math.round(ENTITY_DEFS[EntityKind.Wall].hp * 1.15));
    expect(Health.current[eid]).toBe(1);
  });
});
