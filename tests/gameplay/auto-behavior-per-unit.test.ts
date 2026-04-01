/**
 * Auto-Behavior Per-Unit Override Tests
 *
 * Validates that the TaskOverride component prevents the auto-behavior
 * system from auto-assigning overridden units while still processing
 * non-overridden idle units normally.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { TaskOverride, UnitStateMachine } from '@/ecs/components';
import { autoBehaviorSystem } from '@/ecs/systems/auto-behavior';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

describe('TaskOverride per-unit auto-behavior', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 60; // Auto-behavior runs every 60 frames
    world.autoBehaviors.gatherer = true;
  });

  it('overridden gatherer is NOT auto-assigned', () => {
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;
    TaskOverride.active[gatherer] = 1;

    // Place a resource so the system has something to assign
    spawnEntity(world, EntityKind.Clambed, 120, 100, Faction.Neutral);

    autoBehaviorSystem(world);

    // Should remain idle because TaskOverride blocks auto-assignment
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('non-overridden gatherer IS auto-assigned', () => {
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;
    TaskOverride.active[gatherer] = 0; // Explicit: no override

    const resource = spawnEntity(world, EntityKind.Clambed, 120, 100, Faction.Neutral);

    autoBehaviorSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(resource);
  });

  it('mixed: overridden stays idle, non-overridden gets assigned', () => {
    const pinned = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[pinned] = UnitState.Idle;
    TaskOverride.active[pinned] = 1;

    const free = spawnEntity(world, EntityKind.Gatherer, 110, 100, Faction.Player);
    UnitStateMachine.state[free] = UnitState.Idle;

    spawnEntity(world, EntityKind.Clambed, 130, 100, Faction.Neutral);

    autoBehaviorSystem(world);

    expect(UnitStateMachine.state[pinned]).toBe(UnitState.Idle);
    expect(UnitStateMachine.state[free]).toBe(UnitState.GatherMove);
  });

  it('overridden combat unit is NOT auto-assigned to attack', () => {
    world.autoBehaviors.combat = true;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    UnitStateMachine.state[brawler] = UnitState.Idle;
    TaskOverride.active[brawler] = 1;

    spawnEntity(world, EntityKind.Gator, 300, 300, Faction.Enemy);

    autoBehaviorSystem(world);

    expect(UnitStateMachine.state[brawler]).toBe(UnitState.Idle);
  });

  it('clearing override re-enables auto-assignment', () => {
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;
    TaskOverride.active[gatherer] = 1;

    spawnEntity(world, EntityKind.Clambed, 120, 100, Faction.Neutral);

    autoBehaviorSystem(world);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);

    // Clear override and run again
    TaskOverride.active[gatherer] = 0;
    world.frameCount = 120;
    autoBehaviorSystem(world);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
  });
});
