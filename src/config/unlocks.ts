/**
 * Unlock Definitions
 *
 * Defines all unlockable content: scenarios, presets, units, modifiers, and cosmetics.
 * Each unlock has a check function that evaluates against the player's persistent profile.
 */

import type { PlayerProfile } from '@/storage/database';

export type UnlockCategory = 'scenario' | 'preset' | 'unit' | 'building' | 'cosmetic' | 'modifier';

export interface UnlockDef {
  id: string;
  category: UnlockCategory;
  name: string;
  description: string;
  requirement: string;
  check: (profile: PlayerProfile) => boolean;
}

/** Difficulty ranking for comparison (higher index = harder). */
const DIFFICULTY_RANK: Record<string, number> = {
  easy: 0,
  normal: 1,
  hard: 2,
  nightmare: 3,
  ultraNightmare: 4,
};

function wonAtLeast(profile: PlayerProfile, level: string): boolean {
  const won = profile.highest_difficulty_won;
  if (!won) return false;
  return (DIFFICULTY_RANK[won] ?? -1) >= (DIFFICULTY_RANK[level] ?? 999);
}

export const UNLOCKS: UnlockDef[] = [
  // --- Scenarios (map types) ---
  {
    id: 'scenario_island',
    category: 'scenario',
    name: 'Island Map',
    description: 'Surrounded on all sides',
    requirement: 'Win 1 game',
    check: (p) => p.total_wins >= 1,
  },
  {
    id: 'scenario_contested',
    category: 'scenario',
    name: 'Contested Map',
    description: 'Start close to the enemy',
    requirement: 'Win on Hard',
    check: (p) => wonAtLeast(p, 'hard'),
  },

  // --- Presets ---
  {
    id: 'preset_sandbox',
    category: 'preset',
    name: 'Sandbox Mode',
    description: 'Infinite resources, passive enemies',
    requirement: 'Play 3 games',
    check: (p) => p.total_games >= 3,
  },
  {
    id: 'preset_speedrun',
    category: 'preset',
    name: 'Speedrun Mode',
    description: 'Race the clock',
    requirement: 'Win in under 20 minutes',
    check: (p) => p.fastest_win_seconds > 0 && p.fastest_win_seconds < 1200,
  },
  {
    id: 'preset_survival',
    category: 'preset',
    name: 'Survival Mode',
    description: 'Endless waves, no nests',
    requirement: 'Survive 30 minutes',
    check: (p) => p.longest_survival_seconds >= 1800,
  },
  {
    id: 'preset_nightmare',
    category: 'preset',
    name: 'Nightmare',
    description: 'Maximum pressure',
    requirement: 'Win on Hard',
    check: (p) => wonAtLeast(p, 'hard'),
  },
  {
    id: 'preset_ultra',
    category: 'preset',
    name: 'Ultra Nightmare',
    description: 'No mercy',
    requirement: 'Win on Nightmare',
    check: (p) => wonAtLeast(p, 'nightmare'),
  },

  // --- Units (unlock through play) ---
  {
    id: 'unit_catapult',
    category: 'unit',
    name: 'Catapult',
    description: 'Siege weapon',
    requirement: 'Build 10 buildings total',
    check: (p) => p.total_buildings_built >= 10,
  },
  {
    id: 'unit_swimmer',
    category: 'unit',
    name: 'Swimmer',
    description: 'Amphibious unit',
    requirement: 'Kill 50 enemies total',
    check: (p) => p.total_kills >= 50,
  },
  {
    id: 'unit_trapper',
    category: 'unit',
    name: 'Trapper',
    description: 'Slow trap specialist',
    requirement: 'Win 3 games',
    check: (p) => p.total_wins >= 3,
  },
  {
    id: 'unit_shieldbearer',
    category: 'unit',
    name: 'Shieldbearer',
    description: 'Heavy tank',
    requirement: 'Promote a unit to Hero rank',
    check: (p) => p.hero_units_earned >= 1,
  },

  // --- Modifiers (game rules) ---
  {
    id: 'mod_hero_mode',
    category: 'modifier',
    name: 'Hero Mode',
    description: 'Commander starts with 200 HP',
    requirement: 'Win without Commander dying',
    check: (p) => p.wins_commander_alive >= 1,
  },
  {
    id: 'mod_permadeath',
    category: 'modifier',
    name: 'Permadeath',
    description: 'One life, +50% rewards',
    requirement: 'Win on Hard',
    check: (p) => wonAtLeast(p, 'hard'),
  },
  {
    id: 'mod_fast_evolution',
    category: 'modifier',
    name: 'Fast Evolution',
    description: 'Enemies evolve 2x faster',
    requirement: 'Survive 45 minutes',
    check: (p) => p.longest_survival_seconds >= 2700,
  },

  // --- Cosmetic ---
  {
    id: 'cosmetic_gold_cape',
    category: 'cosmetic',
    name: 'Gold Commander Cape',
    description: 'Replace blue cape with gold',
    requirement: 'Win 10 games',
    check: (p) => p.total_wins >= 10,
  },
  {
    id: 'cosmetic_red_banner',
    category: 'cosmetic',
    name: 'Red War Banner',
    description: 'ScoutPost flies a red flag',
    requirement: 'Kill 200 enemies total',
    check: (p) => p.total_kills >= 200,
  },
];

/** Category display order and labels. */
export const UNLOCK_CATEGORIES: { key: UnlockCategory; label: string }[] = [
  { key: 'scenario', label: 'Scenarios' },
  { key: 'preset', label: 'Presets' },
  { key: 'unit', label: 'Units' },
  { key: 'modifier', label: 'Modifiers' },
  { key: 'cosmetic', label: 'Cosmetic' },
];
