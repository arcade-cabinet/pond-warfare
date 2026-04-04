/**
 * Store Types – Shared interfaces and defaults for the reactive store.
 */

import type { MapScenario } from './store';

/** Directional resource change tracking for HUD flash animations.
 *  delta > 0 = increase (green/gold), delta < 0 = decrease (red). */
export interface ResourceChange {
  clams: number;
  twigs: number;
  pearls: number;
  frame: number;
}

/** Food/population change tracking: delta > 0 = unit trained, delta < 0 = unit died. */
export interface FoodChange {
  delta: number;
  frame: number;
}

/** Game event feed entry. */
export interface GameEvent {
  text: string;
  color: string;
  frame: number;
}

export interface CustomGameSettings {
  // Map
  scenario: MapScenario;
  resourceDensity: 'sparse' | 'normal' | 'rich' | 'abundant';

  // Economy
  startingResourcesMult: number; // 0.5 to 2.0
  gatherSpeed: 'slow' | 'normal' | 'fast';
  startingUnits: 3 | 4 | 6 | 8;

  // Enemies
  enemyNests: number; // 0-5
  enemyEconomy: 'weak' | 'normal' | 'strong' | 'overwhelming';
  enemyAggression: 'passive' | 'normal' | 'aggressive' | 'relentless';
  evolutionSpeed: 'slow' | 'normal' | 'fast' | 'instant';

  // Rules
  peaceMinutes: number; // 0, 1, 2, 4, 8
  permadeath: boolean;
  fogOfWar: 'full' | 'explored' | 'revealed';
  heroMode: boolean;

  // Enemy stat scaling (HP/damage multiplier for enemy units, default 1.0)
  enemyStatMult: number;
  // Nest build rate multiplier (lower = slower enemy nest production, default 1.0)
  nestBuildRateMult: number;
}

export const DEFAULT_CUSTOM_SETTINGS: CustomGameSettings = {
  scenario: 'standard',
  resourceDensity: 'normal',
  startingResourcesMult: 1.0,
  gatherSpeed: 'normal',
  startingUnits: 4,
  enemyNests: 2,
  enemyEconomy: 'normal',
  enemyAggression: 'normal',
  evolutionSpeed: 'normal',
  peaceMinutes: 2,
  permadeath: false,
  fogOfWar: 'full',
  heroMode: false,
  enemyStatMult: 1.0,
  nestBuildRateMult: 1.0,
};
