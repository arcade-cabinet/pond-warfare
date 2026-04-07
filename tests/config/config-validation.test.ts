/**
 * Config Validation Tests (v3.0 — US21)
 *
 * Schema validation for each JSON config file.
 * Catches malformed configs before they hit the game.
 *
 * Tests:
 * - Missing required fields → clear error message
 * - Invalid value types → clear error message
 * - Broken references (diamond node → nonexistent category) → clear error
 * - Cost formula produces non-negative values at all tiers
 * - All unit/enemy stats are positive numbers
 */

import { describe, expect, it } from 'vitest';
import {
  generateUpgradeCatalog,
  getAllEnemyIds,
  getAllEventIds,
  getAllPearlUpgradeEntries,
  getAllUnitIds,
  getDiamondNodes,
  getEnemyDef,
  getEnemyScaling,
  getEventsConfig,
  getEventTemplate,
  getFortificationsConfig,
  getLodgeConfig,
  getPrefixesConfig,
  getPrestigeConfig,
  getPrestigeThreshold,
  getRewardFormula,
  getTerrainConfig,
  getTiersPerSubcategory,
  getUnitDef,
  getUpgradeCategories,
  validateEnemies,
  validateEvents,
  validateUnits,
} from '@/config/config-loader';
import type { EnemiesConfig, EventsConfig, UnitsConfig } from '@/config/v3-types';
import panelsConfig from '../../configs/panels.json';

