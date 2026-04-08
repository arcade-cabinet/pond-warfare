/**
 * Entity Definitions Tests
 *
 * Validates that all entity definitions have valid, consistent values.
 * Catches balance regressions and data integrity issues.
 */

import { describe, expect, it } from 'vitest';
import {
  DAMAGE_MULTIPLIERS,
  ENTITY_DEFS,
  entityKindFromString,
  entityKindName,
  getDamageMultiplier,
  isWingBuilding,
} from '@/config/entity-defs';
import {
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { EntityKind } from '@/types';

describe('ENTITY_DEFS', () => {
  it('should have a definition for every EntityKind', () => {
    const kinds = Object.values(EntityKind).filter((v): v is EntityKind => typeof v === 'number');
    for (const kind of kinds) {
      expect(ENTITY_DEFS[kind]).toBeDefined();
    }
  });

  it('should have positive HP for all entities', () => {
    for (const [, def] of Object.entries(ENTITY_DEFS)) {
      expect(def.hp).toBeGreaterThan(0);
    }
  });

  it('should have non-negative speed for all entities', () => {
    for (const [, def] of Object.entries(ENTITY_DEFS)) {
      expect(def.speed).toBeGreaterThanOrEqual(0);
    }
  });

  it('should have valid sprite sizes (16 or 32)', () => {
    for (const [, def] of Object.entries(ENTITY_DEFS)) {
      expect([16, 32]).toContain(def.spriteSize);
    }
  });

  it('should have positive sprite scale', () => {
    for (const [, def] of Object.entries(ENTITY_DEFS)) {
      expect(def.spriteScale).toBeGreaterThan(0);
    }
  });

  it('live manual player roster should have food cost', () => {
    expect(ENTITY_DEFS[MUDPAW_KIND].foodCost).toBe(1);
    expect(ENTITY_DEFS[MEDIC_KIND].foodCost).toBe(1);
    expect(ENTITY_DEFS[SAPPER_KIND].foodCost).toBe(1);
    expect(ENTITY_DEFS[SABOTEUR_KIND].foodCost).toBe(1);
  });

  it('buildings should be marked as isBuilding', () => {
    const buildings = [
      EntityKind.Lodge,
      EntityKind.Burrow,
      EntityKind.Armory,
      EntityKind.Tower,
      EntityKind.PredatorNest,
      EntityKind.Watchtower,
      EntityKind.Wall,
      EntityKind.LookoutPost,
    ];
    for (const kind of buildings) {
      expect(ENTITY_DEFS[kind].isBuilding).toBe(true);
    }
  });

  it('resources should be marked as isResource', () => {
    expect(ENTITY_DEFS[EntityKind.Cattail].isResource).toBe(true);
    expect(ENTITY_DEFS[EntityKind.Clambed].isResource).toBe(true);
  });

  it('tower should have damage and attack range', () => {
    const tower = ENTITY_DEFS[EntityKind.Tower];
    expect(tower.damage).toBe(10);
    expect(tower.attackRange).toBe(200);
  });

  it('reserved alias ids mirror the live Sapper and Saboteur defs', () => {
    expect(ENTITY_DEFS[EntityKind.CompatSapperChassis]).toEqual(ENTITY_DEFS[SAPPER_KIND]);
    expect(ENTITY_DEFS[EntityKind.CompatSaboteurChassis]).toEqual(ENTITY_DEFS[SABOTEUR_KIND]);
  });
});

describe('isWingBuilding', () => {
  it('should return true for Lodge wing buildings', () => {
    expect(isWingBuilding(EntityKind.Armory)).toBe(true);
    expect(isWingBuilding(EntityKind.Burrow)).toBe(true);
    expect(isWingBuilding(EntityKind.FishingHut)).toBe(true);
    expect(isWingBuilding(EntityKind.HerbalistHut)).toBe(true);
    expect(isWingBuilding(EntityKind.Market)).toBe(true);
    expect(isWingBuilding(EntityKind.Dock)).toBe(true);
  });

  it('should return false for standalone buildings', () => {
    expect(isWingBuilding(EntityKind.Lodge)).toBe(false);
    expect(isWingBuilding(EntityKind.Tower)).toBe(false);
    expect(isWingBuilding(EntityKind.Watchtower)).toBe(false);
    expect(isWingBuilding(EntityKind.Wall)).toBe(false);
    expect(isWingBuilding(EntityKind.LookoutPost)).toBe(false);
    expect(isWingBuilding(EntityKind.PredatorNest)).toBe(false);
  });

  it('should return false for non-building entities', () => {
    expect(isWingBuilding(MUDPAW_KIND)).toBe(false);
    expect(isWingBuilding(SAPPER_KIND)).toBe(false);
    expect(isWingBuilding(EntityKind.Gator)).toBe(false);
    expect(isWingBuilding(EntityKind.Cattail)).toBe(false);
  });
});

describe('entityKindName', () => {
  it('should return correct names', () => {
    expect(entityKindName(MUDPAW_KIND)).toBe('Mudpaw');
    expect(entityKindName(MEDIC_KIND)).toBe('Medic');
    expect(entityKindName(LOOKOUT_KIND)).toBe('Lookout');
    expect(entityKindName(EntityKind.PredatorNest)).toBe('Predator Nest');
  });
});

describe('entityKindFromString', () => {
  it('should convert string names to EntityKind', () => {
    expect(entityKindFromString('mudpaw')).toBe(MUDPAW_KIND);
    expect(entityKindFromString('fisher')).toBe(MUDPAW_KIND);
    expect(entityKindFromString('logger')).toBe(MUDPAW_KIND);
    expect(entityKindFromString('digger')).toBe(MUDPAW_KIND);
    expect(entityKindFromString('medic')).toBe(MEDIC_KIND);
    expect(entityKindFromString('lookout')).toBe(LOOKOUT_KIND);
    expect(entityKindFromString('guard')).toBe(SAPPER_KIND);
    expect(entityKindFromString('ranger')).toBe(SABOTEUR_KIND);
    expect(entityKindFromString('bombardier')).toBe(SAPPER_KIND);
    expect(entityKindFromString('predator_nest')).toBe(EntityKind.PredatorNest);
  });

  it('should throw for unknown entity kind string', () => {
    expect(() => entityKindFromString('unknown_entity')).toThrow('Unknown entity kind');
  });
});

describe('getDamageMultiplier', () => {
  it('should return 1.5 for strong matchups', () => {
    expect(getDamageMultiplier(EntityKind.BurrowingWorm, MUDPAW_KIND)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.FlyingHeron, MUDPAW_KIND)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Tower, EntityKind.FlyingHeron)).toBe(1.5);
  });

  it('should return 0.75 for weak matchups', () => {
    expect(getDamageMultiplier(EntityKind.Shieldbearer, EntityKind.Gator)).toBe(0.75);
    expect(getDamageMultiplier(EntityKind.Diver, EntityKind.Shieldbearer)).toBe(0.75);
    expect(getDamageMultiplier(EntityKind.FlyingHeron, EntityKind.Shieldbearer)).toBe(0.5);
  });

  it('should return 1.0 for neutral/unknown matchups', () => {
    expect(getDamageMultiplier(SAPPER_KIND, SABOTEUR_KIND)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.BossCroc, SAPPER_KIND)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.BossCroc, SABOTEUR_KIND)).toBe(1.0);
    expect(getDamageMultiplier(MUDPAW_KIND, EntityKind.Gator)).toBe(1.0);
    expect(getDamageMultiplier(MEDIC_KIND, SAPPER_KIND)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.Lodge, SAPPER_KIND)).toBe(1.0);
  });

  it('reserved alias ids now fall back to neutral damage behavior', () => {
    expect(getDamageMultiplier(EntityKind.CompatSapperChassis, EntityKind.Gator)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.CompatSaboteurChassis, EntityKind.Snake)).toBe(1.0);
  });

  it('should only contain multipliers for entities with damage', () => {
    // Damage multiplier keys should be entities that deal damage (units or towers)
    const damageDealers = Object.keys(ENTITY_DEFS)
      .map(Number)
      .filter((k) => {
        const def = ENTITY_DEFS[k as EntityKind];
        return def && !def.isResource && def.damage > 0;
      });
    for (const kind of Object.keys(DAMAGE_MULTIPLIERS)) {
      expect(damageDealers).toContain(Number(kind));
    }
  });
});
