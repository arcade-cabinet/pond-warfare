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
import { MEDIC_KIND, MUDPAW_KIND } from '@/game/live-unit-kinds';
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
    world.resources.fish = 500;
    world.resources.logs = 500;
    world.resources.rocks = 500;
    world.resources.food = 0;
    world.resources.maxFood = 20;
    trainingQueueSlots.clear();
  });

  it('deducts resources and enqueues unit', () => {
    const lodge = createPlayerBuilding(world, EntityKind.Lodge);
    const def = ENTITY_DEFS[MUDPAW_KIND];

    train(
      world,
      lodge,
      MUDPAW_KIND,
      def.fishCost ?? 0,
      def.logCost ?? 0,
      def.foodCost ?? 1,
    );

    expect(world.resources.fish).toBe(500 - (def.fishCost ?? 0));
    expect(TrainingQueue.count[lodge]).toBe(1);
    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots[0]).toBe(MUDPAW_KIND);
  });

  it('does not enqueue when resources insufficient', () => {
    const lodge = createPlayerBuilding(world, EntityKind.Lodge);
    world.resources.fish = 0;
    world.resources.logs = 0;
    world.resources.rocks = 0;

    const def = ENTITY_DEFS[EntityKind.Sapper];
    train(
      world,
      lodge,
      EntityKind.Sapper,
      def.fishCost ?? 0,
      def.logCost ?? 0,
      def.foodCost ?? 1,
      def.rockCost ?? 0,
    );

    expect(TrainingQueue.count[lodge]).toBe(0);
    expect(world.resources.fish).toBe(0);
  });

  it('adds to TrainingQueue with correct timer on first enqueue', () => {
    const lodge = createPlayerBuilding(world, EntityKind.Lodge);
    const def = ENTITY_DEFS[MEDIC_KIND];

    train(
      world,
      lodge,
      MEDIC_KIND,
      def.fishCost ?? 0,
      def.logCost ?? 0,
      def.foodCost ?? 1,
    );

    expect(TrainingQueue.count[lodge]).toBe(1);
    expect(TrainingQueue.timer[lodge]).toBeGreaterThan(0);
  });

  it('deducts rocks for stage-five manual siege units', () => {
    const lodge = createPlayerBuilding(world, EntityKind.Lodge);
    const def = ENTITY_DEFS[EntityKind.Sapper];

    train(
      world,
      lodge,
      EntityKind.Sapper,
      def.fishCost ?? 0,
      def.logCost ?? 0,
      def.foodCost ?? 1,
      def.rockCost ?? 0,
    );

    expect(world.resources.rocks).toBe(500 - (def.rockCost ?? 0));
    expect(TrainingQueue.count[lodge]).toBe(1);
  });
});
