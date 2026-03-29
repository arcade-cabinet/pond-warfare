/**
 * Entity Definitions Tests
 *
 * Validates that all entity definitions have valid, consistent values.
 * Catches balance regressions and data integrity issues.
 */

import { describe, expect, it } from 'vitest';
import { ENTITY_DEFS, entityKindFromString, entityKindName } from '@/config/entity-defs';
import { EntityKind } from '@/types';

describe('ENTITY_DEFS', () => {
  it('should have a definition for every EntityKind', () => {
    // Hardcoded list required because const enums are erased at compile time
    // and cannot be iterated with Object.values()
    const kinds = [
      EntityKind.Gatherer,
      EntityKind.Brawler,
      EntityKind.Sniper,
      EntityKind.Gator,
      EntityKind.Snake,
      EntityKind.Lodge,
      EntityKind.Burrow,
      EntityKind.Armory,
      EntityKind.Tower,
      EntityKind.PredatorNest,
      EntityKind.Cattail,
      EntityKind.Clambed,
    ];
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
});
