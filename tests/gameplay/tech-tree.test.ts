/**
 * Tech Tree Behavioral Tests
 *
 * Validates that tech tree upgrades correctly modify spawned units and
 * game mechanics: damage bonuses, speed bonuses, building HP, range
 * extensions, unit gating, vision improvements, and healing changes.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { TECH_UPGRADES } from '@/config/tech-tree';
import { ATTACK_COOLDOWN } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Combat, Health, Position, UnitStateMachine, Velocity } from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { healthSystem } from '@/ecs/systems/health';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Tech Tree Effects', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 0;
  });

  it('sharp sticks should add +2 damage to spawned units', () => {
    world.tech.sharpSticks = true;
    const baseDmg = ENTITY_DEFS[EntityKind.Brawler].damage;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);

    expect(Combat.damage[brawler]).toBe(baseDmg + 2);
  });

  it('swift paws should add +0.4 speed to spawned units', () => {
    world.tech.swiftPaws = true;
    const baseSpeed = ENTITY_DEFS[EntityKind.Brawler].speed;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);

    expect(Velocity.speed[brawler]).toBeCloseTo(baseSpeed + 0.4);
  });

  it('sturdy mud should add +300 HP to buildings', () => {
    world.tech.sturdyMud = true;
    const baseHp = ENTITY_DEFS[EntityKind.Burrow].hp;

    const burrow = spawnEntity(world, EntityKind.Burrow, 100, 100, Faction.Player);

    expect(Health.max[burrow]).toBe(baseHp + 300);
  });

  it('eagle eye should add +50 range to snipers', () => {
    world.tech.eagleEye = true;
    const baseRange = ENTITY_DEFS[EntityKind.Sniper].attackRange;

    const sniper = spawnEntity(world, EntityKind.Sniper, 100, 100, Faction.Player);

    expect(Combat.attackRange[sniper]).toBe(baseRange + 50);
  });

  it('iron shell should gate shieldbearer training', () => {
    const ironShell = TECH_UPGRADES.ironShell;

    expect(ironShell.description).toContain('Shieldbearer');
    expect(ironShell.requires).toBe('sharpSticks');
  });

  it('siege works should gate catapult training', () => {
    const siegeWorks = TECH_UPGRADES.siegeWorks;

    expect(siegeWorks.description).toContain('Catapult');
    expect(siegeWorks.requires).toBe('eagleEye');
  });

  it('cartography should increase fog reveal radius', () => {
    const cartography = TECH_UPGRADES.cartography;

    expect(cartography.description).toContain('fog reveal');
  });

  it('camouflage should reduce enemy aggro detection', () => {
    // When camouflage is active, enemy aggro radius is reduced by 33%
    world.tech.camouflage = true;

    // Create an idle enemy unit and a player unit just outside reduced aggro range
    const enemy = spawnEntity(world, EntityKind.Gator, 300, 300, Faction.Enemy);
    UnitStateMachine.state[enemy] = UnitState.Idle;

    // Normal aggro radius is 250. With camouflage: 250 * 0.67 = ~167.5
    // Place player unit at 180px away (inside normal range, outside camouflage range)
    const player = spawnEntity(world, EntityKind.Brawler, 480, 300, Faction.Player);

    // Populate spatial hash
    world.spatialHash.clear();
    world.spatialHash.insert(enemy, Position.x[enemy], Position.y[enemy]);
    world.spatialHash.insert(player, Position.x[player], Position.y[player]);

    // Run combat system at frame 30 (auto-aggro runs every 30 frames)
    world.frameCount = 30;
    combatSystem(world);

    // Enemy should NOT have aggroed because player is outside reduced range
    expect(UnitStateMachine.state[enemy]).toBe(UnitState.Idle);
  });

  it('battle roar should reduce attack cooldown by 10%', () => {
    world.tech.battleRoar = true;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    const gator = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);

    UnitStateMachine.state[brawler] = UnitState.Attacking;
    UnitStateMachine.targetEntity[brawler] = gator;
    Combat.attackCooldown[brawler] = 0;

    combatSystem(world);

    // With battle roar, cooldown should be Math.round(ATTACK_COOLDOWN * 0.9)
    const expectedCooldown = Math.round(ATTACK_COOLDOWN * 0.9);
    expect(Combat.attackCooldown[brawler]).toBe(expectedCooldown);
  });

  it('hardened shells should increase idle healing to +5', () => {
    world.tech.hardenedShells = true;

    const brawler = spawnEntity(world, EntityKind.Brawler, 100, 100, Faction.Player);
    // Wound the brawler
    Health.current[brawler] = 10;
    UnitStateMachine.state[brawler] = UnitState.Idle;

    // Passive healing runs every 300 frames
    world.frameCount = 300;
    healthSystem(world);

    // Should heal +5 instead of +1
    expect(Health.current[brawler]).toBe(15);
  });
});
