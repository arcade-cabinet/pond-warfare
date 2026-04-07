/**
 * Progression Integration Tests
 *
 * Tests the canonical baseline loop: Lodge-led manual training,
 * Mudpaw economy, building response, and later manual specialists.
 */

import { addComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Combat,
  Health,
  Resource,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { buildingSystem } from '@/ecs/systems/building';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import {
  getPlayerArmyUnits,
  getPlayerEntities,
  getPlayerLodge,
} from '../helpers/ecs-queries';

describe('Progression Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 0;
  });

  it('starts with correct resources', () => {
    expect(world.resources.fish).toBe(300);
    expect(world.resources.logs).toBe(150);
    expect(world.resources.rocks).toBe(0);
  });

  it('lodge provides starting food cap', () => {
    const foodProvided = ENTITY_DEFS[EntityKind.Lodge].foodProvided ?? 0;
    expect(foodProvided).toBe(8);
  });

  it('player can field 4 Mudpaws from the Lodge', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 4;
    trainingQueueSlots.set(lodge, [
      EntityKind.Gatherer,
      EntityKind.Gatherer,
      EntityKind.Gatherer,
      EntityKind.Gatherer,
    ]);

    for (let i = 0; i < 4; i++) {
      TrainingQueue.timer[lodge] = 1;
      trainingSystem(world);
    }

    const mudpaws = getPlayerEntities(world, EntityKind.Gatherer);
    expect(mudpaws.length).toBe(4);
    expect(getPlayerLodge(world)).toBe(lodge);
  });

  it('lodge trains additional Mudpaws', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    for (let i = 0; i < 4; i++) {
      spawnEntity(world, EntityKind.Gatherer, 480 + i * 20, 520, Faction.Player);
    }

    // Queue 2 gatherers
    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Gatherer, EntityKind.Gatherer]);

    trainingSystem(world);
    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    const gatherers = getPlayerEntities(world, EntityKind.Gatherer);
    expect(gatherers.length).toBe(6);
  });

  it('Mudpaws collect resources over time', () => {
    spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 510, 510, Faction.Neutral);
    Resource.amount[resource] = 4000;
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 510, 510, Faction.Player);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = resource;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    gatheringSystem(world);

    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.ReturnMove);
    expect(Resource.amount[resource]).toBeLessThan(4000);
  });

  it('building construction reaches completion', () => {
    const burrow = spawnEntity(world, EntityKind.Burrow, 400, 400, Faction.Player);
    Building.progress[burrow] = 0;
    Health.current[burrow] = 0;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 400, 400, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Building;
    UnitStateMachine.targetEntity[gatherer] = burrow;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    const maxHp = Health.max[burrow];
    const cycles = Math.ceil(maxHp / 10);
    for (let i = 0; i < cycles; i++) {
      UnitStateMachine.gatherTimer[gatherer] = 1;
      buildingSystem(world);
      world.frameCount++;
    }

    expect(Building.progress[burrow]).toBe(100);
  });

  it('completed Lodge fields manual specialists instead of using Armory production', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 100;
    Health.current[lodge] = Health.max[lodge];
    world.resources.rocks = 40;

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Healer, EntityKind.Sapper]);
    trainingSystem(world);

    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    const fieldUnits = getPlayerArmyUnits(world);
    expect(fieldUnits.length).toBe(2);
    expect(getPlayerEntities(world, EntityKind.Healer)).toHaveLength(1);
    expect(getPlayerEntities(world, EntityKind.Sapper)).toHaveLength(1);
  });

  it('tech research applies effects to new Mudpaws', () => {
    world.tech.sharpSticks = true;
    world.tech.swiftPaws = true;

    const baseDmg = ENTITY_DEFS[EntityKind.Gatherer].damage;
    const baseSpd = ENTITY_DEFS[EntityKind.Gatherer].speed;

    const mudpaw = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);

    expect(Combat.damage[mudpaw]).toBe(baseDmg + 2);
    expect(Velocity.speed[mudpaw]).toBeCloseTo(baseSpd * 1.15);
  });

  it('peace timer prevents enemy evolution', () => {
    expect(world.peaceTimer).toBe(10800);
    expect(world.enemyEvolution.tier).toBe(0);
  });

  it('full early-game progression: lodge -> Mudpaws -> economy -> Burrow -> Medic', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    const mudpaws: number[] = [];

    const resources: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = spawnEntity(world, EntityKind.Clambed, 400 + i * 50, 400, Faction.Neutral);
      Resource.amount[r] = 8000;
      resources.push(r);
    }

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 4;
    trainingQueueSlots.set(lodge, [
      EntityKind.Gatherer,
      EntityKind.Gatherer,
      EntityKind.Gatherer,
      EntityKind.Gatherer,
    ]);

    for (let i = 0; i < 4; i++) {
      TrainingQueue.timer[lodge] = 1;
      trainingSystem(world);
    }

    mudpaws.push(...getPlayerEntities(world, EntityKind.Gatherer));
    expect(mudpaws).toHaveLength(4);

    const burrow = spawnEntity(world, EntityKind.Burrow, 600, 500, Faction.Player);
    Building.progress[burrow] = 0;
    Health.current[burrow] = 0;

    const builder = mudpaws[0];
    UnitStateMachine.state[builder] = UnitState.Building;
    UnitStateMachine.targetEntity[builder] = burrow;
    UnitStateMachine.gatherTimer[builder] = 1;

    const burrowMaxHp = Health.max[burrow];
    const buildCycles = Math.ceil(burrowMaxHp / 10);
    for (let i = 0; i < buildCycles; i++) {
      UnitStateMachine.gatherTimer[builder] = 1;
      buildingSystem(world);
      world.frameCount++;
    }

    expect(Building.progress[burrow]).toBe(100);
    world.tech.sharpSticks = true;

    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Healer]);
    trainingSystem(world);

    const fieldUnits = getPlayerArmyUnits(world);
    expect(fieldUnits.length).toBeGreaterThanOrEqual(5);
    expect(getPlayerEntities(world, EntityKind.Healer)).toHaveLength(1);

    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Gatherer]);
    trainingSystem(world);

    const baseMudpawDmg = ENTITY_DEFS[EntityKind.Gatherer].damage;
    const trainedMudpaws = getPlayerEntities(world, EntityKind.Gatherer);
    const latestMudpaw = trainedMudpaws[trainedMudpaws.length - 1];
    expect(Combat.damage[latestMudpaw]).toBe(baseMudpawDmg + 2);
  });
});
