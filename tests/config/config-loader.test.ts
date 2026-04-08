/** v3 Config Loader Tests — validates JSON configs, accessors, and validation. */

import { describe, expect, it } from 'vitest';
import {
  getAllEnemyIds,
  getAllUnitIds,
  getBiomeTerrainRule,
  getBiomeTerrainRules,
  getEnemyDef,
  getEnemyScaling,
  getFortDef,
  getFortificationsConfig,
  getLodgeConfig,
  getPrefixesConfig,
  getRewardFormula,
  getTerrainConfig,
  getTierPrefix,
  getUnitDef,
  validateEnemies,
  validateFortifications,
  validateLodge,
  validatePrefixes,
  validateRewards,
  validateTerrain,
  validateUnits,
} from '@/config/config-loader';
import type {
  EnemiesConfig,
  FortificationsConfig,
  GeneralistDef,
  LodgeConfig,
  PrefixesConfig,
  RewardsConfig,
  SpecialistDef,
  TerrainConfig,
  UnitsConfig,
} from '@/config/v3-types';

describe('Unit configs', () => {
  const generalistIds = ['mudpaw', 'medic', 'sapper', 'saboteur'];
  const specialistIds = [
    'fisher',
    'digger',
    'logger',
    'guard',
    'ranger',
    'shaman',
    'lookout',
    'bombardier',
  ];

  it('should load all generalists with required fields', () => {
    for (const id of generalistIds) {
      const def = getUnitDef(id) as GeneralistDef;
      expect(def.hp).toBeGreaterThan(0);
      expect(def.speed).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThanOrEqual(0);
      expect(def.cost).toBeDefined();
      expect(def.role).toBeTruthy();
      expect(def.trainTime).toBeGreaterThan(0);
    }
  });

  it('should load all specialists with required fields', () => {
    for (const id of specialistIds) {
      const def = getUnitDef(id) as SpecialistDef;
      expect(def.hp).toBeGreaterThan(0);
      expect(def.speed).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThanOrEqual(0);
      expect(def.cost).toBeDefined();
      expect(def.role).toBeTruthy();
      expect(def.autoTarget).toBeTruthy();
    }
  });

  it('should list all unit IDs', () => {
    const ids = getAllUnitIds();
    expect(ids).toEqual(expect.arrayContaining(generalistIds));
    expect(ids).toEqual(expect.arrayContaining(specialistIds));
      expect(ids.length).toBe(generalistIds.length + specialistIds.length);
  });

  it('should throw for unknown unit ID', () => {
    expect(() => getUnitDef('nonexistent')).toThrow('Unknown unit');
  });
});

describe('Enemy configs', () => {
  const enemyIds = [
    'raider',
    'fighter',
    'support_enemy',
    'recon_enemy',
    'sapper_enemy',
    'saboteur_enemy',
  ];

  it('should load all enemy types with required fields', () => {
    for (const id of enemyIds) {
      const def = getEnemyDef(id);
      expect(def.hp).toBeGreaterThan(0);
      expect(def.speed).toBeGreaterThan(0);
      expect(def.damage).toBeGreaterThanOrEqual(0);
      expect(def.role).toBeTruthy();
      expect(def.description).toBeTruthy();
    }
  });

  it('should list all enemy IDs', () => {
    const ids = getAllEnemyIds();
    expect(ids).toEqual(expect.arrayContaining(enemyIds));
    expect(ids.length).toBe(enemyIds.length);
  });

  it('should have valid scaling values', () => {
    const scaling = getEnemyScaling();
    expect(scaling.hp_per_level).toBeGreaterThanOrEqual(0);
    expect(scaling.damage_per_level).toBeGreaterThanOrEqual(0);
    expect(scaling.speed_per_level).toBeGreaterThanOrEqual(0);
  });

  it('should throw for unknown enemy ID', () => {
    expect(() => getEnemyDef('nonexistent')).toThrow('Unknown enemy');
  });
});

describe('Terrain configs (panel-based)', () => {
  it('should be panel-based with biome terrain rules', () => {
    const config = getTerrainConfig();
    expect(config.panel_based).toBe(true);
    expect(Object.keys(config.biome_terrain_rules).length).toBeGreaterThan(0);
  });

  it('should have rules for all 6 panel biomes', () => {
    const rules = getBiomeTerrainRules();
    const expectedBiomes = [
      'grassland_clearing',
      'muddy_forest',
      'rocky_marsh',
      'flooded_swamp',
      'stone_quarry',
      'dense_thicket',
    ];
    for (const biome of expectedBiomes) {
      expect(rules[biome], `missing biome rule: ${biome}`).toBeDefined();
      expect(rules[biome].primary).toBeTruthy();
    }
  });

  it('should retrieve a single biome rule by name', () => {
    const rule = getBiomeTerrainRule('grassland_clearing');
    expect(rule.primary).toBe('grass');
    expect(rule.water_coverage).toBe(0.15);
  });

  it('should throw for unknown biome', () => {
    expect(() => getBiomeTerrainRule('nonexistent')).toThrow('Unknown biome');
  });

  it('should have resource and terrain type lists', () => {
    const config = getTerrainConfig();
    expect(config.resource_types).toContain('fish_node');
    expect(config.resource_types).toContain('rock_deposit');
    expect(config.resource_types).toContain('tree_cluster');
    expect(config.resource_types).toContain('rare_node');
    expect(config.terrain_types).toContain('thorn_wall');
    expect(config.terrain_types.length).toBeGreaterThan(0);
  });
});

