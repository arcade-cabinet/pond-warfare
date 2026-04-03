/**
 * v3 Config Loader
 *
 * Imports JSON configs via Vite and exposes typed accessor functions.
 * Validation logic lives in config-validators.ts (extracted for 300 LOC limit).
 */

import enemiesJson from '../../configs/enemies.json';
import eventsJson from '../../configs/events.json';
import fortificationsJson from '../../configs/fortifications.json';
import lodgeJson from '../../configs/lodge.json';
import prefixesJson from '../../configs/prefixes.json';
import prestigeJson from '../../configs/prestige.json';
import rewardsJson from '../../configs/rewards.json';
import terrainJson from '../../configs/terrain.json';
import unitsJson from '../../configs/units.json';
import upgradesJson from '../../configs/upgrades.json';

import type {
  AnyUnitDef,
  EnemiesConfig,
  EnemyDef,
  EventsConfig,
  EventTemplate,
  FortDef,
  FortificationsConfig,
  GeneralistDef,
  LodgeConfig,
  PearlUpgradeDef,
  PrefixesConfig,
  PrestigeConfig,
  RewardsConfig,
  SpecialistDef,
  TerrainConfig,
  TerrainTier,
  TierEntry,
  UnitsConfig,
  UpgradesConfig,
} from './v3-types';

export {
  validateEnemies,
  validateEvents,
  validateFortifications,
  validateLodge,
  validatePrefixes,
  validatePrestige,
  validateRewards,
  validateTerrain,
  validateUnits,
  validateUpgrades,
} from './config-validators';

import {
  validateEnemies,
  validateEvents,
  validateFortifications,
  validateLodge,
  validatePrefixes,
  validatePrestige,
  validateRewards,
  validateTerrain,
  validateUnits,
  validateUpgrades,
} from './config-validators';

export type {
  AnyUnitDef,
  EnemiesConfig,
  EnemyDef,
  EventsConfig,
  EventTemplate,
  FortDef,
  FortificationsConfig,
  GeneralistDef,
  LodgeConfig,
  PearlUpgradeDef,
  PrefixesConfig,
  PrestigeConfig,
  RewardsConfig,
  SpecialistDef,
  TerrainConfig,
  TerrainTier,
  TierEntry,
  UnitsConfig,
  UpgradesConfig,
};

// ── Cast and validate on import ───────────────────────────────────

const units = unitsJson as UnitsConfig;
const enemies = enemiesJson as EnemiesConfig;
const terrain = terrainJson as TerrainConfig;
const fortifications = fortificationsJson as FortificationsConfig;
const lodge = lodgeJson as LodgeConfig;
const rewards = rewardsJson as RewardsConfig;
const prefixes = prefixesJson as PrefixesConfig;
const events = eventsJson as EventsConfig;
const upgrades = upgradesJson as UpgradesConfig;
const prestige = prestigeJson as PrestigeConfig;

validateUnits(units);
validateEnemies(enemies);
validateTerrain(terrain);
validateFortifications(fortifications);
validateLodge(lodge);
validateRewards(rewards);
validatePrefixes(prefixes);
validateEvents(events);
validateUpgrades(upgrades);
validatePrestige(prestige);

// ── Typed Accessors ────────────────────────────────────────────────

export function getUnitDef(id: string): AnyUnitDef {
  const gen = units.generalists[id] as AnyUnitDef | undefined;
  if (gen) return gen;
  const spec = units.specialists[id] as AnyUnitDef | undefined;
  if (spec) return spec;
  throw new Error(`Unknown unit: "${id}". Check configs/units.json`);
}

export function getEnemyDef(id: string): EnemyDef {
  const def = enemies.types[id];
  if (!def) throw new Error(`Unknown enemy: "${id}". Check configs/enemies.json`);
  return def;
}

export function getTerrainForLevel(level: number): TerrainTier {
  const sorted = [...terrain.progression_scaling].sort((a, b) => b.min_level - a.min_level);
  for (const tier of sorted) {
    if (level >= tier.min_level && level <= tier.max_level) return tier;
  }
  return sorted[0];
}

export function getFortDef(id: string): FortDef {
  const def = fortifications.types[id];
  if (!def) throw new Error(`Unknown fortification: "${id}". Check configs/fortifications.json`);
  return def;
}

export function getLodgeConfig(): LodgeConfig {
  return lodge;
}
export function getRewardFormula(): RewardsConfig {
  return rewards;
}

