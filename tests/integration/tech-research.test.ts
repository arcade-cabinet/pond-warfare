/**
 * Tech Research Integration Tests
 *
 * Tests that techs can be researched across all 5 branches, that
 * prerequisites are enforced, and that effects are applied correctly.
 * Operates directly on ECS systems — no UI, no DOM.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { ATTACK_COOLDOWN } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Combat, Health, Position, UnitStateMachine, Velocity } from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { healthSystem } from '@/ecs/systems/health';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

describe('Tech Research Integration', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 0;
  });

  // ── Lodge Branch ──────────────────────────────────────────────

  describe('Lodge branch', () => {
    it('cartography has no prerequisites', () => {
      expect(canResearch('cartography', world.tech)).toBe(true);
    });

    it('tidalHarvest has no prerequisites', () => {
      expect(canResearch('tidalHarvest', world.tech)).toBe(true);
    });

    it('tradeRoutes requires cartography', () => {
      expect(canResearch('tradeRoutes', world.tech)).toBe(false);
      world.tech.cartography = true;
      expect(canResearch('tradeRoutes', world.tech)).toBe(true);
    });

    it('deepDiving requires tidalHarvest', () => {
      expect(canResearch('deepDiving', world.tech)).toBe(false);
      world.tech.tidalHarvest = true;
      expect(canResearch('deepDiving', world.tech)).toBe(true);
    });

    it('rootNetwork requires deepDiving', () => {
      expect(canResearch('rootNetwork', world.tech)).toBe(false);
      world.tech.deepDiving = true;
      expect(canResearch('rootNetwork', world.tech)).toBe(true);
    });
  });

  // ── Nature Branch ─────────────────────────────────────────────

  describe('Nature branch', () => {
    it('herbalMedicine has no prerequisites', () => {
      expect(canResearch('herbalMedicine', world.tech)).toBe(true);
    });

    it('aquaticTraining requires herbalMedicine', () => {
      expect(canResearch('aquaticTraining', world.tech)).toBe(false);
      world.tech.herbalMedicine = true;
      expect(canResearch('aquaticTraining', world.tech)).toBe(true);
    });

    it('regeneration heals all units every 300 frames', () => {
      world.tech.regeneration = true;
      const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
      Health.current[brawler] = 10;
      UnitStateMachine.state[brawler] = UnitState.Attacking;

      world.frameCount = 300;
      healthSystem(world);

      expect(Health.current[brawler]).toBe(11);
    });
  });

  // ── Warfare Branch ────────────────────────────────────────────

  describe('Warfare branch', () => {
    it('sharp sticks adds +2 damage to spawned units', () => {
      world.tech.sharpSticks = true;
      const baseDmg = ENTITY_DEFS[EntityKind.Brawler].damage;
      const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
      expect(Combat.damage[brawler]).toBe(baseDmg + 2);
    });

    it('eagle eye adds +50 range to snipers', () => {
      world.tech.eagleEye = true;
      const baseRange = ENTITY_DEFS[EntityKind.Sniper].attackRange;
      const sniper = spawnEntity(world, EntityKind.Sniper, 100, 100, Faction.Player);
      expect(Combat.attackRange[sniper]).toBe(baseRange + 50);
    });

    it('eagleEye requires sharpSticks', () => {
      expect(canResearch('eagleEye', world.tech)).toBe(false);
      world.tech.sharpSticks = true;
      expect(canResearch('eagleEye', world.tech)).toBe(true);
    });

    it('battle roar reduces attack cooldown by 10%', () => {
      world.tech.battleRoar = true;
      const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
      const gator = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);

      UnitStateMachine.state[brawler] = UnitState.Attacking;
      UnitStateMachine.targetEntity[brawler] = gator;
      Combat.attackCooldown[brawler] = 0;
      combatSystem(world);

      expect(Combat.attackCooldown[brawler]).toBe(Math.round(ATTACK_COOLDOWN * 0.9));
    });
  });

  // ── Fortifications Branch ─────────────────────────────────────

  describe('Fortifications branch', () => {
    it('sturdy mud adds +300 HP to buildings', () => {
      world.tech.sturdyMud = true;
      const baseHp = ENTITY_DEFS[EntityKind.Burrow].hp;
      const burrow = spawnEntity(world, EntityKind.Burrow, 100, 100, Faction.Player);
      expect(Health.max[burrow]).toBe(baseHp + 300);
    });

    it('iron shell requires sharpSticks (cross-branch)', () => {
      expect(canResearch('ironShell', world.tech)).toBe(false);
      world.tech.sharpSticks = true;
      expect(canResearch('ironShell', world.tech)).toBe(true);
    });

    it('siege works requires eagleEye (cross-branch)', () => {
      expect(canResearch('siegeWorks', world.tech)).toBe(false);
      world.tech.eagleEye = true;
      expect(canResearch('siegeWorks', world.tech)).toBe(true);
    });

    it('hardened shells increases idle healing to +5', () => {
      world.tech.hardenedShells = true;
      const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
      Health.current[brawler] = 10;
      UnitStateMachine.state[brawler] = UnitState.Idle;

      world.frameCount = 300;
      healthSystem(world);

      expect(Health.current[brawler]).toBe(15);
    });
  });

  // ── Shadow Branch ─────────────────────────────────────────────

  describe('Shadow branch', () => {
    it('swift paws adds +0.4 speed to spawned units', () => {
      world.tech.swiftPaws = true;
      const baseSpeed = ENTITY_DEFS[EntityKind.Brawler].speed;
      const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
      expect(Velocity.speed[brawler]).toBeCloseTo(baseSpeed + 0.4);
    });

    it('cunningTraps requires swiftPaws', () => {
      expect(canResearch('cunningTraps', world.tech)).toBe(false);
      world.tech.swiftPaws = true;
      expect(canResearch('cunningTraps', world.tech)).toBe(true);
    });

    it('camouflage reduces enemy aggro detection range', () => {
      world.tech.camouflage = true;
      const enemy = spawnEntity(world, EntityKind.Gator, 300, 300, Faction.Enemy);
      UnitStateMachine.state[enemy] = UnitState.Idle;

      // Place player unit at 180px (inside normal 250px range, outside camo 167px)
      const player = spawnEntity(world, EntityKind.Brawler, 480, 300, Faction.Player);

      world.spatialHash.clear();
      world.spatialHash.insert(enemy, Position.x[enemy], Position.y[enemy]);
      world.spatialHash.insert(player, Position.x[player], Position.y[player]);

      world.frameCount = 30;
      combatSystem(world);

      expect(UnitStateMachine.state[enemy]).toBe(UnitState.Idle);
    });
  });

  // ── Cross-cutting ─────────────────────────────────────────────

  it('cannot research already-researched tech', () => {
    world.tech.sharpSticks = true;
    expect(canResearch('sharpSticks', world.tech)).toBe(false);
  });

  it('all 25 techs are defined', () => {
    const techIds = Object.keys(TECH_UPGRADES) as TechId[];
    expect(techIds.length).toBe(25);
  });

  it('each branch has exactly 5 techs', () => {
    const branches = new Map<string, number>();
    for (const tech of Object.values(TECH_UPGRADES)) {
      branches.set(tech.branch, (branches.get(tech.branch) ?? 0) + 1);
    }
    expect(branches.get('lodge')).toBe(5);
    expect(branches.get('nature')).toBe(5);
    expect(branches.get('warfare')).toBe(5);
    expect(branches.get('fortifications')).toBe(5);
    expect(branches.get('shadow')).toBe(5);
  });
});