describe('Fortification configs', () => {
  it('should have positive HP and costs for all types', () => {
    const config = getFortificationsConfig();
    for (const [id, def] of Object.entries(config.types)) {
      expect(def.hp, `${id}.hp`).toBeGreaterThan(0);
      expect(def.cost, `${id}.cost`).toBeDefined();
      expect(Object.keys(def.cost).length, `${id} cost keys`).toBeGreaterThan(0);
    }
  });

  it('should load specific fort by ID', () => {
    const wall = getFortDef('wood_wall');
    expect(wall.hp).toBe(100);
    expect(wall.blocks_movement).toBe(true);

    const tower = getFortDef('watchtower');
    expect(tower.damage).toBe(5);
    expect(tower.range).toBe(200);
  });

  it('should throw for unknown fort ID', () => {
    expect(() => getFortDef('nonexistent')).toThrow('Unknown fortification');
  });
});

describe('Lodge configs', () => {
  it('should have base HP, wings with required fields, and ascending fort slots', () => {
    const config = getLodgeConfig();
    expect(config.base_hp).toBeGreaterThan(0);
    expect(Object.keys(config.wings).length).toBeGreaterThan(0);
    for (const [id, wing] of Object.entries(config.wings)) {
      expect(wing.unlock, `${id}.unlock`).toBeTruthy();
      expect(wing.visual, `${id}.visual`).toBeTruthy();
      expect(wing.description, `${id}.description`).toBeTruthy();
    }
    expect(config.fort_slots_per_level.length).toBeGreaterThan(0);
    const slots = config.fort_slots_per_level.map((t) => t.slots);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i]).toBeGreaterThan(slots[i - 1]);
    }
  });
});

describe('Reward configs', () => {
  it('should have valid reward formula values', () => {
    const r = getRewardFormula();
    expect(r.base_clams).toBeGreaterThan(0);
    expect(r.kill_bonus).toBeGreaterThanOrEqual(0);
    expect(r.event_bonus).toBeGreaterThanOrEqual(0);
    expect(r.survival_bonus_per_minute).toBeGreaterThanOrEqual(0);
    expect(r.prestige_multiplier_per_rank).toBeGreaterThanOrEqual(0);
  });
});

describe('Prefix configs', () => {
  it('should have 10 tiers and access by index', () => {
    expect(getPrefixesConfig().tiers.length).toBe(10);
  });

  it('should return correct prefix data by index', () => {
    expect(getTierPrefix(0).prefix).toBe('Basic');
    expect(getTierPrefix(0).multiplier).toBe(1);
    expect(getTierPrefix(9).prefix).toBe('Transcendent');
    expect(getTierPrefix(9).multiplier).toBe(10);
  });

  it('should have ascending multipliers', () => {
    const config = getPrefixesConfig();
    for (let i = 1; i < config.tiers.length; i++) {
      expect(config.tiers[i].multiplier).toBeGreaterThan(config.tiers[i - 1].multiplier);
    }
  });

  it('should throw for out-of-range tier index', () => {
    expect(() => getTierPrefix(-1)).toThrow('Invalid tier index');
    expect(() => getTierPrefix(10)).toThrow('Invalid tier index');
  });
});

describe('Validation error detection', () => {
  it('should reject units with missing hp', () => {
    const bad = {
      generalists: { broken: { damage: 0, speed: 1, cost: {}, role: 'x', trainTime: 5 } },
      specialists: {},
    } as unknown as UnitsConfig;
    expect(() => validateUnits(bad)).toThrow('missing required field');
  });

  it('should reject units with negative damage', () => {
    const bad = {
      generalists: { broken: { hp: 10, damage: -1, speed: 1, cost: {}, role: 'x', trainTime: 5 } },
      specialists: {},
    } as unknown as UnitsConfig;
    expect(() => validateUnits(bad)).toThrow('non-negative');
  });

  it('should reject enemies with zero hp', () => {
    const bad = {
      types: { broken: { hp: 0, damage: 1, speed: 1, role: 'x', description: 'y' } },
      scaling: { hp_per_level: 0, damage_per_level: 0, speed_per_level: 0 },
    } as EnemiesConfig;
    expect(() => validateEnemies(bad)).toThrow('positive number');
  });

  it('should reject terrain with panel_based=false', () => {
    const bad = {
      panel_based: false,
      note: '',
      biome_terrain_rules: {},
      resource_types: [],
      terrain_types: [],
    } as TerrainConfig;
    expect(() => validateTerrain(bad)).toThrow('panel_based must be true');
  });

  it('should reject fort with zero hp', () => {
    const bad = {
      types: { broken: { hp: 0, cost: {}, description: 'y' } },
    } as unknown as FortificationsConfig;
    expect(() => validateFortifications(bad)).toThrow('positive number');
  });

  it('should reject lodge with empty wings', () => {
    const bad = {
      base_hp: 100,
      wings: {},
      fort_slots_per_level: [{ min_level: 0, slots: 4 }],
    } as LodgeConfig;
    expect(() => validateLodge(bad)).toThrow('must not be empty');
  });

  it('should reject rewards with zero base_clams', () => {
    const bad = {
      base_clams: 0,
      kill_bonus: 0,
      event_bonus: 0,
      resource_bonus_per_100: 0,
      survival_bonus_per_minute: 0,
      prestige_multiplier_per_rank: 0,
    } as RewardsConfig;
    expect(() => validateRewards(bad)).toThrow('positive number');
  });

  it('should reject prefixes with empty tiers', () => {
    const bad = { tiers: [] } as PrefixesConfig;
    expect(() => validatePrefixes(bad)).toThrow('must not be empty');
  });
});
