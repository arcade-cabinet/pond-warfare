/**
 * Veterancy System Tests
 *
 * Validates rank calculation, bonus application, and stacking on rank-up.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { VET_DMG_BONUS, VET_HP_BONUS, VET_SPD_BONUS } from '@/constants';
import {
  Combat,
  EntityTypeTag,
  Health,
  Position,
  Sprite,
  Velocity,
  Veterancy,
} from '@/ecs/components';
import { rankFromKills, veterancySystem } from '@/ecs/systems/veterancy';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { FactionTag } from '@/ecs/components';

function createVetUnit(
  world: GameWorld,
  kind: EntityKind = EntityKind.Brawler,
  faction: Faction = Faction.Player,
): number {
  const eid = addEntity(world.ecs);
  const def = ENTITY_DEFS[kind];

  addComponent(world.ecs, eid, Position);
  Position.x[eid] = 100;
  Position.y[eid] = 100;

  addComponent(world.ecs, eid, Health);
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;

  addComponent(world.ecs, eid, Combat);
  Combat.damage[eid] = def.damage;
  Combat.attackRange[eid] = def.attackRange;
  Combat.attackCooldown[eid] = 0;
  Combat.kills[eid] = 0;

  addComponent(world.ecs, eid, Velocity);
  Velocity.speed[eid] = def.speed;

  addComponent(world.ecs, eid, Veterancy);
  Veterancy.rank[eid] = 0;
  Veterancy.appliedRank[eid] = 0;

  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = kind;

  addComponent(world.ecs, eid, FactionTag);
  FactionTag.faction[eid] = faction;

  addComponent(world.ecs, eid, Sprite);
  Sprite.width[eid] = 40;
  Sprite.height[eid] = 40;

  return eid;
}

describe('rankFromKills', () => {
  it('should return 0 (Recruit) for 0 kills', () => {
    expect(rankFromKills(0)).toBe(0);
  });

  it('should return 0 for 1-2 kills', () => {
    expect(rankFromKills(1)).toBe(0);
    expect(rankFromKills(2)).toBe(0);
  });

  it('should return 1 (Veteran) for 3 kills', () => {
    expect(rankFromKills(3)).toBe(1);
  });

  it('should return 1 (Veteran) for 4-6 kills', () => {
    expect(rankFromKills(4)).toBe(1);
    expect(rankFromKills(6)).toBe(1);
  });

  it('should return 2 (Elite) for 7 kills', () => {
    expect(rankFromKills(7)).toBe(2);
  });

  it('should return 2 (Elite) for 8-14 kills', () => {
    expect(rankFromKills(8)).toBe(2);
    expect(rankFromKills(14)).toBe(2);
  });

  it('should return 3 (Hero) for 15 kills', () => {
    expect(rankFromKills(15)).toBe(3);
  });

  it('should return 3 (Hero) for >15 kills', () => {
    expect(rankFromKills(20)).toBe(3);
    expect(rankFromKills(100)).toBe(3);
  });
});

describe('veterancySystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Set frameCount to a multiple of 60 so the system runs
    world.frameCount = 60;
  });

  it('should not rank up a unit with 0 kills', () => {
    const eid = createVetUnit(world);
    Combat.kills[eid] = 0;

    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(0);
    expect(Veterancy.appliedRank[eid]).toBe(0);
  });

  it('should rank up to Veteran at 3 kills with correct HP bonus', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    const baseHp = def.hp;
    Combat.kills[eid] = 3;

    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(1);
    expect(Veterancy.appliedRank[eid]).toBe(1);

    const expectedHpBonus = Math.round(baseHp * VET_HP_BONUS[1]);
    expect(Health.max[eid]).toBe(baseHp + expectedHpBonus);
    // Unit should be healed by the bonus amount
    expect(Health.current[eid]).toBe(baseHp + expectedHpBonus);
  });

  it('should apply correct damage bonus on rank up', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    const baseDmg = def.damage;
    Combat.kills[eid] = 3;

    veterancySystem(world);

    const expectedDmgBonus = Math.round(baseDmg * VET_DMG_BONUS[1]);
    expect(Combat.damage[eid]).toBe(baseDmg + expectedDmgBonus);
  });

  it('should not apply speed bonus at Veteran rank', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    const baseSpeed = def.speed;
    Combat.kills[eid] = 3;

    veterancySystem(world);

    // VET_SPD_BONUS[1] is 0, so speed should be unchanged
    expect(Velocity.speed[eid]).toBeCloseTo(baseSpeed);
  });

  it('should apply speed bonus at Elite rank', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    const baseSpeed = def.speed;
    Combat.kills[eid] = 7;

    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(2);
    const expectedSpdBonus = baseSpeed * VET_SPD_BONUS[2];
    expect(Velocity.speed[eid]).toBeCloseTo(baseSpeed + expectedSpdBonus);
  });

  it('should stack bonuses properly when ranking from Veteran to Elite', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    const baseHp = def.hp;
    const baseDmg = def.damage;

    // First: rank up to Veteran with 3 kills
    Combat.kills[eid] = 3;
    veterancySystem(world);

    const hpAfterVet = Health.max[eid];
    const dmgAfterVet = Combat.damage[eid];
    expect(Veterancy.rank[eid]).toBe(1);

    // Now get more kills to reach Elite
    Combat.kills[eid] = 7;
    world.frameCount = 120;
    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(2);

    // Delta HP bonus: VET_HP_BONUS[2] - VET_HP_BONUS[1]
    const deltaHp = Math.round(baseHp * (VET_HP_BONUS[2] - VET_HP_BONUS[1]));
    expect(Health.max[eid]).toBe(hpAfterVet + deltaHp);

    // Delta DMG bonus: VET_DMG_BONUS[2] - VET_DMG_BONUS[1]
    const deltaDmg = Math.round(baseDmg * (VET_DMG_BONUS[2] - VET_DMG_BONUS[1]));
    expect(Combat.damage[eid]).toBe(dmgAfterVet + deltaDmg);
  });

  it('should stack bonuses all the way to Hero', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    const baseHp = def.hp;
    const baseDmg = def.damage;
    const baseSpeed = def.speed;

    // Go directly to Hero with 15 kills
    Combat.kills[eid] = 15;
    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(3);

    // Full Hero bonuses (from rank 0 directly)
    const expectedHp = baseHp + Math.round(baseHp * VET_HP_BONUS[3]);
    const expectedDmg = baseDmg + Math.round(baseDmg * VET_DMG_BONUS[3]);
    const expectedSpd = baseSpeed + baseSpeed * VET_SPD_BONUS[3];

    expect(Health.max[eid]).toBe(expectedHp);
    expect(Combat.damage[eid]).toBe(expectedDmg);
    expect(Velocity.speed[eid]).toBeCloseTo(expectedSpd);
  });

  it('should produce floating text on rank up', () => {
    const eid = createVetUnit(world);
    Combat.kills[eid] = 3;

    veterancySystem(world);

    expect(world.floatingTexts.length).toBeGreaterThan(0);
    const text = world.floatingTexts[0];
    expect(text.text).toBe('Veteran!');
    expect(text.color).toBe('#fbbf24');
  });

  it('should produce particles on rank up', () => {
    const eid = createVetUnit(world);
    Combat.kills[eid] = 3;

    veterancySystem(world);

    expect(world.particles.length).toBe(12); // 12 sparkle particles
  });

  it('should not run on non-60-frame ticks', () => {
    const eid = createVetUnit(world);
    Combat.kills[eid] = 3;
    world.frameCount = 61; // Not a multiple of 60

    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(0); // No change
  });

  it('should not double-apply bonuses when rank unchanged', () => {
    const eid = createVetUnit(world, EntityKind.Brawler);
    const def = ENTITY_DEFS[EntityKind.Brawler];
    Combat.kills[eid] = 3;

    veterancySystem(world);
    const hpAfterFirst = Health.max[eid];
    const dmgAfterFirst = Combat.damage[eid];

    // Run again at next 60-frame tick with same kill count
    world.frameCount = 120;
    veterancySystem(world);

    expect(Health.max[eid]).toBe(hpAfterFirst);
    expect(Combat.damage[eid]).toBe(dmgAfterFirst);
  });

  it('should skip dead units', () => {
    const eid = createVetUnit(world);
    Combat.kills[eid] = 15;
    Health.current[eid] = 0; // Dead

    veterancySystem(world);

    expect(Veterancy.rank[eid]).toBe(0);
  });
});
