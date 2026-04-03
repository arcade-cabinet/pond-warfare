/**
 * Enemy Counterpart Behavior Tests (v3.0 — US17)
 *
 * Validates enemy type behaviors from enemies.json:
 * - Each enemy type has correct role behavior
 * - Stat scaling with progression level
 * - Counter-strategy mapping
 * - All 6 enemy types present and correct
 */

import { describe, expect, it } from 'vitest';
import { getAllEnemyIds, getEnemyDef, getEnemyScaling } from '@/config/config-loader';
import {
  getAllEnemyStatsForLevel,
  getBehaviorForRole,
  getCounterStrategies,
  getScaledEnemyStats,
  resolveEnemyBehavior,
} from '@/ecs/systems/enemy-behaviors';

describe('Enemy Counterparts — US17', () => {
  describe('Enemy types from enemies.json', () => {
    it('should define all 6 enemy types', () => {
      const ids = getAllEnemyIds();
      expect(ids).toContain('raider');
      expect(ids).toContain('fighter');
      expect(ids).toContain('healer');
      expect(ids).toContain('scout_enemy');
      expect(ids).toContain('sapper_enemy');
      expect(ids).toContain('saboteur_enemy');
    });

    it('each enemy type has positive stats', () => {
      const ids = getAllEnemyIds();
      for (const id of ids) {
        const def = getEnemyDef(id);
        expect(def.hp, `${id} hp`).toBeGreaterThan(0);
        expect(def.speed, `${id} speed`).toBeGreaterThan(0);
        expect(def.role, `${id} role`).toBeTruthy();
        expect(def.description, `${id} description`).toBeTruthy();
      }
    });

    it('healers have 0 damage (they heal, not attack)', () => {
      const healer = getEnemyDef('healer');
      expect(healer.damage).toBe(0);
    });
  });

  describe('Role behavior resolution', () => {
    it('raider targets resource_node', () => {
      const behavior = resolveEnemyBehavior('raider');
      expect(behavior.targetType).toBe('resource_node');
    });

    it('fighter targets player_unit', () => {
      const behavior = resolveEnemyBehavior('fighter');
      expect(behavior.targetType).toBe('player_unit');
    });

    it('healer targets wounded_ally', () => {
      const behavior = resolveEnemyBehavior('healer');
      expect(behavior.targetType).toBe('wounded_ally');
    });

    it('scout_enemy targets player_army', () => {
      const behavior = resolveEnemyBehavior('scout_enemy');
      expect(behavior.targetType).toBe('player_army');
    });

    it('sapper_enemy targets fortification', () => {
      const behavior = resolveEnemyBehavior('sapper_enemy');
      expect(behavior.targetType).toBe('fortification');
    });

    it('saboteur_enemy targets resource_corrupt', () => {
      const behavior = resolveEnemyBehavior('saboteur_enemy');
      expect(behavior.targetType).toBe('resource_corrupt');
    });

    it('unknown role defaults to lodge target', () => {
      const behavior = getBehaviorForRole('unknown_role');
      expect(behavior.targetType).toBe('lodge');
    });

    it('all behaviors have positive range', () => {
      const roles = [
        'raid_resources',
        'attack',
        'heal_allies',
        'detect',
        'breach_walls',
        'corrupt_nodes',
      ];
      for (const role of roles) {
        const behavior = getBehaviorForRole(role);
        expect(behavior.range, role).toBeGreaterThan(0);
      }
    });

    it('all behaviors have descriptions', () => {
      const ids = getAllEnemyIds();
      for (const id of ids) {
        const behavior = resolveEnemyBehavior(id);
        expect(behavior.description).toBeTruthy();
      }
    });
  });

  describe('Stat scaling with progression level', () => {
    it('level 0 returns base stats unscaled', () => {
      const stats = getScaledEnemyStats('fighter', 0);
      const base = getEnemyDef('fighter');
      expect(stats.hp).toBe(base.hp);
      expect(stats.damage).toBe(base.damage);
    });

    it('higher levels produce higher stats', () => {
      const level0 = getScaledEnemyStats('fighter', 0);
      const level10 = getScaledEnemyStats('fighter', 10);
      const level50 = getScaledEnemyStats('fighter', 50);

      expect(level10.hp).toBeGreaterThan(level0.hp);
      expect(level50.hp).toBeGreaterThan(level10.hp);
      expect(level10.damage).toBeGreaterThan(level0.damage);
      expect(level50.damage).toBeGreaterThan(level10.damage);
    });

    it('scaling follows formula: base * (1 + level * per_level)', () => {
      const base = getEnemyDef('raider');
      const scaling = getEnemyScaling();

      const level = 20;
      const expected_hp = Math.round(base.hp * (1 + level * scaling.hp_per_level));
      const expected_dmg = Math.round(base.damage * (1 + level * scaling.damage_per_level));

      const scaled = getScaledEnemyStats('raider', level);
      expect(scaled.hp).toBe(expected_hp);
      expect(scaled.damage).toBe(expected_dmg);
    });

    it('speed also scales but more slowly', () => {
      const level0 = getScaledEnemyStats('scout_enemy', 0);
      const level50 = getScaledEnemyStats('scout_enemy', 50);

      expect(level50.speed).toBeGreaterThan(level0.speed);
      expect(level50.speed).toBeLessThan(level0.speed * 2);
    });

    it('getAllEnemyStatsForLevel returns all types', () => {
      const allStats = getAllEnemyStatsForLevel(10);
      expect(allStats.size).toBe(6);
      expect(allStats.has('raider')).toBe(true);
      expect(allStats.has('fighter')).toBe(true);
      expect(allStats.has('healer')).toBe(true);
      expect(allStats.has('scout_enemy')).toBe(true);
      expect(allStats.has('sapper_enemy')).toBe(true);
      expect(allStats.has('saboteur_enemy')).toBe(true);
    });

    it('scaled stats preserve role', () => {
      const stats = getScaledEnemyStats('raider', 15);
      expect(stats.role).toBe('raid_resources');
    });

    it('levelMultiplier is computed correctly', () => {
      const scaling = getEnemyScaling();
      const level = 10;
      const expectedMult = 1 + level * scaling.hp_per_level;
      const stats = getScaledEnemyStats('fighter', level);
      expect(stats.levelMultiplier).toBeCloseTo(expectedMult);
    });
  });

  describe('Counter strategies', () => {
    it('should return counter for each enemy type', () => {
      const types = [
        'raider',
        'fighter',
        'healer',
        'scout_enemy',
        'sapper_enemy',
        'saboteur_enemy',
      ];
      const strategies = getCounterStrategies(types);
      expect(strategies.length).toBe(6);
    });

    it('raider counter is to defend gatherers', () => {
      const strategies = getCounterStrategies(['raider']);
      expect(strategies[0].counterAction).toContain('gatherers');
    });

    it('healer counter mentions focus-fire', () => {
      const strategies = getCounterStrategies(['healer']);
      expect(strategies[0].counterAction.toLowerCase()).toContain('focus-fire');
    });

    it('sapper counter is to garrison defenders', () => {
      const strategies = getCounterStrategies(['sapper_enemy']);
      expect(strategies[0].counterAction).toContain('Garrison');
    });

    it('saboteur counter is to patrol with scouts', () => {
      const strategies = getCounterStrategies(['saboteur_enemy']);
      expect(strategies[0].counterAction).toContain('Patrol');
    });

    it('strategies are sorted by priority (high first)', () => {
      const strategies = getCounterStrategies(['scout_enemy', 'healer', 'fighter']);
      const priorities = strategies.map((s) => s.priority);
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      for (let i = 1; i < priorities.length; i++) {
        expect(priorityOrder[priorities[i]]).toBeGreaterThanOrEqual(
          priorityOrder[priorities[i - 1]],
        );
      }
    });

    it('empty input returns empty strategies', () => {
      const strategies = getCounterStrategies([]);
      expect(strategies).toHaveLength(0);
    });
  });

  describe('Enemy behavior mirroring player capabilities', () => {
    it('raider mirrors gatherer (targets resources)', () => {
      const raider = resolveEnemyBehavior('raider');
      expect(raider.targetType).toBe('resource_node');
    });

    it('healer mirrors medic (heals allies)', () => {
      const healer = resolveEnemyBehavior('healer');
      expect(healer.targetType).toBe('wounded_ally');
    });

    it('scout mirrors player scout (reveals positions)', () => {
      const scout = resolveEnemyBehavior('scout_enemy');
      expect(scout.targetType).toBe('player_army');
    });

    it('sapper mirrors fortification builder (destroys walls)', () => {
      const sapper = resolveEnemyBehavior('sapper_enemy');
      expect(sapper.targetType).toBe('fortification');
    });

    it('saboteur mirrors gatherer disruption (corrupts nodes)', () => {
      const saboteur = resolveEnemyBehavior('saboteur_enemy');
      expect(saboteur.targetType).toBe('resource_corrupt');
    });

    it('sappers have highest priority (breach walls = most dangerous)', () => {
      const sapper = resolveEnemyBehavior('sapper_enemy');
      const raider = resolveEnemyBehavior('raider');
      expect(sapper.priority).toBeGreaterThan(raider.priority);
    });
  });
});
