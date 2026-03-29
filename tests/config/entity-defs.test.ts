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
} from '@/config/entity-defs';
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

  it('player units should have food cost', () => {
    expect(ENTITY_DEFS[EntityKind.Gatherer].foodCost).toBe(1);
    expect(ENTITY_DEFS[EntityKind.Brawler].foodCost).toBe(1);
    expect(ENTITY_DEFS[EntityKind.Sniper].foodCost).toBe(1);
  });

  it('buildings should be marked as isBuilding', () => {
    const buildings = [
      EntityKind.Lodge,
      EntityKind.Burrow,
      EntityKind.Armory,
      EntityKind.Tower,
      EntityKind.PredatorNest,
      EntityKind.Watchtower,
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

  it('sniper should have longest attack range', () => {
    const sniper = ENTITY_DEFS[EntityKind.Sniper];
    const brawler = ENTITY_DEFS[EntityKind.Brawler];
    expect(sniper.attackRange).toBeGreaterThan(brawler.attackRange);
  });
});

describe('entityKindName', () => {
  it('should return correct names', () => {
    expect(entityKindName(EntityKind.Gatherer)).toBe('Gatherer');
    expect(entityKindName(EntityKind.PredatorNest)).toBe('Predator Nest');
  });
});

describe('entityKindFromString', () => {
  it('should convert string names to EntityKind', () => {
    expect(entityKindFromString('gatherer')).toBe(EntityKind.Gatherer);
    expect(entityKindFromString('predator_nest')).toBe(EntityKind.PredatorNest);
  });

  it('should throw for unknown entity kind string', () => {
    expect(() => entityKindFromString('unknown_entity')).toThrow('Unknown entity kind');
  });
});

describe('getDamageMultiplier', () => {
  it('should return 1.5 for strong matchups', () => {
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Sniper)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Healer)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Sniper, EntityKind.Healer)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Sniper, EntityKind.Snake)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Gator, EntityKind.Brawler)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Snake, EntityKind.Sniper)).toBe(1.5);
  });

  it('should return 0.75 for weak matchups', () => {
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Gator)).toBe(0.75);
    expect(getDamageMultiplier(EntityKind.Sniper, EntityKind.Brawler)).toBe(0.75);
    expect(getDamageMultiplier(EntityKind.Gator, EntityKind.Sniper)).toBe(0.75);
    expect(getDamageMultiplier(EntityKind.Snake, EntityKind.Brawler)).toBe(0.75);
  });

  it('should return 1.0 for neutral/unknown matchups', () => {
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Brawler)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.BossCroc, EntityKind.Brawler)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.BossCroc, EntityKind.Sniper)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.Gatherer, EntityKind.Gator)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.Healer, EntityKind.Brawler)).toBe(1.0);
    expect(getDamageMultiplier(EntityKind.Lodge, EntityKind.Brawler)).toBe(1.0);
  });

  it('should have expected counter triangle symmetry (A strong vs B implies B weak vs A)', () => {
    // Brawler strong vs Sniper, Sniper weak vs Brawler
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Sniper)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Sniper, EntityKind.Brawler)).toBe(0.75);

    // Gator strong vs Brawler, Brawler weak vs Gator
    expect(getDamageMultiplier(EntityKind.Gator, EntityKind.Brawler)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Brawler, EntityKind.Gator)).toBe(0.75);

    // Snake strong vs Sniper, Gator weak vs Sniper (enemy triangle)
    expect(getDamageMultiplier(EntityKind.Snake, EntityKind.Sniper)).toBe(1.5);
    expect(getDamageMultiplier(EntityKind.Gator, EntityKind.Sniper)).toBe(0.75);
  });

  it('should only contain multipliers for combat unit types', () => {
    const combatKinds = [EntityKind.Brawler, EntityKind.Sniper, EntityKind.Gator, EntityKind.Snake];
    for (const kind of Object.keys(DAMAGE_MULTIPLIERS)) {
      expect(combatKinds).toContain(Number(kind));
    }
  });
});
