/**
 * Combat Behavioral Tests
 *
 * Validates damage multiplier tables, live combat behaviors, enrage,
 * siege, poison, tower auto-attack, and alpha predator aura.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getDamageMultiplier, SIEGE_BUILDING_MULTIPLIER } from '@/config/entity-defs';
import { ATTACK_COOLDOWN } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Combat,
  Health,
  IsProjectile,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { query } from 'bitecs';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Combat', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 0;
  });

  it('live Sapper and Saboteur use neutral direct-damage matchups', () => {
    expect(getDamageMultiplier(EntityKind.Sapper, EntityKind.Saboteur)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.Saboteur, EntityKind.Sapper)).toBe(1.0);
  });

  it('tower should auto-attack nearest enemy in range', () => {
    // Create a completed player tower
    const tower = spawnEntity(world, EntityKind.Tower, 500, 500, Faction.Player);
    Building.progress[tower] = 100;
    Health.current[tower] = Health.max[tower];
    Combat.attackCooldown[tower] = 0;

    // Place an enemy in range
    const gator = spawnEntity(world, EntityKind.Gator, 550, 500, Faction.Enemy);

    // Populate spatial hash so the tower can find the enemy
    world.spatialHash.clear();
    world.spatialHash.insert(gator, Position.x[gator], Position.y[gator]);

    combatSystem(world);

    // Tower should have fired (cooldown set)
    expect(Combat.attackCooldown[tower]).toBeGreaterThan(0);
  });

  it('shared heavy chassis now falls back to direct live-combat behavior', () => {
    const gator = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);
    const sharedHeavy = spawnEntity(world, EntityKind.SharedHeavyChassis, 140, 100, Faction.Player);
    Sprite.facingLeft[gator] = 0;

    UnitStateMachine.state[sharedHeavy] = UnitState.Attacking;
    UnitStateMachine.targetEntity[sharedHeavy] = gator;
    Combat.attackCooldown[sharedHeavy] = 0;

    combatSystem(world);

    expect(Health.current[gator]).toBe(45);
    expect(query(world.ecs, [IsProjectile]).length).toBe(0);
  });

  it('Saboteur attacks deal direct damage without spawning projectile entities', () => {
    const snake = spawnEntity(world, EntityKind.Snake, 120, 100, Faction.Enemy);
    const saboteur = spawnEntity(world, EntityKind.Saboteur, 100, 100, Faction.Player);

    UnitStateMachine.state[saboteur] = UnitState.Attacking;
    UnitStateMachine.targetEntity[saboteur] = snake;
    Combat.attackCooldown[saboteur] = 0;

    combatSystem(world);

    expect(Health.current[snake]).toBeLessThan(Health.max[snake]);
    expect(query(world.ecs, [IsProjectile]).length).toBe(0);
  });

  it('shared siege chassis now attacks directly without projectile splash', () => {
    const sharedSiege = spawnEntity(world, EntityKind.SharedSiegeChassis, 100, 100, Faction.Player);
    UnitStateMachine.state[sharedSiege] = UnitState.Attacking;
    Combat.attackCooldown[sharedSiege] = 0;

    const target = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);
    const nearby = spawnEntity(world, EntityKind.Snake, 140, 100, Faction.Enemy);
    UnitStateMachine.targetEntity[sharedSiege] = target;

    const nearbyHpBefore = Health.current[nearby];
    combatSystem(world);

    expect(Health.current[target]).toBeLessThan(Health.max[target]);
    expect(Health.current[nearby]).toBe(nearbyHpBefore);
    expect(query(world.ecs, [IsProjectile]).length).toBe(0);
  });

  it('boss croc should enrage below 30% HP', () => {
    const boss = spawnEntity(world, EntityKind.BossCroc, 100, 100, Faction.Enemy);
    const sapper = spawnEntity(world, SAPPER_KIND, 120, 100, Faction.Player);

    // Set boss to low HP (below 30%)
    Health.current[boss] = Math.floor(Health.max[boss] * 0.2);
    UnitStateMachine.state[boss] = UnitState.Attacking;
    UnitStateMachine.targetEntity[boss] = sapper;
    Combat.attackCooldown[boss] = 0;

    // Place them within attack range
    const sapperHpBefore = Health.current[sapper];

    // Populate spatial hash for AoE stomp
    world.spatialHash.clear();
    world.spatialHash.insert(
      sapper,
      Position.x[sapper],
      Position.y[sapper],
    );
    world.spatialHash.insert(boss, Position.x[boss], Position.y[boss]);

    combatSystem(world);

    // Boss should have dealt enraged damage (2x) via AoE stomp
    // Normal boss damage is 15, enraged = 30
    expect(Health.current[sapper]).toBeLessThan(sapperHpBefore);
    // Should see "ENRAGED!" floating text
    const enrageText = world.floatingTexts.find((t) => t.text === 'ENRAGED!');
    expect(enrageText).toBeDefined();
  });

  it('siege turtle should deal 3x damage to buildings', () => {
    const siegeMult = SIEGE_BUILDING_MULTIPLIER;
    expect(siegeMult).toBe(3.0);

    const turtle = spawnEntity(world, EntityKind.SiegeTurtle, 100, 100, Faction.Enemy);
    const lodge = spawnEntity(world, EntityKind.Lodge, 120, 100, Faction.Player);

    UnitStateMachine.state[turtle] = UnitState.Attacking;
    UnitStateMachine.targetEntity[turtle] = lodge;
    Combat.attackCooldown[turtle] = 0;

    const lodgeHpBefore = Health.current[lodge];

    combatSystem(world);

    // Siege Turtle base damage 25 with 3x building bonus => 75 damage.
    expect(lodgeHpBefore - Health.current[lodge]).toBe(75);
  });

  it('venom snake should apply poison DoT', () => {
    const snake = spawnEntity(world, EntityKind.VenomSnake, 100, 100, Faction.Enemy);
    const sapper = spawnEntity(world, SAPPER_KIND, 120, 100, Faction.Player);

    UnitStateMachine.state[snake] = UnitState.Attacking;
    UnitStateMachine.targetEntity[snake] = sapper;
    Combat.attackCooldown[snake] = 0;

    combatSystem(world);

    expect(world.poisonTimers.has(sapper)).toBe(true);
    expect(world.poisonTimers.get(sapper)).toBe(5);
  });

  it('alpha predator should buff nearby enemy damage by 20%', () => {
    const alpha = spawnEntity(world, EntityKind.AlphaPredator, 300, 300, Faction.Enemy);
    const gator = spawnEntity(world, EntityKind.Gator, 350, 300, Faction.Enemy);

    // Ensure both are alive
    expect(Health.current[alpha]).toBeGreaterThan(0);
    expect(Health.current[gator]).toBeGreaterThan(0);

    // Populate spatial hash
    world.spatialHash.clear();
    world.spatialHash.insert(alpha, Position.x[alpha], Position.y[alpha]);
    world.spatialHash.insert(gator, Position.x[gator], Position.y[gator]);

    // Run evolution system which processes the alpha aura every 60 frames
    world.frameCount = 60;
    world.peaceTimer = 0;
    evolutionSystem(world);

    // The gator should have the alpha damage buff
    expect(world.alphaDamageBuff.has(gator)).toBe(true);
    expect(world.alphaDamageBuff.get(gator)).toBe(world.frameCount + 60);
  });

  it('reserved compatibility ids use neutral matchup values', () => {
    expect(getDamageMultiplier(EntityKind.SharedHeavyChassis, EntityKind.Gator)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.SharedSiegeChassis, EntityKind.Gator)).toBe(1.0);
  });

  it('player attack speed multiplier reduces attack cooldown', () => {
    world.playerAttackSpeedMultiplier = 1.5;
    const snake = spawnEntity(world, EntityKind.Snake, 120, 100, Faction.Enemy);
    const sapper = spawnEntity(world, SAPPER_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[sapper] = UnitState.Attacking;
    UnitStateMachine.targetEntity[sapper] = snake;
    Combat.attackCooldown[sapper] = 0;

    combatSystem(world);

    expect(Combat.attackCooldown[sapper]).toBe(Math.round(ATTACK_COOLDOWN / 1.5));
    expect(Combat.attackCooldown[sapper]).toBeLessThan(ATTACK_COOLDOWN);
  });

  it('player demolish power increases Sapper damage against buildings', () => {
    const baseWorld = createGameWorld();
    const baseLodge = spawnEntity(baseWorld, EntityKind.Lodge, 120, 100, Faction.Enemy);
    const baseSapper = spawnEntity(baseWorld, SAPPER_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[baseSapper] = UnitState.Attacking;
    UnitStateMachine.targetEntity[baseSapper] = baseLodge;
    Combat.attackCooldown[baseSapper] = 0;
    const baseHpBefore = Health.current[baseLodge];
    combatSystem(baseWorld);
    const baseDamage = baseHpBefore - Health.current[baseLodge];

    world.playerDemolishPowerMultiplier = 1.5;
    const lodge = spawnEntity(world, EntityKind.Lodge, 120, 100, Faction.Enemy);
    const sapper = spawnEntity(world, SAPPER_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[sapper] = UnitState.Attacking;
    UnitStateMachine.targetEntity[sapper] = lodge;
    Combat.attackCooldown[sapper] = 0;
    const lodgeHpBefore = Health.current[lodge];
    combatSystem(world);
    const boostedDamage = lodgeHpBefore - Health.current[lodge];

    expect(boostedDamage).toBeGreaterThan(baseDamage);
  });
});
