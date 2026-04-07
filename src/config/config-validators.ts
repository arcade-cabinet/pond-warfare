/**
 * Config Validators
 *
 * Validation functions for all JSON config schemas.
 * Extracted from config-loader.ts to keep files under 300 LOC.
 */

import type {
  EnemiesConfig,
  EventsConfig,
  FortificationsConfig,
  LodgeConfig,
  PrefixesConfig,
  PrestigeConfig,
  RewardsConfig,
  TerrainConfig,
  UnitsConfig,
  UpgradesConfig,
} from './v3-types';

// ── Validation helpers ─────────────────────────────────────────────

function assertField<T>(obj: T, field: keyof T, context: string): void {
  if (obj[field] === undefined || obj[field] === null) {
    throw new Error(`Config validation: missing required field "${String(field)}" in ${context}`);
  }
}

function assertPositive(value: number, context: string): void {
  if (typeof value !== 'number' || value <= 0) {
    throw new Error(`Config validation: expected positive number in ${context}, got ${value}`);
  }
}

function assertNonNegative(value: number, context: string): void {
  if (typeof value !== 'number' || value < 0) {
    throw new Error(`Config validation: expected non-negative number in ${context}, got ${value}`);
  }
}

// ── Validators ────────────────────────────────────────────────────

export function validateUnits(data: UnitsConfig): void {
  for (const [id, def] of Object.entries(data.generalists)) {
    const ctx = `units.generalists.${id}`;
    assertField(def, 'hp', ctx);
    assertPositive(def.hp, `${ctx}.hp`);
    assertField(def, 'speed', ctx);
    assertPositive(def.speed, `${ctx}.speed`);
    assertNonNegative(def.damage, `${ctx}.damage`);
    assertField(def, 'cost', ctx);
    assertField(def, 'role', ctx);
    assertField(def, 'trainTime', ctx);
    assertPositive(def.trainTime, `${ctx}.trainTime`);
  }
  for (const [id, def] of Object.entries(data.specialists)) {
    const ctx = `units.specialists.${id}`;
    assertField(def, 'hp', ctx);
    assertPositive(def.hp, `${ctx}.hp`);
    assertField(def, 'speed', ctx);
    assertPositive(def.speed, `${ctx}.speed`);
    assertNonNegative(def.damage, `${ctx}.damage`);
    assertField(def, 'cost', ctx);
    assertField(def, 'role', ctx);
    assertField(def, 'autoTarget', ctx);
  }
}

export function validateEnemies(data: EnemiesConfig): void {
  for (const [id, def] of Object.entries(data.types)) {
    const ctx = `enemies.types.${id}`;
    assertField(def, 'hp', ctx);
    assertPositive(def.hp, `${ctx}.hp`);
    assertField(def, 'speed', ctx);
    assertPositive(def.speed, `${ctx}.speed`);
    assertNonNegative(def.damage, `${ctx}.damage`);
    assertField(def, 'role', ctx);
  }
  assertField(data, 'scaling', 'enemies');
  assertNonNegative(data.scaling.hp_per_level, 'enemies.scaling.hp_per_level');
  assertNonNegative(data.scaling.damage_per_level, 'enemies.scaling.damage_per_level');
  assertNonNegative(data.scaling.speed_per_level, 'enemies.scaling.speed_per_level');
}

export function validateTerrain(data: TerrainConfig): void {
  if (!data.panel_based) {
    throw new Error('Config validation: terrain.panel_based must be true');
  }
  if (!Object.keys(data.biome_terrain_rules).length) {
    throw new Error('Config validation: terrain.biome_terrain_rules must not be empty');
  }
  for (const [biome, rule] of Object.entries(data.biome_terrain_rules)) {
    const ctx = `terrain.biome_terrain_rules.${biome}`;
    assertField(rule, 'primary', ctx);
  }
  if (!data.resource_types.length) {
    throw new Error('Config validation: terrain.resource_types must not be empty');
  }
  if (!data.terrain_types.length) {
    throw new Error('Config validation: terrain.terrain_types must not be empty');
  }
}

export function validateFortifications(data: FortificationsConfig): void {
  for (const [id, def] of Object.entries(data.types)) {
    const ctx = `fortifications.types.${id}`;
    assertField(def, 'hp', ctx);
    assertPositive(def.hp, `${ctx}.hp`);
    assertField(def, 'cost', ctx);
  }
}

