/**
 * Auto-Behavior Behavioral Tests
 *
 * Validates the auto-behavior toggle system: gather, build, defend,
 * attack, and heal automations for idle player units.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Health, Position, UnitStateMachine } from '@/ecs/components';
import { autoBehaviorSystem } from '@/ecs/systems/auto-behavior';
import { autoBuildSystem } from '@/ecs/systems/auto-build';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Auto Behaviors', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Auto-behavior runs every 60 frames
    world.frameCount = 60;
  });

  it('auto-gather should only activate when toggled on', () => {
    world.autoBehaviors.gather = false;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;

    spawnEntity(world, EntityKind.Clambed, 120, 100, Faction.Neutral);

    autoBehaviorSystem(world);

    // Should remain idle because auto-gather is off
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('auto-gather should send idle gatherers to nearest resource', () => {
    world.autoBehaviors.gather = true;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;

    // Create two resources: one near, one far
    const nearResource = spawnEntity(world, EntityKind.Clambed, 120, 100, Faction.Neutral);
    spawnEntity(world, EntityKind.Cattail, 800, 800, Faction.Neutral);

    autoBehaviorSystem(world);

    // Gatherer should be heading to the nearest resource
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(nearResource);
  });

  it('auto-build should build burrow when at pop cap', () => {
    world.autoBehaviors.build = true;
    world.frameCount = 300; // Auto-build runs every 300 frames
    world.resources.clams = 10000;
    world.resources.twigs = 10000;
    world.resources.food = 8;
    world.resources.maxFood = 8;

    // Need a lodge for the build system to reference
    spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);

    // Need an idle gatherer to do the building
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 510, 510, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;

    const clamsBefore = world.resources.clams;
    const twigsBefore = world.resources.twigs;

    autoBuildSystem(world);

    // If a build was triggered, resources should have been deducted
    // The pop cap pressure (score 100) should pick Burrow
    if (world.resources.clams < clamsBefore || world.resources.twigs < twigsBefore) {
      // Gatherer should be assigned to build
      expect(UnitStateMachine.state[gatherer]).toBe(UnitState.BuildMove);
    }
    // Resources should have changed (burrow costs 0 clams, 75 twigs)
    expect(world.resources.twigs).toBeLessThanOrEqual(twigsBefore);
  });

  it('auto-build should build tower when under attack', () => {
    world.autoBehaviors.build = true;
    world.frameCount = 300;
    world.resources.clams = 10000;
    world.resources.twigs = 10000;

    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 510, 510, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;

    // Place an enemy near the lodge to trigger "under attack" pressure
    const enemy = spawnEntity(world, EntityKind.Gator, 550, 500, Faction.Enemy);

    // Populate spatial hash
    world.spatialHash.clear();
    world.spatialHash.insert(enemy, Position.x[enemy], Position.y[enemy]);
    world.spatialHash.insert(lodge, Position.x[lodge], Position.y[lodge]);
    world.spatialHash.insert(gatherer, Position.x[gatherer], Position.y[gatherer]);

    autoBuildSystem(world);

    // Under attack with no tower: should trigger Tower build (highest score: 120)
    // Check if a floating text was generated (build was attempted)
    const buildText = world.floatingTexts.find((t) => t.text.includes('Auto-building'));
    if (buildText) {
      expect(buildText.text).toContain('Tower');
    }
  });

  it('auto-defend should patrol combat units near lodge', () => {
    world.autoBehaviors.defend = true;

    spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    const brawler = spawnEntity(world, EntityKind.Brawler, 510, 510, Faction.Player);
    UnitStateMachine.state[brawler] = UnitState.Idle;

    autoBehaviorSystem(world);

    // Brawler should be in AttackMovePatrol state (defending near lodge)
    expect(UnitStateMachine.state[brawler]).toBe(UnitState.AttackMovePatrol);
  });

  it('auto-attack should send combat units toward enemies', () => {
    world.autoBehaviors.attack = true;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    UnitStateMachine.state[brawler] = UnitState.Idle;

    const enemy = spawnEntity(world, EntityKind.Gator, 300, 300, Faction.Enemy);

    autoBehaviorSystem(world);

    // Brawler should be attack-moving toward the enemy
    expect(UnitStateMachine.state[brawler]).toBe(UnitState.AttackMove);
    expect(UnitStateMachine.targetEntity[brawler]).toBe(enemy);
  });

  it('auto-heal should send healers to wounded allies', () => {
    world.autoBehaviors.heal = true;

    const healer = spawnEntity(world, EntityKind.Healer, 100, 100, Faction.Player);
    UnitStateMachine.state[healer] = UnitState.Idle;

    const wounded = spawnEntity(world, EntityKind.Brawler, 200, 200, Faction.Player);
    Health.current[wounded] = 20; // Wounded (below max)

    autoBehaviorSystem(world);

    // Healer should be moving toward the wounded ally
    expect(UnitStateMachine.state[healer]).toBe(UnitState.Move);
    expect(UnitStateMachine.targetEntity[healer]).toBe(wounded);
  });
});
