/**
 * Commander Aura Tests
 *
 * Validates the dynamic Ironpaw HP buff: granted when in range, removed when out of range.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Carrying, Combat, EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { commanderAura } from '@/ecs/systems/combat/commander-aura';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

function spawnUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind,
  hp = 100,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = hp;
  Combat.damage[eid] = 5;
  Combat.attackRange[eid] = 30;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

describe('commanderAura — Ironpaw HP buff', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
    // Configure Ironpaw-like modifiers: 20% unit HP bonus
    world.commanderModifiers = {
      ...world.commanderModifiers,
      auraUnitHpBonus: 0.2,
      auraDamageBonus: 0,
      auraSpeedBonus: 0,
      auraHpBonus: 0,
      auraEnemyDamageReduction: 0,
    };
  });

  function runAura(): void {
    // Aura runs on frame multiples of 60
    world.frameCount = 60;
    commanderAura(world);
  }

  it('should buff unit HP when entering aura range', () => {
    const _cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const unit = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 100);

    runAura();

    // 100 * 0.2 = 20 bonus
    expect(Health.max[unit]).toBe(120);
    expect(Health.current[unit]).toBe(120);
    expect(world.commanderUnitHpBuff.has(unit)).toBe(true);
  });

  it('should remove HP buff when unit leaves aura range', () => {
    const _cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const unit = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 100);

    // First tick: unit enters aura
    runAura();
    expect(Health.max[unit]).toBe(120);

    // Move unit out of range (>150 away)
    Position.x[unit] = 400;
    world.frameCount = 120;
    commanderAura(world);

    // Buff removed: back to base HP
    expect(Health.max[unit]).toBe(100);
    expect(Health.current[unit]).toBe(100);
    expect(world.commanderUnitHpBuff.has(unit)).toBe(false);
  });

  it('should not stack buff on consecutive ticks in range', () => {
    const _cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const unit = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 100);

    // Tick 1
    runAura();
    expect(Health.max[unit]).toBe(120);

    // Tick 2 — still in range, should NOT stack
    world.frameCount = 120;
    commanderAura(world);
    expect(Health.max[unit]).toBe(120);
  });

  it('should re-apply buff when unit re-enters aura', () => {
    const _cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const unit = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 100);

    // Enter range
    runAura();
    expect(Health.max[unit]).toBe(120);

    // Leave range
    Position.x[unit] = 400;
    world.frameCount = 120;
    commanderAura(world);
    expect(Health.max[unit]).toBe(100);

    // Re-enter range
    Position.x[unit] = 120;
    world.frameCount = 180;
    commanderAura(world);
    expect(Health.max[unit]).toBe(120);
  });

  it('should remove buff from all units when commander dies', () => {
    const cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const unit1 = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Brawler, 100);
    const unit2 = spawnUnit(world, 130, 100, Faction.Player, EntityKind.Brawler, 80);

    runAura();
    expect(Health.max[unit1]).toBe(120);
    expect(Health.max[unit2]).toBe(96); // 80 * 1.2

    // Commander dies
    Health.current[cmd] = 0;
    // On non-refresh frame, check commander death
    world.frameCount = 61;
    commanderAura(world);

    expect(Health.max[unit1]).toBe(100);
    expect(Health.max[unit2]).toBe(80);
    expect(world.commanderUnitHpBuff.size).toBe(0);
  });

  it('should buff newly spawned units that enter aura', () => {
    const _cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);

    // First tick with no units nearby
    runAura();

    // Spawn a new unit in range
    const unit = spawnUnit(world, 110, 100, Faction.Player, EntityKind.Brawler, 50);
    world.frameCount = 120;
    commanderAura(world);

    // 50 * 0.2 = 10 bonus
    expect(Health.max[unit]).toBe(60);
    expect(Health.current[unit]).toBe(60);
  });
});

describe('commanderAura — Sage gather aura', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
    world.commanderModifiers = {
      ...world.commanderModifiers,
      auraGatherBonus: 0.25,
      auraDamageBonus: 0,
      auraSpeedBonus: 0,
      auraHpBonus: 0,
      auraUnitHpBonus: 0,
      auraEnemyDamageReduction: 0,
    };
  });

  it('marks nearby worker units for gather-rate aura', () => {
    const _cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const worker = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Gatherer, 30);

    world.frameCount = 60;
    commanderAura(world);

    expect(world.commanderGatherBuff.has(worker)).toBe(true);
  });

  it('clears gather aura when the commander dies', () => {
    const cmd = spawnUnit(world, 100, 100, Faction.Player, EntityKind.Commander, 200);
    const worker = spawnUnit(world, 120, 100, Faction.Player, EntityKind.Gatherer, 30);

    world.frameCount = 60;
    commanderAura(world);
    expect(world.commanderGatherBuff.has(worker)).toBe(true);

    Health.current[cmd] = 0;
    world.frameCount = 61;
    commanderAura(world);

    expect(world.commanderGatherBuff.size).toBe(0);
  });
});
