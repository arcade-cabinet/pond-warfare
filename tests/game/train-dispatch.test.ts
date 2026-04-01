/**
 * Train Dispatch Tests
 *
 * Validates that the train() function correctly deducts resources,
 * enqueues units in TrainingQueue, and rejects when unaffordable.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  Building,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { train } from '@/input/selection';
import { EntityKind, Faction } from '@/types';

function createPlayerBuilding(world: GameWorld, _kind: EntityKind): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, TrainingQueue);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = 200;
  Position.y[eid] = 200;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  Building.progress[eid] = 100;
  TrainingQueue.count[eid] = 0;
  TrainingQueue.timer[eid] = 0;
  trainingQueueSlots.set(eid, []);

  return eid;
}

describe('train dispatch', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Give player enough resources
    world.resources.clams = 500;
    world.resources.twigs = 500;
    world.resources.food = 0;
    world.resources.maxFood = 20;
    trainingQueueSlots.clear();
  });

  it('deducts resources and enqueues unit', () => {
    const lodge = createPlayerBuilding(world, EntityKind.Lodge);
    const def = ENTITY_DEFS[EntityKind.Gatherer];

    train(
      world,
      lodge,
      EntityKind.Gatherer,
      def.clamCost ?? 0,
      def.twigCost ?? 0,
      def.foodCost ?? 1,
    );

    expect(world.resources.clams).toBe(500 - (def.clamCost ?? 0));
    expect(TrainingQueue.count[lodge]).toBe(1);
    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots[0]).toBe(EntityKind.Gatherer);
  });

  it('does not enqueue when resources insufficient', () => {
    const lodge = createPlayerBuilding(world, EntityKind.Lodge);
    world.resources.clams = 0;
    world.resources.twigs = 0;

    train(world, lodge, EntityKind.Brawler, 100, 50, 1);

    expect(TrainingQueue.count[lodge]).toBe(0);
    expect(world.resources.clams).toBe(0);
  });

  it('adds to TrainingQueue with correct timer on first enqueue', () => {
    const armory = createPlayerBuilding(world, EntityKind.Armory);

    train(world, armory, EntityKind.Brawler, 100, 50, 1);

    expect(TrainingQueue.count[armory]).toBe(1);
    expect(TrainingQueue.timer[armory]).toBeGreaterThan(0);
  });
});
