/**
 * cancelTrain Tests
 *
 * Validates that cancelling a training queue item removes it from the queue,
 * refunds resources, and resets the timer appropriately.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { TRAIN_TIMER } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueCostSlots,
  trainingQueueSlots,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { cancelTrain, train } from '@/input/selection/queries';
import { EntityKind, Faction } from '@/types';

function createTrainingBuilding(world: GameWorld, kind: EntityKind): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, TrainingQueue);
  addComponent(world.ecs, eid, Sprite);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = 500;
  Position.y[eid] = 500;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;
  Sprite.width[eid] = def.spriteSize * def.spriteScale;
  Sprite.height[eid] = def.spriteSize * def.spriteScale;
  TrainingQueue.count[eid] = 0;
  TrainingQueue.timer[eid] = 0;
  trainingQueueSlots.set(eid, []);

  return eid;
}

describe('cancelTrain', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    trainingQueueSlots.clear();
    trainingQueueCostSlots.clear();
  });

  it('removes item from queue at the given index', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge);
    trainingQueueSlots.set(lodge, [MUDPAW_KIND, SAPPER_KIND]);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = TRAIN_TIMER;

    cancelTrain(world, lodge, 1);

    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots.length).toBe(1);
    expect(slots[0]).toBe(MUDPAW_KIND);
    expect(TrainingQueue.count[lodge]).toBe(1);
  });

  it('refunds fish and rock costs', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge);
    const sapperDef = ENTITY_DEFS[SAPPER_KIND];
    const fishCost = sapperDef.fishCost ?? 0;
    const rockCost = sapperDef.rockCost ?? 0;

    world.resources.fish = 100;
    world.resources.rocks = 50;

    trainingQueueSlots.set(lodge, [SAPPER_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = TRAIN_TIMER;

    cancelTrain(world, lodge, 0);

    expect(world.resources.fish).toBe(100 + fishCost);
    expect(world.resources.rocks).toBe(50 + rockCost);
  });

  it('refunds the discounted queued cost when unit-cost reduction is active', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge);
    const sapperDef = ENTITY_DEFS[SAPPER_KIND];

    world.playerUnitCostMultiplier = 0.97;
    world.resources.fish = 100;
    world.resources.rocks = 50;
    world.resources.food = 0;
    world.resources.maxFood = 8;
    train(
      world,
      lodge,
      SAPPER_KIND,
      sapperDef.fishCost ?? 0,
      sapperDef.logCost ?? 0,
      sapperDef.foodCost ?? 1,
      sapperDef.rockCost ?? 0,
    );

    expect(world.resources.fish).toBe(76);
    expect(world.resources.rocks).toBe(35);

    cancelTrain(world, lodge, 0);

    expect(world.resources.fish).toBe(100);
    expect(world.resources.rocks).toBe(50);
  });

  it('resets timer when cancelling the active (index 0) item with remaining queue', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge);
    trainingQueueSlots.set(lodge, [MUDPAW_KIND, SAPPER_KIND]);
    TrainingQueue.count[lodge] = 2;
    TrainingQueue.timer[lodge] = 50; // Partially trained

    cancelTrain(world, lodge, 0);

    expect(TrainingQueue.timer[lodge]).toBe(TRAIN_TIMER);
    expect(TrainingQueue.count[lodge]).toBe(1);
    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots[0]).toBe(SAPPER_KIND);
  });

  it('zeroes timer when cancelling the only item in queue', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge);
    trainingQueueSlots.set(lodge, [MUDPAW_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 80;

    cancelTrain(world, lodge, 0);

    expect(TrainingQueue.timer[lodge]).toBe(0);
    expect(TrainingQueue.count[lodge]).toBe(0);
  });

  it('does nothing for out-of-range index', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge);
    trainingQueueSlots.set(lodge, [MUDPAW_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = TRAIN_TIMER;

    const clamsBefore = world.resources.fish;

    cancelTrain(world, lodge, 5);

    expect(TrainingQueue.count[lodge]).toBe(1);
    expect(world.resources.fish).toBe(clamsBefore);
  });
});
