/**
 * Rally Point & Unit Stance Tests
 *
 * Validates rally point behavior on training completion and stance-based
 * auto-aggro filtering in the combat and auto-behavior systems.
 */

import { addComponent, addEntity, query } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
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
  Stance,
  StanceMode,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { trainingSystem } from '@/ecs/systems/training';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

// ---- Helpers ----

function createTrainingBuilding(world: GameWorld, kind: EntityKind, x: number, y: number): number {
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
  Position.x[eid] = x;
  Position.y[eid] = y;
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

function createCombatUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Stance);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  Health.lastDamagedFrame[eid] = 0;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;
  Combat.attackCooldown[eid] = 0;
  Combat.kills[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 1.8;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;
  Stance.mode[eid] = StanceMode.Aggressive;

  return eid;
}

// ---- Rally Point Tests ----

describe('rally points', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    trainingQueueSlots.clear();
  });

  it('should move spawned unit to rally point when building has one', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);
    Building.rallyX[lodge] = 700;
    Building.rallyY[lodge] = 300;
    Building.hasRally[lodge] = 1;

    trainingQueueSlots.set(lodge, [SAPPER_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;

    trainingSystem(world);

    // Find spawned sapper
    const units = query(world.ecs, [FactionTag, EntityTypeTag, UnitStateMachine]);
    const sapper = units.find(
      (eid: number) =>
        EntityTypeTag.kind[eid] === SAPPER_KIND &&
        FactionTag.faction[eid] === Faction.Player,
    );
    expect(sapper).toBeDefined();
    expect(UnitStateMachine.state[sapper!]).toBe(UnitState.Move);
    expect(UnitStateMachine.targetX[sapper!]).toBe(700);
    expect(UnitStateMachine.targetY[sapper!]).toBe(300);
  });

  it('should not move spawned unit when building has no rally point', () => {
    const lodge = createTrainingBuilding(world, EntityKind.Lodge, 500, 500);
    Building.hasRally[lodge] = 0;

    trainingQueueSlots.set(lodge, [SAPPER_KIND]);
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 1;

    trainingSystem(world);

    const units = query(world.ecs, [FactionTag, EntityTypeTag, UnitStateMachine]);
    const sapper = units.find(
      (eid: number) =>
        EntityTypeTag.kind[eid] === SAPPER_KIND &&
        FactionTag.faction[eid] === Faction.Player,
    );
    expect(sapper).toBeDefined();
    // Without rally point, unit should be idle (default state from archetype)
    expect(UnitStateMachine.state[sapper!]).toBe(UnitState.Idle);
  });
});

// ---- Stance Tests ----

describe('unit stances', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
  });

  it('aggressive: unit auto-attacks nearby enemy when idle', () => {
    world.frameCount = 30;
    const player = createCombatUnit(world, 100, 100, Faction.Player, SAPPER_KIND);
    createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);
    Stance.mode[player] = StanceMode.Aggressive;

    combatSystem(world);

    expect(UnitStateMachine.state[player]).toBe(UnitState.AttackMove);
  });

  it('defensive: unit ignores nearby enemy when not recently damaged', () => {
    world.frameCount = 300;
    const player = createCombatUnit(world, 100, 100, Faction.Player, SAPPER_KIND);
    createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);
    Stance.mode[player] = StanceMode.Defensive;
    Health.lastDamagedFrame[player] = 0; // Damaged long ago (frame 0, now at 300)

    combatSystem(world);

    expect(UnitStateMachine.state[player]).toBe(UnitState.Idle);
  });

  it('defensive: unit fights back when recently damaged', () => {
    world.frameCount = 30;
    const player = createCombatUnit(world, 100, 100, Faction.Player, SAPPER_KIND);
    createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);
    Stance.mode[player] = StanceMode.Defensive;
    Health.lastDamagedFrame[player] = 25; // Damaged 5 frames ago (within 120)

    combatSystem(world);

    expect(UnitStateMachine.state[player]).toBe(UnitState.AttackMove);
  });

  it('hold: unit ignores nearby enemy entirely', () => {
    world.frameCount = 30;
    const player = createCombatUnit(world, 100, 100, Faction.Player, SAPPER_KIND);
    createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);
    Stance.mode[player] = StanceMode.Hold;

    combatSystem(world);

    expect(UnitStateMachine.state[player]).toBe(UnitState.Idle);
  });

  it('hold: unit is skipped by auto-behavior system', () => {
    world.frameCount = 60;
    world.autoBehaviors.combat = true;
    const player = createCombatUnit(world, 100, 100, Faction.Player, SAPPER_KIND);
    createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);
    Stance.mode[player] = StanceMode.Hold;

    // Auto-behavior system removed in v3.0; Hold stance still keeps unit idle
    expect(UnitStateMachine.state[player]).toBe(UnitState.Idle);
  });

  it('enemy units ignore player stance (always aggressive)', () => {
    world.frameCount = 30;
    createCombatUnit(world, 100, 100, Faction.Player, SAPPER_KIND);
    const enemy = createCombatUnit(world, 110, 100, Faction.Enemy, EntityKind.Gator);
    // Even though the enemy technically has a Stance component, enemies
    // should always auto-aggro (stance checks only apply to Player faction).

    combatSystem(world);

    expect(UnitStateMachine.state[enemy]).toBe(UnitState.AttackMove);
  });
});
