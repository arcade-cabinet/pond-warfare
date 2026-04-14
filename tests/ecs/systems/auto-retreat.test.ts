/**
 * Auto-Retreat System Tests
 *
 * Validates that units below 25% HP auto-retreat to nearest building.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import { autoRetreatSystem } from '@/ecs/systems/auto-retreat';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';

function createUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind = SAPPER_KIND,
  hp: number = 60,
  maxHp: number = 60,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;

  return eid;
}

function createBuilding(world: GameWorld, x: number, y: number, faction: Faction): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 1000;
  Health.max[eid] = 1000;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = EntityKind.Lodge;

  return eid;
}

describe('autoRetreatSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.autoRetreatEnabled = true;
    world.frameCount = 0;
  });

  it('should trigger retreat for unit below 25% HP', () => {
    const lodge = createBuilding(world, 400, 400, Faction.Player);
    // Unit at 10/60 HP = 16.7% (below 25%)
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 10, 60);

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Retreat);
    expect(UnitStateMachine.targetEntity[unit]).toBe(lodge);
  });

  it('should NOT trigger retreat for unit above 25% HP', () => {
    createBuilding(world, 400, 400, Faction.Player);
    // Unit at 20/60 HP = 33.3% (above 25%)
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 20, 60);

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Idle);
  });

  it('should retreat to nearest building', () => {
    const _farLodge = createBuilding(world, 800, 800, Faction.Player);
    const nearBurrow = createBuilding(world, 200, 200, Faction.Player);
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 5, 60);

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Retreat);
    expect(UnitStateMachine.targetEntity[unit]).toBe(nearBurrow);
  });

  it('should NOT retreat when autoRetreatEnabled is false', () => {
    world.autoRetreatEnabled = false;
    createBuilding(world, 400, 400, Faction.Player);
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 5, 60);

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Idle);
  });

  it('should NOT retreat enemy units', () => {
    createBuilding(world, 400, 400, Faction.Player);
    const enemy = createUnit(world, 100, 100, Faction.Enemy, EntityKind.Gator, 5, 60);

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[enemy]).toBe(UnitState.Idle);
  });

  it('should NOT trigger retreat from gathering state', () => {
    createBuilding(world, 400, 400, Faction.Player);
    const unit = createUnit(world, 100, 100, Faction.Player, MUDPAW_KIND, 5, 30);
    UnitStateMachine.state[unit] = UnitState.Gathering;

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Gathering);
  });

  it('should NOT double-retreat a unit already retreating', () => {
    const lodge = createBuilding(world, 400, 400, Faction.Player);
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 5, 60);
    UnitStateMachine.state[unit] = UnitState.Retreat;
    UnitStateMachine.targetEntity[unit] = lodge;

    // Should not change the retreat target
    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Retreat);
    expect(UnitStateMachine.targetEntity[unit]).toBe(lodge);
  });

  it('should trigger retreat from attacking state', () => {
    const _lodge = createBuilding(world, 400, 400, Faction.Player);
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 5, 60);
    UnitStateMachine.state[unit] = UnitState.Attacking;

    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Retreat);
  });

  it('should produce floating text indicator', () => {
    createBuilding(world, 400, 400, Faction.Player);
    createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 5, 60);

    autoRetreatSystem(world);

    expect(world.floatingTexts.length).toBeGreaterThan(0);
    expect(world.floatingTexts.some((t) => t.text === 'RETREAT!')).toBe(true);
  });

  it('should only run on frame % 30 === 0', () => {
    createBuilding(world, 400, 400, Faction.Player);
    const unit = createUnit(world, 100, 100, Faction.Player, SAPPER_KIND, 5, 60);

    world.frameCount = 15; // Not divisible by 30
    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Idle);

    world.frameCount = 30; // Divisible by 30
    autoRetreatSystem(world);

    expect(UnitStateMachine.state[unit]).toBe(UnitState.Retreat);
  });
});
