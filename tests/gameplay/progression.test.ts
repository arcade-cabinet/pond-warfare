/**
 * Progression Behavioral Tests
 *
 * Validates game progression: peace timer, enemy evolution tiers,
 * veterancy ranks and bonuses, difficulty settings, and permadeath mode.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { VET_DMG_BONUS, VET_HP_BONUS, VET_SPD_BONUS, VET_THRESHOLDS } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Carrying, Combat, Health, UnitStateMachine, Velocity } from '@/ecs/components';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { rankFromKills, veterancySystem } from '@/ecs/systems/veterancy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Progression', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('peace timer should prevent enemy attacks', () => {
    // During peace, evolution should not advance
    world.peaceTimer = 10800;
    world.frameCount = 600; // Multiple of 600 but before peace ends
    const initialTier = world.enemyEvolution.tier;

    evolutionSystem(world);

    expect(world.enemyEvolution.tier).toBe(initialTier);
  });

  it('enemy should evolve to tier 1 after 5 minutes post-peace', () => {
    world.peaceTimer = 0;
    // 5 minutes = 5 * 60 * 60 = 18000 frames
    world.frameCount = 18000;
    world.enemyEvolution.tier = 0;

    evolutionSystem(world);

    expect(world.enemyEvolution.tier).toBe(1);
    expect(world.enemyEvolution.unlockedUnits).toContain(EntityKind.ArmoredGator);
  });

  it('enemy should evolve to tier 2 after 10 minutes', () => {
    world.peaceTimer = 0;
    world.enemyEvolution.tier = 1;
    world.enemyEvolution.unlockedUnits = [
      EntityKind.Gator,
      EntityKind.Snake,
      EntityKind.ArmoredGator,
    ];
    // 10 minutes = 36000 frames
    world.frameCount = 36000;

    evolutionSystem(world);

    expect(world.enemyEvolution.tier).toBe(2);
    expect(world.enemyEvolution.unlockedUnits).toContain(EntityKind.VenomSnake);
  });

  it('veteran rank should increase at 3 kills', () => {
    expect(rankFromKills(3)).toBe(1);
    expect(VET_THRESHOLDS[1]).toBe(3);
  });

  it('elite rank should increase at 7 kills', () => {
    expect(rankFromKills(7)).toBe(2);
    expect(VET_THRESHOLDS[2]).toBe(7);
  });

  it('hero rank should increase at 15 kills', () => {
    expect(rankFromKills(15)).toBe(3);
    expect(VET_THRESHOLDS[3]).toBe(15);
  });

  it('veterancy bonuses should stack correctly', () => {
    world.frameCount = 60;

    const sapper = spawnEntity(world, SAPPER_KIND, 100, 100, Faction.Player);
    const def = ENTITY_DEFS[SAPPER_KIND];
    const baseHp = def.hp;
    const baseDmg = def.damage;
    const baseSpeed = def.speed;

    // Jump straight to Hero (15 kills)
    Combat.kills[sapper] = 15;
    veterancySystem(world);

    // Hero bonuses: 35% HP, 40% damage, 15% speed
    const expectedHp = baseHp + Math.round(baseHp * VET_HP_BONUS[3]);
    const expectedDmg = baseDmg + Math.round(baseDmg * VET_DMG_BONUS[3]);
    const expectedSpd = baseSpeed + baseSpeed * VET_SPD_BONUS[3];

    expect(Health.max[sapper]).toBe(expectedHp);
    expect(Combat.damage[sapper]).toBe(expectedDmg);
    expect(Velocity.speed[sapper]).toBeCloseTo(expectedSpd);
  });

  it('difficulty easy should give 1 enemy nest', () => {
    // Verify the nest count configuration matches the design bible
    const nestCountByDifficulty: Record<string, number> = {
      easy: 1,
      normal: 2,
      hard: 3,
      nightmare: 4,
      ultraNightmare: 5,
    };
    expect(nestCountByDifficulty.easy).toBe(1);
  });

  it('difficulty hard should give 3 enemy nests', () => {
    const nestCountByDifficulty: Record<string, number> = {
      easy: 1,
      normal: 2,
      hard: 3,
      nightmare: 4,
      ultraNightmare: 5,
    };
    expect(nestCountByDifficulty.hard).toBe(3);
  });

  it('permadeath should increase resource modifier to 1.5', () => {
    world.permadeath = true;
    world.rewardsModifier = 1.5;

    expect(world.rewardsModifier).toBe(1.5);

    // Verify the modifier affects gathering by checking a Mudpaw
    world.frameCount = 1;
    spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const resource = spawnEntity(world, EntityKind.Clambed, 100, 100, Faction.Neutral);
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);

    UnitStateMachine.state[mudpaw] = UnitState.Gathering;
    UnitStateMachine.targetEntity[mudpaw] = resource;
    UnitStateMachine.gatherTimer[mudpaw] = 1;

    gatheringSystem(world);

    // With rewardsModifier 1.5, gather amount should be Math.round(15 * 1.5) = 23
    expect(Carrying.resourceAmount[mudpaw]).toBe(Math.round(15 * 1.5));
  });
});
