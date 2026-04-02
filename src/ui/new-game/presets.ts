/**
 * New Game — Preset definitions and name generator
 *
 * Contains preset configurations for difficulty levels, name generation
 * pools, and type mappings.
 */

import type { CustomGameSettings, DifficultyLevel } from '@/ui/store';
import { DEFAULT_CUSTOM_SETTINGS } from '@/ui/store';

// ---- Name generator pools ----

const ADJECTIVES = [
  'Muddy',
  'Swift',
  'Ancient',
  'Verdant',
  'Lurking',
  'Twilight',
  'Mossy',
  'Crimson',
  'Silver',
  'Golden',
  'Stormy',
  'Peaceful',
  'Raging',
  'Silent',
  'Hidden',
  'Frozen',
  'Emerald',
  'Savage',
  'Sacred',
  'Hollow',
];

const NOUNS = [
  'Pond',
  'Marsh',
  'Wetlands',
  'Creek',
  'Basin',
  'Lagoon',
  'Swamp',
  'Brook',
  'Delta',
  'Shallows',
  'Rapids',
  'Estuary',
  'Tributary',
  'Bayou',
  'Thicket',
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateName(): string {
  const adj1 = pickRandom(ADJECTIVES);
  let adj2 = pickRandom(ADJECTIVES);
  while (adj2 === adj1) adj2 = pickRandom(ADJECTIVES);
  const noun = pickRandom(NOUNS);
  return `${adj1} ${adj2} ${noun}`;
}

export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// ---- Presets ----

export type PresetKey =
  | 'easy'
  | 'normal'
  | 'hard'
  | 'nightmare'
  | 'ultraNightmare'
  | 'sandbox'
  | 'speedrun'
  | 'survival';

export const PRESETS: Record<PresetKey, Partial<CustomGameSettings>> = {
  easy: {
    scenario: 'standard',
    resourceDensity: 'rich',
    startingResourcesMult: 2.0,
    gatherSpeed: 'normal',
    startingUnits: 6,
    enemyNests: 1,
    enemyEconomy: 'weak',
    enemyAggression: 'passive',
    evolutionSpeed: 'slow',
    peaceMinutes: 4,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
  normal: { ...DEFAULT_CUSTOM_SETTINGS },
  hard: {
    scenario: 'standard',
    resourceDensity: 'sparse',
    startingResourcesMult: 0.75,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 3,
    enemyEconomy: 'strong',
    enemyAggression: 'aggressive',
    evolutionSpeed: 'normal',
    peaceMinutes: 1,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
  nightmare: {
    scenario: 'standard',
    resourceDensity: 'sparse',
    startingResourcesMult: 0.5,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 4,
    enemyEconomy: 'overwhelming',
    enemyAggression: 'relentless',
    evolutionSpeed: 'fast',
    peaceMinutes: 0,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
  ultraNightmare: {
    scenario: 'standard',
    resourceDensity: 'sparse',
    startingResourcesMult: 0.5,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 5,
    enemyEconomy: 'overwhelming',
    enemyAggression: 'relentless',
    evolutionSpeed: 'fast',
    peaceMinutes: 0,
    permadeath: true,
    fogOfWar: 'full',
    heroMode: false,
  },
  sandbox: {
    scenario: 'standard',
    resourceDensity: 'abundant',
    startingResourcesMult: 3.0,
    gatherSpeed: 'fast',
    startingUnits: 8,
    enemyNests: 1,
    enemyEconomy: 'weak',
    enemyAggression: 'passive',
    evolutionSpeed: 'slow',
    peaceMinutes: 10,
    permadeath: false,
    fogOfWar: 'revealed',
    heroMode: false,
  },
  speedrun: {
    scenario: 'standard',
    resourceDensity: 'rich',
    startingResourcesMult: 1.5,
    gatherSpeed: 'fast',
    startingUnits: 4,
    enemyNests: 2,
    enemyEconomy: 'normal',
    enemyAggression: 'aggressive',
    evolutionSpeed: 'fast',
    peaceMinutes: 1,
    permadeath: false,
    fogOfWar: 'explored',
    heroMode: false,
  },
  survival: {
    scenario: 'standard',
    resourceDensity: 'rich',
    startingResourcesMult: 1.25,
    gatherSpeed: 'normal',
    startingUnits: 4,
    enemyNests: 0,
    enemyEconomy: 'strong',
    enemyAggression: 'relentless',
    evolutionSpeed: 'fast',
    peaceMinutes: 2,
    permadeath: false,
    fogOfWar: 'full',
    heroMode: false,
  },
};

export function presetToDifficulty(preset: PresetKey): DifficultyLevel {
  switch (preset) {
    case 'easy':
      return 'easy';
    case 'hard':
      return 'hard';
    case 'nightmare':
      return 'nightmare';
    case 'ultraNightmare':
      return 'ultraNightmare';
    default:
      return 'normal';
  }
}

export const PRESET_LABELS: Record<PresetKey, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  nightmare: 'Nightmare',
  ultraNightmare: 'Ultra',
  sandbox: 'Sandbox',
  speedrun: 'Speedrun',
  survival: 'Survival',
};

export const PRESET_COLORS: Record<PresetKey, string> = {
  easy: '#22c55e',
  normal: 'var(--pw-accent)',
  hard: '#ef4444',
  nightmare: '#a855f7',
  ultraNightmare: '#dc2626',
  sandbox: '#60a5fa',
  speedrun: '#f59e0b',
  survival: '#ec4899',
};
