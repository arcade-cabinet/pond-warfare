/**
 * Combat Behavioral Tests
 *
 * Validates damage multiplier tables, special unit abilities (AoE, enrage,
 * siege, poison, speed debuff), tower auto-attack, and alpha predator aura.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getDamageMultiplier, SIEGE_BUILDING_MULTIPLIER } from '@/config/entity-defs';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Combat,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { combatSystem } from '@/ecs/systems/combat';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { createGameWorld, type GameWorld } from '@/ecs/world';
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

  it('brawler should deal 1.5x damage to sniper', () => {
    const mult = getDamageMultiplier(EntityKind.Brawler, EntityKind.Sniper);
    expect(mult).toBe(1.5);
  });

  it('sniper should deal 0.75x damage to brawler', () => {
    const mult = getDamageMultiplier(EntityKind.Sniper, EntityKind.Brawler);
    expect(mult).toBe(0.75);
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

  it('melee counter multipliers are applied once, not twice', () => {
    const gator = spawnEntity(world, EntityKind.Gator, 120, 100, Faction.Enemy);
    const brawler = spawnEntity(world, EntityKind.Brawler, 140, 100, Faction.Player);
    Sprite.facingLeft[gator] = 0;

    UnitStateMachine.state[brawler] = UnitState.Attacking;
    UnitStateMachine.targetEntity[brawler] = gator;
    Combat.attackCooldown[brawler] = 0;

    combatSystem(world);

    // Brawler base damage 6 vs Gator 0.75x => round(4.5) = 5 damage.
    expect(Health.current[gator]).toBe(55);
  });

  it('catapult should deal AoE damage', () => {
    const catapult = spawnEntity(world, EntityKind.Catapult, 100, 100, Faction.Player);
    UnitStateMachine.state[catapult] = UnitState.Attacking;
    Combat.attackCooldown[catapult] = 0;

    // Primary target and a nearby secondary target
    const target = spawnEntity(world, EntityKind.Gator, 200, 100, Faction.Enemy);
    const nearby = spawnEntity(world, EntityKind.Snake, 220, 100, Faction.Enemy);
    UnitStateMachine.targetEntity[catapult] = target;

    // Place them within catapult's attack range
    const catapultRange = Combat.attackRange[catapult];
    expect(catapultRange).toBe(250);

    // Ensure distance <= range
    Position.x[target] = Position.x[catapult] + 200;
    Position.y[target] = Position.y[catapult];

    // Place nearby enemy within AoE radius (60px) of target
    Position.x[nearby] = Position.x[target] + 30;
    Position.y[nearby] = Position.y[target];

    // Populate spatial hash
    world.spatialHash.clear();
    world.spatialHash.insert(target, Position.x[target], Position.y[target]);
    world.spatialHash.insert(nearby, Position.x[nearby], Position.y[nearby]);
    world.spatialHash.insert(catapult, Position.x[catapult], Position.y[catapult]);

    const nearbyHpBefore = Health.current[nearby];

    combatSystem(world);

    // The nearby unit should have taken AoE damage (50% of catapult damage)
    expect(Health.current[nearby]).toBeLessThan(nearbyHpBefore);
  });

  it('boss croc should enrage below 30% HP', () => {
    const boss = spawnEntity(world, EntityKind.BossCroc, 100, 100, Faction.Enemy);
    const brawler = spawnEntity(world, EntityKind.Brawler, 120, 100, Faction.Player);

    // Set boss to low HP (below 30%)
    Health.current[boss] = Math.floor(Health.max[boss] * 0.2);
    UnitStateMachine.state[boss] = UnitState.Attacking;
    UnitStateMachine.targetEntity[boss] = brawler;
    Combat.attackCooldown[boss] = 0;

    // Place them within attack range
    const brawlerHpBefore = Health.current[brawler];

    // Populate spatial hash for AoE stomp
    world.spatialHash.clear();
    world.spatialHash.insert(brawler, Position.x[brawler], Position.y[brawler]);
    world.spatialHash.insert(boss, Position.x[boss], Position.y[boss]);

    combatSystem(world);

    // Boss should have dealt enraged damage (2x) via AoE stomp
    // Normal boss damage is 15, enraged = 30
    expect(Health.current[brawler]).toBeLessThan(brawlerHpBefore);
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
    const brawler = spawnEntity(world, EntityKind.Brawler, 120, 100, Faction.Player);

    UnitStateMachine.state[snake] = UnitState.Attacking;
    UnitStateMachine.targetEntity[snake] = brawler;
    Combat.attackCooldown[snake] = 0;

    combatSystem(world);

    // Brawler should be poisoned (5 ticks)
    expect(world.poisonTimers.has(brawler)).toBe(true);
    expect(world.poisonTimers.get(brawler)).toBe(5);
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

  it('shieldbearer should resist gator damage (0.75x)', () => {
    const mult = getDamageMultiplier(EntityKind.Shieldbearer, EntityKind.Gator);
    expect(mult).toBe(0.75);
  });

  it('trapper should apply speed debuff on attack', () => {
    const trapper = spawnEntity(world, EntityKind.Trapper, 100, 100, Faction.Player);
    const gator = spawnEntity(world, EntityKind.Gator, 150, 100, Faction.Enemy);

    UnitStateMachine.state[trapper] = UnitState.Attacking;
    UnitStateMachine.targetEntity[trapper] = gator;
    Combat.attackCooldown[trapper] = 0;

    // Place within attack range (trapper range = 100)
    const dist = Math.sqrt(
      (Position.x[gator] - Position.x[trapper]) ** 2 +
        (Position.y[gator] - Position.y[trapper]) ** 2,
    );
    expect(dist).toBeLessThanOrEqual(Combat.attackRange[trapper]);

    combatSystem(world);

    // Gator should have a speed debuff timer set
    expect(Velocity.speedDebuffTimer[gator]).toBe(180);
    // Should see "TRAPPED!" floating text
    const trapText = world.floatingTexts.find((t) => t.text === 'TRAPPED!');
    expect(trapText).toBeDefined();
  });
});
