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
  trainingQueueSlots,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { cancelTrain } from '@/input/selection';
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
  });

  it('removes item from queue at the given index', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory);
    trainingQueueSlots.set(armory, [EntityKind.Brawler, EntityKind.Sniper]);
    TrainingQueue.count[armory] = 2;
    TrainingQueue.timer[armory] = TRAIN_TIMER;

    cancelTrain(world, armory, 1);

    const slots = trainingQueueSlots.get(armory) ?? [];
    expect(slots.length).toBe(1);
    expect(slots[0]).toBe(EntityKind.Brawler);
    expect(TrainingQueue.count[armory]).toBe(1);
  });

  it('refunds clam and twig costs', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory);
    const brawlerDef = ENTITY_DEFS[EntityKind.Brawler];
    const fishCost = brawlerDef.fishCost ?? 0;
    const logCost = brawlerDef.logCost ?? 0;

    world.resources.fish = 100;
    world.resources.logs = 50;

    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = TRAIN_TIMER;

    cancelTrain(world, armory, 0);

    expect(world.resources.fish).toBe(100 + fishCost);
    expect(world.resources.logs).toBe(50 + logCost);
  });

  it('resets timer when cancelling the active (index 0) item with remaining queue', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory);
    trainingQueueSlots.set(armory, [EntityKind.Brawler, EntityKind.Sniper]);
    TrainingQueue.count[armory] = 2;
    TrainingQueue.timer[armory] = 50; // Partially trained

    cancelTrain(world, armory, 0);

    expect(TrainingQueue.timer[armory]).toBe(TRAIN_TIMER);
    expect(TrainingQueue.count[armory]).toBe(1);
    const slots = trainingQueueSlots.get(armory) ?? [];
    expect(slots[0]).toBe(EntityKind.Sniper);
  });

  it('zeroes timer when cancelling the only item in queue', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory);
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = 80;

    cancelTrain(world, armory, 0);

    expect(TrainingQueue.timer[armory]).toBe(0);
    expect(TrainingQueue.count[armory]).toBe(0);
  });

  it('does nothing for out-of-range index', () => {
    const armory = createTrainingBuilding(world, EntityKind.Armory);
    trainingQueueSlots.set(armory, [EntityKind.Brawler]);
    TrainingQueue.count[armory] = 1;
    TrainingQueue.timer[armory] = TRAIN_TIMER;

    const clamsBefore = world.resources.fish;

    cancelTrain(world, armory, 5);

    expect(TrainingQueue.count[armory]).toBe(1);
    expect(world.resources.fish).toBe(clamsBefore);
  });
});
