/**
 * Enemy Counterpart Behaviors (v3.0 — US17)
 *
 * Each enemy type from enemies.json has a role that determines its behavior.
 * These behaviors mirror player unit capabilities:
 *
 * - raider (raid_resources): Targets resource nodes
 * - fighter (attack): Direct assault on player units/Lodge
 * - healer (heal_allies): Restores wounded enemy units
 * - scout_enemy (detect): Reveals player army positions
 * - sapper_enemy (breach_walls): Destroys player fortifications
 * - saboteur_enemy (corrupt_nodes): Poisons player resource nodes
 *
 * Stats scale with progression level using enemies.json scaling config.
 */

import { type EnemyDef, getEnemyDef, getEnemyScaling } from '@/config/config-loader';
import type { EnemyScaling } from '@/config/v3-types';

// ── Types ─────────────────────────────────────────────────────────

/** Behavior result telling the AI system what target to seek. */
export interface EnemyBehaviorTarget {
  /** What the enemy should target. */
  targetType:
    | 'resource_node'
    | 'player_unit'
    | 'wounded_ally'
    | 'player_army'
    | 'fortification'
    | 'resource_corrupt'
    | 'lodge';
  /** Priority for target selection (higher = seek first). */
  priority: number;
  /** Maximum engagement range in pixels. */
  range: number;
  /** Description for debugging/UI. */
  description: string;
}

/** Scaled enemy stats for a given progression level. */
export interface ScaledEnemyStats {
  hp: number;
  damage: number;
  speed: number;
  role: string;
  description: string;
  /** The scaling multiplier applied. */
  levelMultiplier: number;
}

// ── Behavior Resolution ──────────────────────────────────────────

/**
 * Resolve the behavior target for an enemy type.
 * Used by the enemy AI system to determine what to target.
 */
export function resolveEnemyBehavior(enemyTypeId: string): EnemyBehaviorTarget {
  const def = getEnemyDef(enemyTypeId);
  return getBehaviorForRole(def.role);
}

/**
 * Get behavior configuration for a given role.
 */
export function getBehaviorForRole(role: string): EnemyBehaviorTarget {
  switch (role) {
    case 'raid_resources':
      return {
        targetType: 'resource_node',
        priority: 3,
        range: 400,
        description: 'Raids player resource nodes',
      };

    case 'attack':
      return {
        targetType: 'player_unit',
        priority: 2,
        range: 300,
        description: 'Attacks player units directly',
      };

    case 'heal_allies':
      return {
        targetType: 'wounded_ally',
        priority: 4,
        range: 200,
        description: 'Heals wounded enemy allies',
      };

    case 'detect':
      return {
        targetType: 'player_army',
        priority: 1,
        range: 500,
        description: 'Scouts and reveals player positions',
      };

    case 'breach_walls':
      return {
        targetType: 'fortification',
        priority: 5,
        range: 250,
        description: 'Targets and destroys player fortifications',
      };

    case 'corrupt_nodes':
      return {
        targetType: 'resource_corrupt',
        priority: 3,
        range: 350,
        description: 'Poisons player resource nodes',
      };

    default:
      // Default to attack behavior
      return {
        targetType: 'lodge',
        priority: 1,
        range: 300,
        description: 'Advances toward the Lodge',
      };
  }
}

// ── Stat Scaling ─────────────────────────────────────────────────

/**
 * Calculate scaled enemy stats for a given progression level.
 *
 * Formula: base_stat * (1 + progression_level * per_level_scaling)
 */
export function getScaledEnemyStats(
  enemyTypeId: string,
  progressionLevel: number,
): ScaledEnemyStats {
  const def = getEnemyDef(enemyTypeId);
  const scaling = getEnemyScaling();
  return scaleStats(def, scaling, progressionLevel);
}

function scaleStats(def: EnemyDef, scaling: EnemyScaling, level: number): ScaledEnemyStats {
  const hpMult = 1 + level * scaling.hp_per_level;
  const dmgMult = 1 + level * scaling.damage_per_level;
  const spdMult = 1 + level * scaling.speed_per_level;

  return {
    hp: Math.round(def.hp * hpMult),
    damage: Math.round(def.damage * dmgMult),
    speed: Math.round(def.speed * spdMult * 100) / 100,
    role: def.role,
    description: def.description,
    levelMultiplier: hpMult,
  };
}

/**
 * Get all enemy type stats at a given progression level.
 * Useful for balancing and display.
 */
export function getAllEnemyStatsForLevel(progressionLevel: number): Map<string, ScaledEnemyStats> {
  const result = new Map<string, ScaledEnemyStats>();
  const scaling = getEnemyScaling();

  // Known enemy types from enemies.json
  const types = ['raider', 'fighter', 'healer', 'scout_enemy', 'sapper_enemy', 'saboteur_enemy'];
  for (const typeId of types) {
    try {
      const def = getEnemyDef(typeId);
      result.set(typeId, scaleStats(def, scaling, progressionLevel));
    } catch {
      // Skip unknown types gracefully
    }
  }

  return result;
}

// ── Counter Strategy Descriptions ────────────────────────────────

/** Describes the counter-play for each enemy type (for UI hints). */
export interface CounterStrategy {
  enemyType: string;
  counterAction: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Get counter-strategy hints for active enemy types.
 * Used in event alerts and tutorial hints.
 */
export function getCounterStrategies(activeEnemyTypes: string[]): CounterStrategy[] {
  const strategies: CounterStrategy[] = [];

  for (const type of activeEnemyTypes) {
    const strategy = getCounterForType(type);
    if (strategy) strategies.push(strategy);
  }

  return strategies.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getCounterForType(enemyType: string): CounterStrategy | null {
  switch (enemyType) {
    case 'raider':
      return {
        enemyType: 'raider',
        counterAction: 'Defend your gatherers and resource nodes',
        priority: 'high',
      };
    case 'fighter':
      return {
        enemyType: 'fighter',
        counterAction: 'Engage with your fighters',
        priority: 'medium',
      };
    case 'healer':
      return {
        enemyType: 'healer',
        counterAction: 'Focus-fire healers first',
        priority: 'high',
      };
    case 'scout_enemy':
      return {
        enemyType: 'scout_enemy',
        counterAction: 'Ambush enemy scouts before they reveal your position',
        priority: 'low',
      };
    case 'sapper_enemy':
      return {
        enemyType: 'sapper_enemy',
        counterAction: 'Garrison defenders near walls',
        priority: 'high',
      };
    case 'saboteur_enemy':
      return {
        enemyType: 'saboteur_enemy',
        counterAction: 'Patrol resource areas with scouts',
        priority: 'medium',
      };
    default:
      return null;
  }
}