export function getTierPrefix(tier: number): TierEntry {
  if (tier < 0 || tier >= prefixes.tiers.length) {
    throw new Error(`Invalid tier index: ${tier}. Valid range: 0-${prefixes.tiers.length - 1}`);
  }
  return prefixes.tiers[tier];
}

export function getAllUnitIds(): string[] {
  return [...Object.keys(units.generalists), ...Object.keys(units.specialists)];
}

export function getAllEnemyIds(): string[] {
  return Object.keys(enemies.types);
}
export function getEnemyScaling(): EnemiesConfig['scaling'] {
  return enemies.scaling;
}
export function getTerrainConfig(): TerrainConfig {
  return terrain;
}
export function getFortificationsConfig(): FortificationsConfig {
  return fortifications;
}
export function getPrefixesConfig(): PrefixesConfig {
  return prefixes;
}

export function getEventsForLevel(level: number): EventTemplate[] {
  return Object.values(events.templates).filter(
    (t) => level >= t.min_progression && level <= t.max_progression,
  );
}

/** Event entry with its config key and full template data. */
export interface EventEntry {
  id: string;
  template: EventTemplate;
}

export function getEventEntriesForLevel(level: number): EventEntry[] {
  return Object.entries(events.templates)
    .filter(([, t]) => level >= t.min_progression && level <= t.max_progression)
    .map(([id, template]) => ({ id, template }));
}

export function getAllEventIds(): string[] {
  return Object.keys(events.templates);
}

export function getEventTemplate(id: string): EventTemplate {
  const tmpl = events.templates[id];
  if (!tmpl) throw new Error(`Unknown event: "${id}". Check configs/events.json`);
  return tmpl;
}

export function getEventTiming(): EventsConfig['timing'] {
  return events.timing;
}
export function getEventsConfig(): EventsConfig {
  return events;
}
export function getUpgradesConfig(): UpgradesConfig {
  return upgrades;
}
export function getPrestigeConfig(): PrestigeConfig {
  return prestige;
}

export function getPearlUpgrade(id: string): PearlUpgradeDef {
  const def = prestige.pearl_upgrades[id];
  if (!def) throw new Error(`Unknown pearl upgrade: "${id}". Check configs/prestige.json`);
  return def;
}

export function getAllPearlUpgradeIds(): string[] {
  return Object.keys(prestige.pearl_upgrades);
}

export function getAllPearlUpgradeEntries(): Array<{ id: string; def: PearlUpgradeDef }> {
  return Object.entries(prestige.pearl_upgrades).map(([id, def]) => ({ id, def }));
}

/** A single entry in the procedurally generated upgrade catalog. */
export interface CatalogEntry {
  id: string;
  category: string;
  subcategory: string;
  tier: number;
  name: string;
  cost: number;
  effect: number;
}

/** Generate the full upgrade catalog from category/subcategory definitions. */
export function generateUpgradeCatalog(): CatalogEntry[] {
  const catalog: CatalogEntry[] = [];
  for (const [catKey, cat] of Object.entries(upgrades.categories)) {
    for (const [subKey, sub] of Object.entries(cat.subcategories)) {
      for (let tier = 0; tier < upgrades.tiers_per_subcategory; tier++) {
        const prefix = getTierPrefix(tier);
        catalog.push({
          id: `${catKey}_${subKey}_t${tier}`,
          category: catKey,
          subcategory: subKey,
          tier,
          name: `${prefix.prefix} ${sub.label}`,
          cost: Math.round(sub.base_cost * 2 ** tier),
          effect: sub.base_effect * (tier + 1),
        });
      }
    }
  }
  return catalog;
}

export function calculatePearlReward(progressionLevel: number, currentRank: number): number {
  return Math.floor(
    progressionLevel * prestige.pearl_formula.rank_multiplier * (1 + currentRank * 0.1),
  );
}

export function getPrestigeThreshold(currentRank: number): number {
  return Math.round(prestige.rank_threshold_base * (1 + currentRank * 0.5));
}

export function getDiamondNodes(): UpgradesConfig['diamond_nodes'] {
  return upgrades.diamond_nodes;
}
export function getDiamondNodeIds(): string[] {
  return Object.keys(upgrades.diamond_nodes);
}
export function getTiersPerSubcategory(): number {
  return upgrades.tiers_per_subcategory;
}
export function getUpgradeCategories(): UpgradesConfig['categories'] {
  return upgrades.categories;
}