export function validateLodge(data: LodgeConfig): void {
  assertPositive(data.base_hp, 'lodge.base_hp');
  if (!Object.keys(data.wings).length) {
    throw new Error('Config validation: lodge.wings must not be empty');
  }
  for (const [id, wing] of Object.entries(data.wings)) {
    assertField(wing, 'unlock', `lodge.wings.${id}`);
    assertField(wing, 'visual', `lodge.wings.${id}`);
  }
  if (!data.fort_slots_per_level.length) {
    throw new Error('Config validation: lodge.fort_slots_per_level must not be empty');
  }
}

export function validateRewards(data: RewardsConfig): void {
  assertPositive(data.base_clams, 'rewards.base_clams');
  assertNonNegative(data.kill_bonus, 'rewards.kill_bonus');
  assertNonNegative(data.event_bonus, 'rewards.event_bonus');
  assertNonNegative(data.resource_bonus_per_100, 'rewards.resource_bonus_per_100');
  assertNonNegative(data.survival_bonus_per_minute, 'rewards.survival_bonus_per_minute');
  assertNonNegative(data.prestige_multiplier_per_rank, 'rewards.prestige_multiplier_per_rank');
}

export function validatePrefixes(data: PrefixesConfig): void {
  if (!data.tiers.length) {
    throw new Error('Config validation: prefixes.tiers must not be empty');
  }
  for (const [i, entry] of data.tiers.entries()) {
    assertField(entry, 'prefix', `prefixes.tiers[${i}]`);
    assertPositive(entry.multiplier, `prefixes.tiers[${i}].multiplier`);
  }
}

export function validateEvents(data: EventsConfig): void {
  if (!Object.keys(data.templates).length) {
    throw new Error('Config validation: events.templates must not be empty');
  }
  for (const [id, tmpl] of Object.entries(data.templates)) {
    const ctx = `events.templates.${id}`;
    assertField(tmpl, 'type', ctx);
    assertNonNegative(tmpl.min_progression, `${ctx}.min_progression`);
    assertPositive(tmpl.duration_seconds, `${ctx}.duration_seconds`);
    assertNonNegative(tmpl.reward_clams, `${ctx}.reward_clams`);
    if (tmpl.max_progression <= tmpl.min_progression) {
      throw new Error(
        `Config validation: ${ctx}.max_progression (${tmpl.max_progression}) must be greater than min_progression (${tmpl.min_progression})`,
      );
    }
  }
  assertField(data, 'timing', 'events');
  assertPositive(data.timing.first_event_delay_seconds, 'events.timing.first_event_delay_seconds');
  assertPositive(data.timing.min_interval_seconds, 'events.timing.min_interval_seconds');
}

export function validateUpgrades(data: UpgradesConfig): void {
  if (!Object.keys(data.categories).length) {
    throw new Error('Config validation: upgrades.categories must not be empty');
  }
  for (const [catId, cat] of Object.entries(data.categories)) {
    const ctx = `upgrades.categories.${catId}`;
    assertField(cat, 'label', ctx);
    if (!Object.keys(cat.subcategories).length) {
      throw new Error(`Config validation: ${ctx}.subcategories must not be empty`);
    }
    for (const [subId, sub] of Object.entries(cat.subcategories)) {
      const sctx = `${ctx}.subcategories.${subId}`;
      assertPositive(sub.base_cost, `${sctx}.base_cost`);
    }
  }
  assertPositive(data.tiers_per_subcategory, 'upgrades.tiers_per_subcategory');
}

export function validatePrestige(data: PrestigeConfig): void {
  assertField(data, 'pearl_formula', 'prestige');
  assertPositive(data.pearl_formula.rank_multiplier, 'prestige.pearl_formula.rank_multiplier');
  assertPositive(data.rank_threshold_base, 'prestige.rank_threshold_base');
  if (!Object.keys(data.pearl_upgrades).length) {
    throw new Error('Config validation: prestige.pearl_upgrades must not be empty');
  }
  for (const [id, up] of Object.entries(data.pearl_upgrades)) {
    const ctx = `prestige.pearl_upgrades.${id}`;
    assertPositive(up.cost_per_rank, `${ctx}.cost_per_rank`);
    assertPositive(up.max_rank, `${ctx}.max_rank`);
  }
}
