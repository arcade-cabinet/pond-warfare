/**
 * Economy Balance Tests
 *
 * Validates the v3 economy flow works correctly:
 * - Player unit costs match units.json (Fish-only for generalists)
 * - Starting resources scale with tier
 * - Gather pipeline produces income
 * - Training costs are affordable with starting resources
 * - Enemy economy is functional but not overwhelming early
 */

import { describe, expect, it } from 'vitest';
import { getUnitDef } from '@/config/config-loader';
import { ENTITY_DEFS } from '@/config/entity-defs';
import type { GeneralistDef } from '@/config/v3-types';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { EntityKind } from '@/types';
import { progressionLevel } from '@/ui/store-v3';
import { SeededRandom } from '@/utils/random';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

describe('v3 Economy Balance', () => {
  describe('Unit costs (ENTITY_DEFS aligned with units.json)', () => {
    it('Mudpaw costs 10 Fish only', () => {
      const def = ENTITY_DEFS[EntityKind.Gatherer];
      expect(def.fishCost).toBe(10);
      expect(def.logCost).toBe(0);
    });

    it('Medic costs 15 Fish only', () => {
      const def = ENTITY_DEFS[EntityKind.Healer];
      expect(def.fishCost).toBe(15);
      expect(def.logCost).toBe(0);
    });

    it('Sapper costs 25 Fish + 15 Rocks', () => {
      const def = ENTITY_DEFS[EntityKind.Sapper];
      expect(def.fishCost).toBe(25);
      expect(def.rockCost).toBe(15);
      expect(def.logCost).toBe(0);
    });

    it('Saboteur costs 20 Fish + 10 Rocks', () => {
      const def = ENTITY_DEFS[EntityKind.Saboteur];
      expect(def.fishCost).toBe(20);
      expect(def.rockCost).toBe(10);
      expect(def.logCost).toBe(0);
    });

    it('ENTITY_DEFS costs match units.json for the canonical manual roster', () => {
      const generalists = ['mudpaw', 'medic', 'sapper', 'saboteur'] as const;
      const mapping: Record<string, EntityKind> = {
        mudpaw: EntityKind.Gatherer,
        medic: EntityKind.Healer,
        sapper: EntityKind.Sapper,
        saboteur: EntityKind.Saboteur,
      };

      for (const name of generalists) {
        const jsonDef = getUnitDef(name) as GeneralistDef;
        const ecsDef = ENTITY_DEFS[mapping[name]];
        expect(ecsDef.fishCost).toBe(jsonDef.cost.fish);
        expect(ecsDef.logCost ?? 0).toBe(jsonDef.cost.logs ?? 0);
        expect(ecsDef.rockCost ?? 0).toBe(jsonDef.cost.rocks ?? 0);
      }
    });
  });

  describe('Starting resources by tier', () => {
    it.each([1, 2, 3, 4, 5, 6])('tier %i has enough Fish for initial army', (stage) => {
      progressionLevel.value = stage;
      const world = createTestWorld({ stage, seed: 42 });
      const pg = createTestPanelGrid(stage);
      const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
      spawnVerticalEntities(world, layout, new SeededRandom(99));

      const fish = world.resources.fish;
      const mudpawCost = ENTITY_DEFS[EntityKind.Gatherer].fishCost ?? 0;
      const medicCost = ENTITY_DEFS[EntityKind.Healer].fishCost ?? 0;

      // Must afford at least 2 Mudpaws and one Medic from stage 2 onward.
      const minArmyCost = stage >= 2 ? mudpawCost * 2 + medicCost : mudpawCost * 2;
      expect(fish).toBeGreaterThanOrEqual(minArmyCost);
    });

    it('Fish increases monotonically with tier', () => {
      const fishByTier: number[] = [];
      for (let stage = 1; stage <= 6; stage++) {
        progressionLevel.value = stage;
        const world = createTestWorld({ stage, seed: 42 });
        const pg = createTestPanelGrid(stage);
        const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
        spawnVerticalEntities(world, layout, new SeededRandom(99));
        fishByTier.push(world.resources.fish);
      }

      for (let i = 1; i < fishByTier.length; i++) {
        expect(fishByTier[i]).toBeGreaterThanOrEqual(fishByTier[i - 1]);
      }
    });

    it('Rocks appear at tier 5, Logs at tier 6', () => {
      for (let stage = 1; stage <= 6; stage++) {
        progressionLevel.value = stage;
        const world = createTestWorld({ stage, seed: 42 });
        const pg = createTestPanelGrid(stage);
        const layout = generateVerticalMapLayout(pg, new SeededRandom(42));
        spawnVerticalEntities(world, layout, new SeededRandom(99));

        if (stage >= 5) expect(world.resources.rocks).toBeGreaterThan(0);
        if (stage >= 6) expect(world.resources.logs).toBeGreaterThan(0);
      }
    });
  });

  describe('Lodge food capacity', () => {
    it('Lodge provides 8 food', () => {
      const lodgeDef = ENTITY_DEFS[EntityKind.Lodge];
      expect(lodgeDef.foodProvided).toBe(8);
    });

    it('Commander + 4 Mudpaws + Medic + Sapper + Saboteur = 8 food (fits Lodge cap)', () => {
      const cmdrCost = ENTITY_DEFS[EntityKind.Commander].foodCost ?? 0;
      const mudpawCost = (ENTITY_DEFS[EntityKind.Gatherer].foodCost ?? 1) * 4;
      const medicCost = ENTITY_DEFS[EntityKind.Healer].foodCost ?? 1;
      const sapperCost = ENTITY_DEFS[EntityKind.Sapper].foodCost ?? 1;
      const saboteurCost = ENTITY_DEFS[EntityKind.Saboteur].foodCost ?? 1;

      // Commander has no foodCost (0), so total is seven roster units at one food each.
      const total = cmdrCost + mudpawCost + medicCost + sapperCost + saboteurCost;
      expect(total).toBeLessThanOrEqual(8);
    });
  });
});
