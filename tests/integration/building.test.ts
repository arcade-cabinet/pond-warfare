/**
 * Building Integration Tests
 *
 * Tests building placement, construction progress, and the canonical
 * Lodge-driven manual roster flow. Armory still exists as a Lodge wing,
 * but it is no longer the player-facing trainer.
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
import { getPlayerArmory, getPlayerEntities, getPlayerLodge } from '../helpers/ecs-queries';

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

  it('completed lodge can train Mudpaws', () => {
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

  it('completed lodge can train Medics', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 100;
    Health.current[lodge] = Health.max[lodge];

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Healer]);

    trainingSystem(world);

    const medics = getPlayerEntities(world, EntityKind.Healer);
    expect(medics.length).toBe(1);
  });

  it('training queue processes multiple manual units sequentially', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 100;
    Health.current[lodge] = Health.max[lodge];
    world.resources.rocks = 30;

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Healer, EntityKind.Sapper]);

    trainingSystem(world);
    const medics = getPlayerEntities(world, EntityKind.Healer);
    expect(medics.length).toBe(1);

    expect(TrainingQueue.count[lodge]).toBe(1);
    TrainingQueue.timer[lodge] = 1;
    trainingSystem(world);

    const sappers = getPlayerEntities(world, EntityKind.Sapper);
    expect(sappers.length).toBe(1);
  });

  it('incomplete building cannot train', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 50;
    Health.current[lodge] = Math.floor(Health.max[lodge] * 0.5);

    addComponent(world.ecs, lodge, TrainingQueue);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;
    trainingQueueSlots.set(lodge, [EntityKind.Healer]);

    trainingSystem(world);

    const medics = getPlayerEntities(world, EntityKind.Healer);
    expect(medics.length).toBe(0);
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

  it('lodge is detected by query helper', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 400, 400, Faction.Player);
    Building.progress[lodge] = 100;

    expect(getPlayerLodge(world)).toBe(lodge);
  });

  it('armory wing is still detectable by the legacy helper', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 400, 400, Faction.Player);
    Building.progress[armory] = 100;

    expect(getPlayerArmory(world)).toBe(armory);
    expect(getPlayerArmory(world, false)).toBe(armory);
  });
});
