/**
 * Progression Integration Tests
 *
 * Tests full game progression: start with gatherers, build economy,
 * construct buildings, train army, research techs. Runs ECS systems
 * for multiple frames and verifies milestones. This is the "does the
 * game work end-to-end" test — honest about running ECS directly.
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
  getPlayerArmory,
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
    expect(world.resources.clams).toBe(300);
    expect(world.resources.twigs).toBe(150);
    expect(world.resources.pearls).toBe(0);
  });

  it('lodge provides starting food cap', () => {
    const foodProvided = ENTITY_DEFS[EntityKind.Lodge].foodProvided ?? 0;
    expect(foodProvided).toBe(8);
  });

  it('spawn 4 gatherers at game start', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    for (let i = 0; i < 4; i++) {
      spawnEntity(world, EntityKind.Gatherer, 480 + i * 20, 520, Faction.Player);
    }

    const gatherers = getPlayerEntities(world, EntityKind.Gatherer);
    expect(gatherers.length).toBe(4);
    expect(getPlayerLodge(world)).toBe(lodge);
  });

  it('lodge trains additional gatherers', () => {
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

  it('gatherers collect resources over time', () => {
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
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 0;
    Health.current[armory] = 0;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 400, 400, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Building;
    UnitStateMachine.targetEntity[gatherer] = armory;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    const maxHp = Health.max[armory];
    const cycles = Math.ceil(maxHp / 10);
    for (let i = 0; i < cycles; i++) {
      UnitStateMachine.gatherTimer[gatherer] = 1;
      buildingSystem(world);
      world.frameCount++;
    }

    expect(Building.progress[armory]).toBe(100);
    expect(getPlayerArmory(world)).toBe(armory);
  });

  it('completed armory trains combat units', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;
    Health.current[armory] = Health.max[armory];

    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    trainingSystem(world);

    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Sniper]);
    trainingSystem(world);

    const army = getPlayerArmyUnits(world);
    expect(army.length).toBe(2);
  });

  it('tech research applies effects to new units', () => {
    world.tech.sharpSticks = true;
    world.tech.swiftPaws = true;

    const baseDmg = ENTITY_DEFS[EntityKind.Brawler].damage;
    const baseSpd = ENTITY_DEFS[EntityKind.Brawler].speed;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);

    expect(Combat.damage[brawler]).toBe(baseDmg + 2);
    expect(Velocity.speed[brawler]).toBeCloseTo(baseSpd * 1.15);
  });

  it('peace timer prevents enemy evolution', () => {
    expect(world.peaceTimer).toBe(10800);
    expect(world.enemyEvolution.tier).toBe(0);
  });

  it('full early-game progression: gatherers -> economy -> armory -> army', () => {
    // 1. Set up: lodge + 4 gatherers + resources
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    const gatherers: number[] = [];
    for (let i = 0; i < 4; i++) {
      gatherers.push(spawnEntity(world, EntityKind.Gatherer, 490 + i * 10, 520, Faction.Player));
    }

    // Create resources nearby
    const resources: number[] = [];
    for (let i = 0; i < 3; i++) {
      const r = spawnEntity(world, EntityKind.Clambed, 400 + i * 50, 400, Faction.Neutral);
      Resource.amount[r] = 8000;
      resources.push(r);
    }

    expect(getPlayerEntities(world, EntityKind.Gatherer).length).toBe(4);

    // 2. Train 2 more gatherers from lodge
    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Gatherer, EntityKind.Gatherer]);

    trainingSystem(world);
    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    expect(getPlayerEntities(world, EntityKind.Gatherer).length).toBe(6);

    // 3. Build armory
    const armory = spawnEntity(world, EntityKind.Armory, 600, 500, Faction.Player);
    Building.progress[armory] = 0;
    Health.current[armory] = 0;

    const builder = gatherers[0];
    UnitStateMachine.state[builder] = UnitState.Building;
    UnitStateMachine.targetEntity[builder] = armory;
    UnitStateMachine.gatherTimer[builder] = 1;

    const armoryMaxHp = Health.max[armory];
    const buildCycles = Math.ceil(armoryMaxHp / 10);
    for (let i = 0; i < buildCycles; i++) {
      UnitStateMachine.gatherTimer[builder] = 1;
      buildingSystem(world);
      world.frameCount++;
    }

    expect(Building.progress[armory]).toBe(100);

    // 4. Research sharp sticks
    world.tech.sharpSticks = true;

    // 5. Train 2 combat units
    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 2;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Brawler, EntityKind.Sniper]);

    trainingSystem(world);
    TrainingQueue.timer[armory] = 1;
    trainingSystem(world);

    const army = getPlayerArmyUnits(world);
    expect(army.length).toBeGreaterThanOrEqual(2);

    // Verify sharp sticks applied
    const baseBrawlerDmg = ENTITY_DEFS[EntityKind.Brawler].damage;
    const brawlers = getPlayerEntities(world, EntityKind.Brawler);
    expect(brawlers.length).toBe(1);
    expect(Combat.damage[brawlers[0]]).toBe(baseBrawlerDmg + 2);
  });
});
