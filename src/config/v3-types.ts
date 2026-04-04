/**
 * v3 Config Type Definitions
 *
 * TypeScript interfaces matching the JSON config schemas in configs/.
 * Used by the config loader for type-safe access to game data.
 */

// ── Resource cost map ──────────────────────────────────────────────
export interface ResourceCost {
  fish?: number;
  rocks?: number;
  logs?: number;
}

// ── Unit definitions ───────────────────────────────────────────────
export interface GeneralistDef {
  hp: number;
  damage: number;
  speed: number;
  cost: ResourceCost;
  role: string;
  trainTime: number;
}

export interface SpecialistDef {
  hp: number;
  damage: number;
  speed: number;
  role: string;
  autoTarget: string;
}

export interface UnitsConfig {
  generalists: Record<string, GeneralistDef>;
  specialists: Record<string, SpecialistDef>;
}

// ── Enemy definitions ──────────────────────────────────────────────
export interface EnemyDef {
  hp: number;
  damage: number;
  speed: number;
  role: string;
  description: string;
}

export interface EnemyScaling {
  hp_per_level: number;
  damage_per_level: number;
  speed_per_level: number;
}

export interface EnemiesConfig {
  types: Record<string, EnemyDef>;
  scaling: EnemyScaling;
}

// ── Terrain definitions ────────────────────────────────────────────
export interface BiomeTerrainRule {
  primary: string;
  water_coverage?: number;
  mud_coverage?: number;
  rock_coverage?: number;
  high_ground_coverage?: number;
  tree_density?: number;
  narrow_paths?: boolean;
  vision_blocking?: boolean;
}

export interface TerrainConfig {
  panel_based: boolean;
  note: string;
  biome_terrain_rules: Record<string, BiomeTerrainRule>;
  resource_types: string[];
  terrain_types: string[];
}

// ── Fortification definitions ──────────────────────────────────────
export interface FortDef {
  hp: number;
  cost: ResourceCost;
  blocks_movement?: boolean;
  damage?: number;
  range?: number;
  description: string;
}

export interface FortificationsConfig {
  types: Record<string, FortDef>;
}

// ── Lodge definitions ──────────────────────────────────────────────
export interface LodgeWing {
  unlock: string;
  description: string;
  visual: string;
}

export interface FortSlotTier {
  min_level: number;
  slots: number;
}

export interface LodgeConfig {
  base_hp: number;
  wings: Record<string, LodgeWing>;
  fort_slots_per_level: FortSlotTier[];
}

// ── Reward definitions ─────────────────────────────────────────────
export interface RewardsConfig {
  base_clams: number;
  kill_bonus: number;
  event_bonus: number;
  survival_bonus_per_minute: number;
  prestige_multiplier_per_rank: number;
}

// ── Prefix/tier definitions ────────────────────────────────────────
export interface TierEntry {
  prefix: string;
  multiplier: number;
}

export interface PrefixesConfig {
  tiers: TierEntry[];
}

// ── Event definitions ──────────────────────────────────────────────
export interface BossSpec {
  type: string;
  hp_multiplier: number;
  damage_multiplier: number;
}

export interface EventEffects {
  visibility_reduction?: number;
  speed_penalty?: number;
  bonus_nodes?: number;
}

export interface EventTemplate {
  type: string;
  min_progression: number;
  max_progression: number;
  duration_seconds: number;
  enemy_composition: Record<string, number>;
  reward_clams: number;
  description: string;
  boss?: BossSpec;
  effects?: EventEffects;
}

export interface EventTiming {
  first_event_delay_seconds: number;
  min_interval_seconds: number;
  max_interval_seconds: number;
  max_concurrent_events: number;
}

export interface EventsConfig {
  templates: Record<string, EventTemplate>;
  timing: EventTiming;
}

// ── Upgrade web definitions ────────────────────────────────────────
export interface SubcategoryDef {
  label: string;
  base_effect: number;
  base_cost: number;
}

export interface UpgradeCategoryDef {
  label: string;
  subcategories: Record<string, SubcategoryDef>;
}

export interface DiamondNodeRequirements {
  [category: string]: Record<string, number>;
}

export interface DiamondNodeEffect {
  type: string;
  wing?: string;
  unit?: string;
  behavior?: string;
  stat?: string;
  value?: number;
  stage?: number;
}

export interface DiamondNodeDef {
  label: string;
  description?: string;
  requires: DiamondNodeRequirements;
  effect: DiamondNodeEffect;
  cost: number;
}

export interface UpgradeFormulas {
  cost: string;
  effect: string;
}

export interface UpgradesConfig {
  categories: Record<string, UpgradeCategoryDef>;
  formulas: UpgradeFormulas;
  tiers_per_subcategory: number;
  diamond_nodes: Record<string, DiamondNodeDef>;
}

// ── Prestige definitions ───────────────────────────────────────────
export interface PearlFormula {
  description: string;
  rank_multiplier: number;
}

export interface AutoDeployEffect {
  type: 'auto_deploy';
  unit: string;
  count_per_rank: number;
}

export interface MultiplierEffect {
  type: 'multiplier';
  stat: string;
  value_per_rank: number;
}

export interface AutoBehaviorEffect {
  type: 'auto_behavior';
  behavior: string;
}

export type PearlUpgradeEffect = AutoDeployEffect | MultiplierEffect | AutoBehaviorEffect;

export interface PearlUpgradeDef {
  label: string;
  description: string;
  cost_per_rank: number;
  max_rank: number;
  effect: PearlUpgradeEffect;
}

export interface PrestigeConfig {
  pearl_formula: PearlFormula;
  rank_threshold_base: number;
  rank_threshold_formula: string;
  pearl_upgrades: Record<string, PearlUpgradeDef>;
  resets_on_prestige: string[];
  persists_on_prestige: string[];
}

// ── Union type for any unit definition ─────────────────────────────
export type AnyUnitDef = GeneralistDef | SpecialistDef;
