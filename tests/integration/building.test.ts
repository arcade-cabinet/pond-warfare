/**
 * Building Integration Tests
 *
 * Tests building placement, construction progress, training queue at
 * Armory/Lodge, building HP, and destruction. Operates directly on
 * ECS systems — no UI, no DOM, no fake clicks.
 */

import { addComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Health,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import { buildingSystem } from '@/ecs/systems/building';
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { getPlayerArmory, getPlayerEntities } from '../helpers/ecs-queries';

describe('Building Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
  });

  it('gatherer constructs a building from 0 to completion', () => {
    const burrow = spawnEntity(world, EntityKind.Burrow, 300, 300, Faction.Player);
    Building.progress[burrow] = 0;
    Health.current[burrow] = 0;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 300, 300, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Building;
    UnitStateMachine.targetEntity[gatherer] = burrow;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    // Each timer cycle adds 10 HP. Keep ticking until done.
    const maxHp = Health.max[burrow];
    const cycles = Math.ceil(maxHp / 10);

    for (let i = 0; i < cycles; i++) {
      UnitStateMachine.gatherTimer[gatherer] = 1;
      buildingSystem(world);
      world.frameCount++;
    }

    expect(Building.progress[burrow]).toBe(100);
    expect(Health.current[burrow]).toBe(maxHp);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('building progress increments correctly', () => {
    const burrow = spawnEntity(world, EntityKind.Burrow, 300, 300, Faction.Player);
    Building.progress[burrow] = 0;
    Health.current[burrow] = 0;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 300, 300, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Building;
    UnitStateMachine.targetEntity[gatherer] = burrow;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    buildingSystem(world);

    expect(Health.current[burrow]).toBe(10);
    const expectedProgress = (10 / Health.max[burrow]) * 100;
    expect(Building.progress[burrow]).toBeCloseTo(expectedProgress, 1);
  });

  it('completed lodge can train gatherers', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Gatherer]);

    world.resources.food = 0;
    world.resources.maxFood = 8;

    trainingSystem(world);

    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots.length).toBe(0);

    const gatherers = getPlayerEntities(world, EntityKind.Gatherer);
    expect(gatherers.length).toBe(1);
  });

  it('completed armory can train brawlers', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;
    Health.current[armory] = Health.max[armory];

    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);

    trainingSystem(world);

    const brawlers = getPlayerEntities(world, EntityKind.Brawler);
    expect(brawlers.length).toBe(1);
  });

  it('training queue processes multiple units sequentially', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;
    Health.current[armory] = Health.max[armory];

    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 2;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Brawler, EntityKind.Sniper]);

    // First unit trains
    trainingSystem(world);
    const brawlers = getPlayerEntities(world, EntityKind.Brawler);
    expect(brawlers.length).toBe(1);

    // Second unit needs timer to count down
    expect(TrainingQueue.count[armory]).toBe(1);
    TrainingQueue.timer[armory] = 1;
    trainingSystem(world);

    const snipers = getPlayerEntities(world, EntityKind.Sniper);
    expect(snipers.length).toBe(1);
  });

  it('incomplete building cannot train', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 50;
    Health.current[armory] = Math.floor(Health.max[armory] * 0.5);

    addComponent(world.ecs, armory, TrainingQueue);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 1;
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);

    trainingSystem(world);

    const brawlers = getPlayerEntities(world, EntityKind.Brawler);
    expect(brawlers.length).toBe(0);
  });

  it('building with zero HP stops being constructable', () => {
    const burrow = spawnEntity(world, EntityKind.Burrow, 300, 300, Faction.Player);
    Health.current[burrow] = 0;
    Health.max[burrow] = 0;

    const gatherer = spawnEntity(world, EntityKind.Gatherer, 300, 300, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.Building;
    UnitStateMachine.targetEntity[gatherer] = burrow;
    UnitStateMachine.gatherTimer[gatherer] = 1;

    buildingSystem(world);

    // Builder goes idle because target is at max HP (0 == 0)
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.Idle);
  });

  it('sturdy mud tech adds HP to buildings', () => {
    world.tech.sturdyMud = true;
    const baseHp = ENTITY_DEFS[EntityKind.Burrow].hp;

    const burrow = spawnEntity(world, EntityKind.Burrow, 300, 300, Faction.Player);

    expect(Health.max[burrow]).toBe(baseHp + 300);
  });

  it('armory is detected by query helper', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;

    expect(getPlayerArmory(world)).toBe(armory);
  });

  it('incomplete armory excluded by default query', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 50;

    expect(getPlayerArmory(world)).toBeNull();
    expect(getPlayerArmory(world, false)).toBe(armory);
  });
});
