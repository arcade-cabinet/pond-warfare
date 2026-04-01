/**
 * Resource Finder Tests
 *
 * Validates findNearestResourceByType finds the correct resource type,
 * returns -1 when no resources of that type exist, and clearTaskOverride
 * resets a unit back to the auto-behavior pool.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Resource, TaskOverride, UnitStateMachine } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { clearTaskOverride, findNearestResourceByType } from '@/game/resource-finder';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

describe('findNearestResourceByType', () => {
  let world: GameWorld;
  let gatherer: number;

  beforeEach(() => {
    world = createGameWorld();
    gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
  });

  it('finds the nearest Clambed when requesting Clams', () => {
    const _far = spawnEntity(world, EntityKind.Clambed, 500, 500, Faction.Neutral);
    const near = spawnEntity(world, EntityKind.Clambed, 120, 110, Faction.Neutral);

    const result = findNearestResourceByType(world, gatherer, ResourceType.Clams);
    expect(result).toBe(near);
  });

  it('finds Cattail when requesting Twigs', () => {
    spawnEntity(world, EntityKind.Clambed, 110, 100, Faction.Neutral); // wrong type
    const cattail = spawnEntity(world, EntityKind.Cattail, 150, 100, Faction.Neutral);

    const result = findNearestResourceByType(world, gatherer, ResourceType.Twigs);
    expect(result).toBe(cattail);
  });

  it('finds PearlBed when requesting Pearls', () => {
    const pearl = spawnEntity(world, EntityKind.PearlBed, 200, 200, Faction.Neutral);

    const result = findNearestResourceByType(world, gatherer, ResourceType.Pearls);
    expect(result).toBe(pearl);
  });

  it('returns -1 when no resources of the requested type exist', () => {
    // Only clam resources on the map
    spawnEntity(world, EntityKind.Clambed, 120, 100, Faction.Neutral);

    const result = findNearestResourceByType(world, gatherer, ResourceType.Pearls);
    expect(result).toBe(-1);
  });

  it('returns -1 when no resources exist at all', () => {
    const result = findNearestResourceByType(world, gatherer, ResourceType.Clams);
    expect(result).toBe(-1);
  });

  it('skips resources with amount <= 0', () => {
    const depleted = spawnEntity(world, EntityKind.Clambed, 110, 100, Faction.Neutral);
    Resource.amount[depleted] = 0;

    const full = spawnEntity(world, EntityKind.Clambed, 300, 300, Faction.Neutral);

    const result = findNearestResourceByType(world, gatherer, ResourceType.Clams);
    expect(result).toBe(full);
  });

  it('returns -1 when all resources of the type are depleted', () => {
    const r1 = spawnEntity(world, EntityKind.Cattail, 110, 100, Faction.Neutral);
    Resource.amount[r1] = 0;
    const r2 = spawnEntity(world, EntityKind.Cattail, 200, 200, Faction.Neutral);
    Resource.amount[r2] = 0;

    const result = findNearestResourceByType(world, gatherer, ResourceType.Twigs);
    expect(result).toBe(-1);
  });

  it('picks the closest of multiple valid resources', () => {
    // Place three clam beds at increasing distances
    spawnEntity(world, EntityKind.Clambed, 500, 500, Faction.Neutral); // far
    const _mid = spawnEntity(world, EntityKind.Clambed, 200, 200, Faction.Neutral);
    const closest = spawnEntity(world, EntityKind.Clambed, 105, 102, Faction.Neutral);

    const result = findNearestResourceByType(world, gatherer, ResourceType.Clams);
    expect(result).toBe(closest);
  });
});

describe('clearTaskOverride', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('resets TaskOverride fields and sets unit to Idle', () => {
    const unit = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    TaskOverride.active[unit] = 1;
    TaskOverride.task[unit] = UnitState.AttackMove;
    TaskOverride.targetEntity[unit] = 99;
    UnitStateMachine.state[unit] = UnitState.AttackMove;

    clearTaskOverride(unit);

    expect(TaskOverride.active[unit]).toBe(0);
    expect(TaskOverride.task[unit]).toBe(UnitState.Idle);
    expect(TaskOverride.targetEntity[unit]).toBe(0);
    expect(UnitStateMachine.state[unit]).toBe(UnitState.Idle);
  });

  it('works on a gatherer with gathering override', () => {
    const unit = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    TaskOverride.active[unit] = 1;
    TaskOverride.task[unit] = UnitState.GatherMove;
    UnitStateMachine.state[unit] = UnitState.GatherMove;

    clearTaskOverride(unit);

    expect(TaskOverride.active[unit]).toBe(0);
    expect(UnitStateMachine.state[unit]).toBe(UnitState.Idle);
  });
});
