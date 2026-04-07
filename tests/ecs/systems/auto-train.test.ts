/**
 * Auto-Train System Tests
 *
 * Validates that auto-training queues canonical manual units from the Lodge
 * when auto-behaviors are enabled and respects queue limits.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import {
  Building,
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

/** Create a completed player building with training queue support. */
function createPlayerBuilding(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, TrainingQueue);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = ENTITY_DEFS[kind].hp;
  Health.max[eid] = ENTITY_DEFS[kind].hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;
  TrainingQueue.count[eid] = 0;
  TrainingQueue.timer[eid] = 0;
  trainingQueueSlots.set(eid, []);

  return eid;
}

/** Create a player unit (non-building). */
function createPlayerUnit(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Combat);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = UnitState.Idle;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

describe('autoTrainSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Set frameCount to a multiple of 120 so the system actually runs
    world.frameCount = 120;
    // Give plenty of resources
    world.resources.fish = 10000;
    world.resources.logs = 10000;
    world.resources.food = 0;
    world.resources.maxFood = 20;
    // Clear any leftover training queue slots from previous tests
    trainingQueueSlots.clear();
  });

  it('should do nothing when auto-behaviors are disabled', () => {
    world.autoBehaviors.combat = false;

    const lodge = createPlayerBuilding(world, EntityKind.Lodge, 500, 500);

    autoTrainSystem(world);

    expect(TrainingQueue.count[lodge]).toBe(0);
  });

  it('should queue Mudpaw at Lodge when frontline pressure needs more manual bodies', () => {
    world.autoBehaviors.combat = true;

    const lodge = createPlayerBuilding(world, EntityKind.Lodge, 500, 500);

    // One Mudpaw plus nearby enemies should trigger another Mudpaw train.
    createPlayerUnit(world, MUDPAW_KIND, 100, 100);
    const enemy = createPlayerUnit(world, EntityKind.Gator, 300, 100);
    FactionTag.faction[enemy] = Faction.Enemy;

    autoTrainSystem(world);

    expect(TrainingQueue.count[lodge]).toBe(1);
    const slots = trainingQueueSlots.get(lodge) ?? [];
    expect(slots[0]).toBe(MUDPAW_KIND);
  });

  it('should not overfill queue (max 8)', () => {
    world.autoBehaviors.combat = true;

    const lodge = createPlayerBuilding(world, EntityKind.Lodge, 500, 500);

    // Manually fill the queue to 8
    const fullSlots = Array(8).fill(MUDPAW_KIND);
    trainingQueueSlots.set(lodge, fullSlots);
    TrainingQueue.count[lodge] = 8;

    createPlayerUnit(world, MUDPAW_KIND, 100, 100);
    const enemy = createPlayerUnit(world, EntityKind.Gator, 300, 100);
    FactionTag.faction[enemy] = Faction.Enemy;

    autoTrainSystem(world);

    // Queue should still be at 8 (not exceeded)
    expect(TrainingQueue.count[lodge]).toBe(8);
  });
});