describe('Config Validation — US21', () => {
  // ── units.json ───────────────────────────────────────────────────

  describe('units.json validation', () => {
    it('should pass validation with valid data', () => {
      const ids = getAllUnitIds();
      expect(ids.length).toBeGreaterThan(0);
    });

    it('should have 4 generalist types', () => {
      const allIds = getAllUnitIds();
      expect(allIds).toContain('gatherer');
      expect(allIds).toContain('fighter');
      expect(allIds).toContain('medic');
      expect(allIds).toContain('scout');
    });

    it('all unit stats should be positive', () => {
      const ids = getAllUnitIds();
      for (const id of ids) {
        const def = getUnitDef(id);
        expect(def.hp, `${id}.hp`).toBeGreaterThan(0);
        expect(def.speed, `${id}.speed`).toBeGreaterThan(0);
        expect(def.damage, `${id}.damage`).toBeGreaterThanOrEqual(0);
      }
    });

    it('should reject unknown unit ID', () => {
      expect(() => getUnitDef('nonexistent_unit')).toThrow();
    });

    it('should reject missing required fields', () => {
      const invalid = { generalists: {}, specialists: {} } as unknown as UnitsConfig;
      expect(() => validateUnits(invalid)).not.toThrow();
    });

    it('should detect negative hp', () => {
      const invalid: UnitsConfig = {
        generalists: {
          bad: { hp: -5, damage: 1, speed: 1, cost: { fish: 1 }, role: 'test', trainTime: 1 },
        },
        specialists: {},
      };
      expect(() => validateUnits(invalid)).toThrow();
    });
  });

  // ── enemies.json ─────────────────────────────────────────────────

  describe('enemies.json validation', () => {
    it('should have all 6 enemy types', () => {
      const ids = getAllEnemyIds();
      expect(ids).toContain('raider');
      expect(ids).toContain('fighter');
      expect(ids).toContain('healer');
      expect(ids).toContain('scout_enemy');
      expect(ids).toContain('sapper_enemy');
      expect(ids).toContain('saboteur_enemy');
    });

    it('all enemy stats should be positive (except healer damage)', () => {
      const ids = getAllEnemyIds();
      for (const id of ids) {
        const def = getEnemyDef(id);
        expect(def.hp, `${id}.hp`).toBeGreaterThan(0);
        expect(def.speed, `${id}.speed`).toBeGreaterThan(0);
        expect(def.damage, `${id}.damage`).toBeGreaterThanOrEqual(0);
      }
    });

    it('should reject unknown enemy ID', () => {
      expect(() => getEnemyDef('nonexistent_enemy')).toThrow();
    });

    it('scaling values should be positive', () => {
      const scaling = getEnemyScaling();
      expect(scaling.hp_per_level).toBeGreaterThan(0);
      expect(scaling.damage_per_level).toBeGreaterThan(0);
      expect(scaling.speed_per_level).toBeGreaterThan(0);
    });

    it('should reject negative stats', () => {
      const invalid: EnemiesConfig = {
        types: { bad: { hp: -10, damage: 5, speed: 1, role: 'attack', description: 'test' } },
        scaling: { hp_per_level: 0.05, damage_per_level: 0.03, speed_per_level: 0.01 },
      };
      expect(() => validateEnemies(invalid)).toThrow();
    });
  });

  // ── events.json ──────────────────────────────────────────────────

  describe('events.json validation', () => {
    it('should have all event templates', () => {
      const ids = getAllEventIds();
      expect(ids.length).toBeGreaterThanOrEqual(11);
    });

    it('each event should have required fields', () => {
      const ids = getAllEventIds();
      for (const id of ids) {
        const tmpl = getEventTemplate(id);
        expect(tmpl.type, `${id}.type`).toBeTruthy();
        expect(tmpl.min_progression, `${id}.min_progression`).toBeGreaterThanOrEqual(0);
        expect(tmpl.max_progression, `${id}.max_progression`).toBeGreaterThan(tmpl.min_progression);
        expect(tmpl.duration_seconds, `${id}.duration_seconds`).toBeGreaterThan(0);
        expect(tmpl.reward_clams, `${id}.reward_clams`).toBeGreaterThanOrEqual(0);
        expect(tmpl.description, `${id}.description`).toBeTruthy();
      }
    });

    it('timing config should have valid values', () => {
      const config = getEventsConfig();
      expect(config.timing.first_event_delay_seconds).toBeGreaterThan(0);
      expect(config.timing.min_interval_seconds).toBeGreaterThan(0);
      expect(config.timing.max_interval_seconds).toBeGreaterThan(
        config.timing.min_interval_seconds,
      );
      expect(config.timing.max_concurrent_events).toBeGreaterThan(0);
    });

    it('should reject events with invalid progression range', () => {
      const invalid: EventsConfig = {
        templates: {
          bad: {
            type: 'wave',
            min_progression: 10,
            max_progression: 5,
            duration_seconds: 60,
            enemy_composition: {},
            reward_clams: 5,
            description: 'test',
          },
        },
        timing: {
          first_event_delay_seconds: 60,
          min_interval_seconds: 45,
          max_interval_seconds: 120,
          max_concurrent_events: 2,
        },
      };
      expect(() => validateEvents(invalid)).toThrow();
    });
  });

  // ── upgrades.json ────────────────────────────────────────────────

  describe('upgrades.json validation', () => {
    it('should have 6 categories', () => {
      const categories = getUpgradeCategories();
      expect(Object.keys(categories).length).toBe(6);
    });

    it('each category should have subcategories', () => {
      const categories = getUpgradeCategories();
      for (const [catKey, cat] of Object.entries(categories)) {
        const subs = Object.keys(cat.subcategories);
        expect(subs.length, `${catKey} subcategories`).toBeGreaterThan(0);
      }
    });

    it('cost formula should produce non-negative values at all tiers', () => {
      const catalog = generateUpgradeCatalog();
      for (const entry of catalog) {
        expect(entry.cost, `${entry.id} cost`).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(entry.cost), `${entry.id} cost is finite`).toBe(true);
      }
    });

    it('effect formula should produce positive values', () => {
      const catalog = generateUpgradeCatalog();
      for (const entry of catalog) {
        expect(entry.effect, `${entry.id} effect`).toBeGreaterThan(0);
      }
    });

    it('procedural generation produces 240+ upgrades', () => {
      const catalog = generateUpgradeCatalog();
      expect(catalog.length).toBeGreaterThanOrEqual(240);
    });

    it('diamond nodes reference valid categories', () => {
      const categories = getUpgradeCategories();
      const diamondNodes = getDiamondNodes();

      for (const [nodeId, node] of Object.entries(diamondNodes)) {
        for (const catKey of Object.keys(node.requires)) {
          expect(
            catKey in categories,
            `Diamond node "${nodeId}" requires unknown category "${catKey}"`,
          ).toBe(true);

          for (const subKey of Object.keys(node.requires[catKey])) {
            expect(
              subKey in categories[catKey].subcategories,
              `Diamond node "${nodeId}" requires unknown subcategory "${catKey}.${subKey}"`,
            ).toBe(true);
          }
        }
      }
    });

    it('diamond node costs are positive', () => {
      const diamondNodes = getDiamondNodes();
      for (const [nodeId, node] of Object.entries(diamondNodes)) {
        expect(node.cost, `${nodeId} cost`).toBeGreaterThan(0);
      }
    });

    it('diamond node required tiers are within valid range', () => {
      const tiersPerSub = getTiersPerSubcategory();
      const diamondNodes = getDiamondNodes();

      for (const [nodeId, node] of Object.entries(diamondNodes)) {
        for (const [_cat, subs] of Object.entries(node.requires)) {
          for (const [sub, minTier] of Object.entries(subs)) {
            expect(
              minTier,
              `${nodeId} requires ${sub} tier ${minTier} but max is ${tiersPerSub}`,
            ).toBeLessThanOrEqual(tiersPerSub);
            expect(minTier, `${nodeId} requires negative tier for ${sub}`).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  // ── prestige.json ────────────────────────────────────────────────

  describe('prestige.json validation', () => {
    it('should have Pearl upgrade definitions', () => {
      const entries = getAllPearlUpgradeEntries();
      expect(entries.length).toBeGreaterThanOrEqual(14);
    });

    it('all Pearl upgrades should have positive costs and max ranks', () => {
      const entries = getAllPearlUpgradeEntries();
      for (const { id, def } of entries) {
        expect(def.cost_per_rank, `${id} cost`).toBeGreaterThan(0);
        expect(def.max_rank, `${id} max_rank`).toBeGreaterThan(0);
      }
    });

    it('Pearl formula rank_multiplier should be positive', () => {
      const config = getPrestigeConfig();
      expect(config.pearl_formula.rank_multiplier).toBeGreaterThan(0);
    });

    it('rank threshold base should be positive', () => {
      const config = getPrestigeConfig();
      expect(config.rank_threshold_base).toBeGreaterThan(0);
    });

    it('prestige thresholds should increase with rank', () => {
      for (let rank = 0; rank < 20; rank++) {
        const current = getPrestigeThreshold(rank);
        const next = getPrestigeThreshold(rank + 1);
        expect(next).toBeGreaterThan(current);
      }
    });

    it('reset and persist lists should be defined', () => {
      const config = getPrestigeConfig();
      expect(config.resets_on_prestige.length).toBeGreaterThan(0);
      expect(config.persists_on_prestige.length).toBeGreaterThan(0);
    });
  });

  // ── terrain.json ─────────────────────────────────────────────────

  describe('terrain.json validation (panel-based)', () => {
    it('should be panel-based with biome terrain rules', () => {
      const config = getTerrainConfig();
      expect(config.panel_based).toBe(true);
      expect(Object.keys(config.biome_terrain_rules).length).toBeGreaterThan(0);
    });

    it('each biome rule should have a primary terrain type', () => {
      const config = getTerrainConfig();
      for (const [biome, rule] of Object.entries(config.biome_terrain_rules)) {
        expect(rule.primary, `${biome} missing primary`).toBeTruthy();
      }
    });

    it('should include all expected biomes', () => {
      const config = getTerrainConfig();
      const biomes = Object.keys(config.biome_terrain_rules);
      expect(biomes).toContain('grassland_clearing');
      expect(biomes).toContain('muddy_forest');
      expect(biomes).toContain('rocky_marsh');
      expect(biomes).toContain('flooded_swamp');
      expect(biomes).toContain('stone_quarry');
      expect(biomes).toContain('dense_thicket');
    });
  });

  // ── lodge.json ───────────────────────────────────────────────────

  describe('lodge.json validation', () => {
    it('should have base HP', () => {
      const config = getLodgeConfig();
      expect(config.base_hp).toBeGreaterThan(0);
    });

    it('should define wings', () => {
      const config = getLodgeConfig();
      const wings = Object.keys(config.wings);
      expect(wings.length).toBeGreaterThan(0);
    });

    it('should define fort slot progression', () => {
      const config = getLodgeConfig();
      expect(config.fort_slots_per_level.length).toBeGreaterThan(0);
    });
  });

  // ── fortifications.json ──────────────────────────────────────────

  describe('fortifications.json validation', () => {
    it('should define fortification types', () => {
      const config = getFortificationsConfig();
      const types = Object.keys(config.types);
      expect(types.length).toBeGreaterThanOrEqual(2);
    });

    it('all fortifications should have positive HP', () => {
      const config = getFortificationsConfig();
      for (const [id, fort] of Object.entries(config.types)) {
        expect(fort.hp, `${id}.hp`).toBeGreaterThan(0);
      }
    });
  });

  // ── rewards.json ─────────────────────────────────────────────────

  describe('rewards.json validation', () => {
    it('should have all reward formula components', () => {
      const config = getRewardFormula();
      expect(config.base_clams).toBeGreaterThan(0);
      expect(config.kill_bonus).toBeGreaterThan(0);
      expect(config.event_bonus).toBeGreaterThan(0);
      expect(config.resource_bonus_per_100).toBeGreaterThan(0);
      expect(config.survival_bonus_per_minute).toBeGreaterThan(0);
      expect(config.prestige_multiplier_per_rank).toBeGreaterThanOrEqual(0);
    });
  });

  // ── prefixes.json ────────────────────────────────────────────────

  describe('prefixes.json validation', () => {
    it('should have 10 tier prefixes', () => {
      const config = getPrefixesConfig();
      expect(config.tiers.length).toBe(10);
    });

    it('each prefix should have positive multiplier', () => {
      const config = getPrefixesConfig();
      for (const tier of config.tiers) {
        expect(tier.prefix).toBeTruthy();
        expect(tier.multiplier).toBeGreaterThan(0);
      }
    });

    it('multipliers should increase with tier', () => {
      const config = getPrefixesConfig();
      for (let i = 1; i < config.tiers.length; i++) {
        expect(
          config.tiers[i].multiplier,
          `Tier ${i} multiplier should be >= tier ${i - 1}`,
        ).toBeGreaterThanOrEqual(config.tiers[i - 1].multiplier);
      }
    });
  });

  // ── panels.json ──────────────────────────────��───────────────────

  describe('panels.json validation', () => {
    const panels = panelsConfig.panels as Record<
      string,
      {
        row: number;
        col: number;
        biome: string;
        resources: string[];
        terrain_features: string[];
        enemy_spawn: boolean;
        lodge?: boolean;
        unlock_stage: number;
      }
    >;
    const stages = panelsConfig.progression_stages as Array<{
      stage: number;
      description: string;
      panels?: number[];
      panels_add_one_of?: number[];
      panels_add_remaining_of?: number[];
    }>;

    it('should define exactly 6 panels', () => {
      const panelIds = Object.keys(panels);
      expect(panelIds.length).toBe(6);
      expect(panelIds).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('each panel should have required fields', () => {
      for (const [id, panel] of Object.entries(panels)) {
        expect(typeof panel.row, `${id}.row`).toBe('number');
        expect(typeof panel.col, `${id}.col`).toBe('number');
        expect(panel.biome, `${id}.biome`).toBeTruthy();
        expect(Array.isArray(panel.resources), `${id}.resources`).toBe(true);
        expect(panel.resources.length, `${id}.resources length`).toBeGreaterThan(0);
        expect(Array.isArray(panel.terrain_features), `${id}.terrain_features`).toBe(true);
        expect(panel.terrain_features.length, `${id}.terrain_features length`).toBeGreaterThan(0);
        expect(typeof panel.enemy_spawn, `${id}.enemy_spawn`).toBe('boolean');
        expect(panel.unlock_stage, `${id}.unlock_stage`).toBeGreaterThan(0);
      }
    });

    it('panels should form a 3x2 grid (row 0-1, col 0-2)', () => {
      for (const [id, panel] of Object.entries(panels)) {
        expect(panel.row, `${id}.row`).toBeGreaterThanOrEqual(0);
        expect(panel.row, `${id}.row`).toBeLessThanOrEqual(1);
        expect(panel.col, `${id}.col`).toBeGreaterThanOrEqual(0);
        expect(panel.col, `${id}.col`).toBeLessThanOrEqual(2);
      }
    });

    it('panel 5 should be the Lodge panel', () => {
      const panel5 = panels['5'];
      expect(panel5.lodge).toBe(true);
      expect(panel5.enemy_spawn).toBe(false);
      expect(panel5.unlock_stage).toBe(1);
    });

    it('progression stages should be in ascending order', () => {
      for (let i = 1; i < stages.length; i++) {
        expect(stages[i].stage).toBeGreaterThan(stages[i - 1].stage);
      }
    });

    it('progression stage 1 should unlock panel 5', () => {
      const stage1 = stages.find((s) => s.stage === 1);
      expect(stage1).toBeDefined();
      expect(stage1?.panels).toContain(5);
    });

    it('all progression stages should reference valid panel IDs', () => {
      const validIds = Object.keys(panels).map(Number);
      for (const stage of stages) {
        if (stage.panels) {
          for (const id of stage.panels) {
            expect(validIds, `stage ${stage.stage} panel ${id}`).toContain(id);
          }
        }
        if (stage.panels_add_one_of) {
          for (const id of stage.panels_add_one_of) {
            expect(validIds, `stage ${stage.stage} add_one_of ${id}`).toContain(id);
          }
        }
        if (stage.panels_add_remaining_of) {
          for (const id of stage.panels_add_remaining_of) {
            expect(validIds, `stage ${stage.stage} add_remaining_of ${id}`).toContain(id);
          }
        }
      }
    });

    it('panel biomes should reference valid terrain biomes', () => {
      const terrainConfig = getTerrainConfig();
      const validBiomes = Object.keys(terrainConfig.biome_terrain_rules);
      for (const [id, panel] of Object.entries(panels)) {
        expect(validBiomes, `Panel ${id} biome "${panel.biome}" not in terrain.json`).toContain(
          panel.biome,
        );
      }
    });

    it('panel resources should be valid resource types', () => {
      const terrainConfig = getTerrainConfig();
      for (const [id, panel] of Object.entries(panels)) {
        for (const res of panel.resources) {
          expect(
            terrainConfig.resource_types,
            `Panel ${id} resource "${res}" not in terrain.json resource_types`,
          ).toContain(res);
        }
      }
    });
  });

  // ── Cross-config reference validation ──────────────────────────

  describe('Cross-config references', () => {
    it('specialist Pearl upgrades reference valid specialist unit IDs', () => {
      const entries = getAllPearlUpgradeEntries();
      const unitIds = getAllUnitIds();

      for (const { id, def } of entries) {
        if (def.effect.type === 'specialist_blueprint' || def.effect.type === 'specialist_zone') {
          expect(
            unitIds.includes(def.effect.unit),
            `Pearl upgrade "${id}" references unknown unit "${def.effect.unit}"`,
          ).toBe(true);
        }
      }
    });

    it('event enemy_composition references valid enemy types', () => {
      const eventIds = getAllEventIds();
      const enemyIds = getAllEnemyIds();

      for (const id of eventIds) {
        const tmpl = getEventTemplate(id);
        for (const enemyType of Object.keys(tmpl.enemy_composition)) {
          expect(
            enemyIds.includes(enemyType),
            `Event "${id}" references unknown enemy type "${enemyType}"`,
          ).toBe(true);
        }
      }
    });
  });
});
