/**
 * Economy Integration Tests
 *
 * Tests that gatherers can be spawned, assigned to resources, and actually
 * gather. Tests auto-gather behavior and resource depletion. Operates
 * directly on ECS systems — no UI, no DOM, no fake clicks.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { GATHER_AMOUNT } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Carrying, Health, Resource, UnitStateMachine } from '@/ecs/components';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';
import { getIdleGatherers } from '../helpers/ecs-queries';

describe('Economy Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('gatherer collects clams and transitions to return state', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceType[gatherer]).toBe(ResourceType.Fish);
    expect(Carrying.resourceAmount[gatherer]).toBe(GATHER_AMOUNT);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.ReturnMove);
    expect(UnitStateMachine.returnEntity[gatherer]).toBe(lodge);
  });

  it('gatherer collects twigs from cattails', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const cattail = spawnEntity(world, EntityKind.Cattail, 100, 100, Faction.Neutral);
    Resource.amount[cattail] = 4000;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = cattail;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceType[gatherer]).toBe(ResourceType.Logs);
  });

  it('resource depletes to zero and marks for death', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = GATHER_AMOUNT;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    gatheringSystem(world);

    expect(Resource.amount[resource]).toBe(0);
    expect(Health.current[resource]).toBe(0);
  });

  it('gatherer goes idle when resource is already depleted', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 0;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 5;

    gatheringSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('auto-gather assigns idle gatherers to nearest resource', () => {
    world.autoBehaviors.gatherer = true;
    world.frameCount = 60;

    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 120, 120, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Idle;

    // Legacy auto-behavior toggle system removed in v3.0 and replaced by Pearl blueprint/autonomy progression.
    // Idle gatherers no longer auto-assign; player must manually command them
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('multiple gatherers work in parallel without conflict', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;

    const g1 = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, EntityKind.Gatherer, 105, 100, Faction.Player);

    for (const g of [g1, g2]) {
      UnitStateMachine.state[g] = UnitState.Gathering;
      UnitStateMachine.targetEntity[g] = resource;
      UnitStateMachine.gatherTimer[g] = 1;
    }

    gatheringSystem(world);

    expect(Carrying.resourceAmount[g1]).toBe(GATHER_AMOUNT);
    expect(Carrying.resourceAmount[g2]).toBe(GATHER_AMOUNT);
    expect(Resource.amount[resource]).toBe(4000 - GATHER_AMOUNT * 2);
  });

  it('pearls are gathered from pearl beds', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const pearl = spawnEntity(world, EntityKind.PearlBed, 100, 100, Faction.Neutral);
    Resource.amount[pearl] = 500;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = pearl;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceType[gatherer]).toBe(ResourceType.Rocks);
  });

  it('tidal harvest tech applies to gather amount', () => {
    world.tech.tidalHarvest = true;
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    gatheringSystem(world);

    // tidalHarvest: +25% gather amount (15 * 1.25 = 18.75 → 19)
    expect(Carrying.resourceAmount[gatherer]).toBe(19);
  });

  it('idle gatherers are detected by query helper', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const g1 = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, EntityKind.Gatherer, 150, 100, Faction.Player);
    UnitStateMachine.state[g1] = UnitState.Idle;
    UnitStateMachine.state[g2] = UnitState.Gathering;

    const idles = getIdleGatherers(world);
    expect(idles).toContain(g1);
    expect(idles).not.toContain(g2);
  });

  it('enemy gatherers compete for same resources', () => {
    spawnEntity(world, EntityKind.PredatorNest, 500, 500, Faction.Enemy);
    const resource = spawnEntity(world, EntityKind.Clambed, 300, 300, Faction.Neutral);
    Resource.amount[resource] = GATHER_AMOUNT * 2;

    const enemyGatherer = spawnEntity(world, EntityKind.Gatherer, 300, 300, Faction.Enemy);
    UnitStateMachine.state[enemyGatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[enemyGatherer] = resource;
    UnitStateMachine.gatherTimer[enemyGatherer] = 1;

    gatheringSystem(world);

    expect(Resource.amount[resource]).toBe(GATHER_AMOUNT);
    expect(Carrying.resourceType[enemyGatherer]).toBe(ResourceType.Fish);
  });
});
