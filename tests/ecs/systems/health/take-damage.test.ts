/**
 * Take Damage Subsystem Tests
 *
 * Validates damage application, Hardened Shells tech reduction,
 * overkill clamping, and damage to buildings.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health/take-damage';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations', () => ({
  triggerHitRecoil: vi.fn(),
  entityScales: new Map(),
}));
vi.mock('@/utils/particles', () => ({
  spawnParticle: vi.fn(),
}));
vi.mock('@/ui/game-events', () => ({
  pushGameEvent: vi.fn(),
}));

/** Create a basic unit with health, position, and faction. */
function spawnUnit(
  world: GameWorld,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  faction: Faction,
  kind: EntityKind = EntityKind.Brawler,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Combat);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  Health.flashTimer[eid] = 0;
  Health.lastDamagedFrame[eid] = 0;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Sprite.facingLeft[eid] = 0;
  Sprite.height[eid] = 32;
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;
  Velocity.speed[eid] = 2.0;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;

  return eid;
}

/** Create a building entity. */
function spawnBuilding(
  world: GameWorld,
  x: number,
  y: number,
  hp: number,
  maxHp: number,
  faction: Faction,
  kind: EntityKind = EntityKind.Lodge,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = maxHp;
  Health.flashTimer[eid] = 0;
  Health.lastDamagedFrame[eid] = 0;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Sprite.height[eid] = 48;

  return eid;
}

describe('takeDamage', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 100;
    // Disable spatial hash for simpler tests
    world.spatialHash = undefined as never;
  });

  describe('basic damage application', () => {
    it('reduces target HP by the damage amount', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 10, attacker);

      expect(Health.current[target]).toBe(40);
    });

    it('applies multiplier to damage', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 10, attacker, 1.5);

      // 10 * 1.5 = 15, rounded
      expect(Health.current[target]).toBe(35);
    });

    it('sets flash timer on hit', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 10, attacker);

      expect(Health.flashTimer[target]).toBe(8);
    });

    it('updates lastDamagedFrame', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 10, attacker);

      expect(Health.lastDamagedFrame[target]).toBe(world.frameCount);
    });
  });

  describe('zero and negative damage', () => {
    it('does nothing when amount is zero', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 0, attacker);

      expect(Health.current[target]).toBe(50);
      expect(Health.flashTimer[target]).toBe(0);
    });

    it('does nothing when multiplier makes effective damage zero', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 1, attacker, 0);

      expect(Health.current[target]).toBe(50);
    });

    it('clamps negative effective amount to zero', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      // Negative amount: Math.max(0, round(-5 * 1.0)) = 0
      takeDamage(world, target, -5, attacker);

      expect(Health.current[target]).toBe(50);
    });
  });

  describe('dead target guard', () => {
    it('does nothing when target already has 0 HP', () => {
      const target = spawnUnit(world, 100, 100, 0, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 10, attacker);

      expect(Health.current[target]).toBe(0);
    });

    it('does nothing when target has no Health component', () => {
      const noHealth = addEntity(world.ecs);
      addComponent(world.ecs, noHealth, Position);
      Position.x[noHealth] = 100;
      Position.y[noHealth] = 100;
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      // Should not throw
      expect(() => takeDamage(world, noHealth, 10, attacker)).not.toThrow();
    });
  });

  describe('Hardened Shells tech', () => {
    it('reduces damage by 15% for player units when tech is active', () => {
      world.tech.hardenedShells = true;
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 20, attacker);

      // 20 * 0.85 = 17, so HP = 50 - 17 = 33
      expect(Health.current[target]).toBe(33);
    });

    it('ensures minimum 1 damage even with Hardened Shells', () => {
      world.tech.hardenedShells = true;
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      // 1 * 0.85 rounds to 1 (Math.max(1, ...))
      takeDamage(world, target, 1, attacker);

      expect(Health.current[target]).toBe(49);
    });

    it('does NOT reduce damage for enemy units', () => {
      world.tech.hardenedShells = true;
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Enemy);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Player);

      takeDamage(world, target, 20, attacker);

      // No reduction: 50 - 20 = 30
      expect(Health.current[target]).toBe(30);
    });

    it('does NOT reduce damage when tech is not active', () => {
      world.tech.hardenedShells = false;
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 20, attacker);

      expect(Health.current[target]).toBe(30);
    });
  });

  describe('overkill / lethal damage', () => {
    it('allows HP to go below zero (death processed separately)', () => {
      const target = spawnUnit(world, 100, 100, 5, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 100, attacker);

      // HP goes negative; processDeath is called
      expect(Health.current[target]).toBeLessThan(0);
    });

    it('triggers death processing when HP drops to 0 or below', () => {
      const target = spawnUnit(world, 100, 100, 10, 60, Faction.Enemy);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Player);

      takeDamage(world, target, 10, attacker);

      // After takeDamage, if HP <= 0, processDeath sets HP to -1
      expect(Health.current[target]).toBeLessThanOrEqual(0);
    });
  });

  describe('damage to buildings', () => {
    it('applies damage to buildings', () => {
      const building = spawnBuilding(world, 100, 100, 200, 200, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, building, 30, attacker);

      expect(Health.current[building]).toBe(170);
    });

    it('triggers flash timer on buildings', () => {
      const building = spawnBuilding(world, 100, 100, 200, 200, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, building, 30, attacker);

      expect(Health.flashTimer[building]).toBe(8);
    });
  });

  describe('combat zone tracking', () => {
    it('creates a combat zone on cross-faction damage', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 10, attacker);

      expect(world.combatZones.length).toBeGreaterThanOrEqual(1);
      expect(world.combatZones[0].x).toBe(100);
      expect(world.combatZones[0].y).toBe(100);
    });

    it('merges nearby combat zones instead of creating duplicates', () => {
      const target = spawnUnit(world, 100, 100, 50, 60, Faction.Player);
      const attacker = spawnUnit(world, 120, 100, 60, 60, Faction.Enemy);

      takeDamage(world, target, 5, attacker);
      takeDamage(world, target, 5, attacker);

      // Should merge into one zone, not create two
      expect(world.combatZones.length).toBe(1);
    });
  });
});
