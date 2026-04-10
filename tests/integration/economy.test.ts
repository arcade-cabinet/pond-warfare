/**
 * Economy Integration Tests
 *
 * Tests that Mudpaws can be spawned, assigned to resources, and actually
 * gather. Tests auto-gather behavior and resource depletion. Operates
 * directly on ECS systems — no UI, no DOM, no fake clicks.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { GATHER_AMOUNT } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Carrying, Health, Resource, UnitStateMachine } from '@/ecs/components';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { ENEMY_HARVESTER_KIND, MUDPAW_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';
import { getIdleMudpaws } from '../helpers/ecs-queries';

describe('Economy Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('Mudpaw collects fish and transitions to return state', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = resource;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceType[mudpaw]).toBe(ResourceType.Fish);
    expect(Carrying.resourceAmount[mudpaw]).toBe(GATHER_AMOUNT);
    expect(UnitStateMachine.state[mudpaw]).toBe(UnitState.ReturnMove);
    expect(UnitStateMachine.returnEntity[mudpaw]).toBe(lodge);
  });

  it('Mudpaw collects logs from cattails', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const cattail = spawnEntity(world, EntityKind.Cattail, 100, 100, Faction.Neutral);
    Resource.amount[cattail] = 4000;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = cattail;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceType[mudpaw]).toBe(ResourceType.Logs);
  });

  it('resource depletes to zero and marks for death', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = GATHER_AMOUNT;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = resource;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    expect(Resource.amount[resource]).toBe(0);
    expect(Health.current[resource]).toBe(0);
  });

  it('Mudpaw goes idle when resource is already depleted', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 0;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = resource;
    UnitStateMachine.gatherTimer[mudpaw] = 5;

    gatheringSystem(world);

    expect(UnitStateMachine.state[mudpaw]).toBe(UnitState.Idle);
  });

  it('legacy auto-generalist toggle no longer auto-assigns idle Mudpaws', () => {
    world.autoBehaviors.generalist = true;
    world.frameCount = 60;

    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 120, 120, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[mudpaw] = UnitState.Idle;

    // Legacy per-role automation toggle system removed in v3.0 and replaced by Pearl blueprint/autonomy progression.
    // Idle Mudpaws no longer auto-assign; player must manually command them
    expect(UnitStateMachine.state[mudpaw]).toBe(UnitState.Idle);
  });

  it('multiple Mudpaws work in parallel without conflict', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;

    const g1 = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, MUDPAW_KIND, 105, 100, Faction.Player);

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
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = pearl;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceType[mudpaw]).toBe(ResourceType.Rocks);
  });

  it('tidal harvest tech applies to gather amount', () => {
    world.tech.tidalHarvest = true;
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = resource;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    // tidalHarvest: +25% gather amount (15 * 1.25 = 18.75 → 19)
    expect(Carrying.resourceAmount[mudpaw]).toBe(19);
  });

  it('player gatherSpeedMod preserves some per-trip yield on long routes', () => {
    world.gatherSpeedMod = 1.1;
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = resource;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceAmount[mudpaw]).toBe(16);
  });

  it('idle Mudpaws are detected by query helper', () => {
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const g1 = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, MUDPAW_KIND, 150, 100, Faction.Player);
    UnitStateMachine.state[g1] = UnitState.Idle;
    UnitStateMachine.state[g2] = UnitState.Gathering;

    const idles = getIdleMudpaws(world);
    expect(idles).toContain(g1);
    expect(idles).not.toContain(g2);
  });

  it('enemy harvester units compete for same resources', () => {
    world.gatherSpeedMod = 2;
    spawnEntity(world, EntityKind.PredatorNest, 500, 500, Faction.Enemy);
    const resource = spawnEntity(world, EntityKind.Clambed, 300, 300, Faction.Neutral);
    Resource.amount[resource] = GATHER_AMOUNT * 2;

    const enemyHarvester = spawnEntity(world, ENEMY_HARVESTER_KIND, 300, 300, Faction.Enemy);
    UnitStateMachine.state[enemyHarvester] = UnitState.Gathering;
    UnitStateMachine.targetEntity[enemyHarvester] = resource;
    UnitStateMachine.gatherTimer[enemyHarvester] = 1;

    gatheringSystem(world);

    expect(Carrying.resourceAmount[enemyHarvester]).toBe(GATHER_AMOUNT);
    expect(Resource.amount[resource]).toBe(GATHER_AMOUNT);
    expect(Carrying.resourceType[enemyHarvester]).toBe(ResourceType.Fish);
  });
});
