/**
 * Store Types – Shared interfaces and defaults for the reactive store.
 */

import type { MapScenario } from './store';

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
};
