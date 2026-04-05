/**
 * Fortification System Tests
 *
 * Validates the Lodge fortification system: slot initialization,
 * placement, combat (towers), damage, walls blocking movement,
 * and integration with the economy (Rocks cost).
 */

import { describe, expect, it } from 'vitest';
import { getFortDef, getFortificationsConfig } from '@/config/config-loader';
import {
  canTowerAttack,
  countActiveForts,
  damageFortification,
  getActiveTowers,
  getBlockingForts,
  getEmptySlots,
  initFortificationState,
  placeFortification,
  recordTowerAttack,
} from '@/ecs/systems/fortification';

describe('Fortification System', () => {
  describe('Slot initialization', () => {
    it('creates correct number of slots based on progression', () => {
      const state = initFortificationState(1, 500, 500);
      expect(state.slots.length).toBeGreaterThan(0);
      expect(state.totalRockCost).toBe(0);
    });

    it('all slots start empty', () => {
      const state = initFortificationState(3, 500, 500);
      for (const slot of state.slots) {
        expect(slot.status).toBe('empty');
        expect(slot.fortType).toBeNull();
        expect(slot.currentHp).toBe(0);
      }
    });

    it('slots have world positions relative to Lodge', () => {
      const lodgeX = 1440;
      const lodgeY = 1000;
      const state = initFortificationState(3, lodgeX, lodgeY);
      for (const slot of state.slots) {
        // Slots should be near the Lodge (within ~200px)
        expect(Math.abs(slot.worldX - lodgeX)).toBeLessThan(200);
        expect(Math.abs(slot.worldY - lodgeY)).toBeLessThan(200);
      }
    });
  });

  describe('Placement', () => {
    it('places wood_wall in empty slot with enough Rocks', () => {
      const state = initFortificationState(3, 500, 500);
      const result = placeFortification(state, 0, 'wood_wall', 100);

      expect(result.success).toBe(true);
      expect(result.rockCost).toBe(15); // from fortifications.json
      expect(state.slots[0].status).toBe('active');
      expect(state.slots[0].fortType).toBe('wood_wall');
      expect(state.slots[0].currentHp).toBe(100); // wood_wall HP from config
    });

    it('rejects placement with insufficient Rocks', () => {
      const state = initFortificationState(3, 500, 500);
      const result = placeFortification(state, 0, 'stone_wall', 5); // stone_wall costs 40

      expect(result.success).toBe(false);
      expect(result.reason).toContain('Rocks');
    });

    it('rejects placement in occupied slot', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);
      const result = placeFortification(state, 0, 'watchtower', 100);

      expect(result.success).toBe(false);
      expect(result.reason).toContain('active');
    });

    it('tracks total Rock cost', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);
      placeFortification(state, 1, 'watchtower', 100);

      expect(state.totalRockCost).toBe(15 + 30); // wood_wall + watchtower costs
    });
  });

  describe('Damage and destruction', () => {
    it('reduces HP on damage', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);

      const applied = damageFortification(state, 0, 30);
      expect(applied).toBe(30);
      expect(state.slots[0].currentHp).toBe(70);
    });

    it('destroys fort when HP reaches 0', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);

      damageFortification(state, 0, 100);
      expect(state.slots[0].status).toBe('destroyed');
      expect(state.slots[0].currentHp).toBe(0);
    });

    it('overkill damage is clamped', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);

      const applied = damageFortification(state, 0, 999);
      expect(applied).toBe(100); // Only applies up to remaining HP
    });
  });

  describe('Tower combat', () => {
    it('watchtower has damage and range stats', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'watchtower', 100);

      const tower = state.slots[0];
      expect(tower.damage).toBeGreaterThan(0);
      expect(tower.range).toBeGreaterThan(0);
    });

    it('tower respects attack cooldown', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'watchtower', 100);
      const tower = state.slots[0];

      // Fresh tower can attack immediately
      expect(canTowerAttack(tower, 100)).toBe(true);

      // After attacking, enters cooldown
      recordTowerAttack(tower, 100);
      expect(canTowerAttack(tower, 101)).toBe(false);
      expect(canTowerAttack(tower, 189)).toBe(false);
      expect(canTowerAttack(tower, 190)).toBe(true); // 90 frame cooldown
    });

    it('walls do NOT attack', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);

      expect(state.slots[0].damage).toBe(0);
      expect(canTowerAttack(state.slots[0], 1000)).toBe(false);
    });
  });

  describe('Queries', () => {
    it('getBlockingForts returns walls but not towers', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);
      placeFortification(state, 1, 'watchtower', 100);

      const blocking = getBlockingForts(state);
      expect(blocking.length).toBe(1);
      expect(blocking[0].fortType).toBe('wood_wall');
    });

    it('getActiveTowers returns towers but not walls', () => {
      const state = initFortificationState(3, 500, 500);
      placeFortification(state, 0, 'wood_wall', 100);
      placeFortification(state, 1, 'watchtower', 100);

      const towers = getActiveTowers(state);
      expect(towers.length).toBe(1);
      expect(towers[0].fortType).toBe('watchtower');
    });

    it('getEmptySlots excludes occupied and destroyed', () => {
      const state = initFortificationState(3, 500, 500);
      const totalSlots = state.slots.length;

      placeFortification(state, 0, 'wood_wall', 100);
      damageFortification(state, 0, 100); // Destroy it

      expect(getEmptySlots(state).length).toBe(totalSlots - 1);
    });

    it('countActiveForts groups by type', () => {
      const state = initFortificationState(5, 500, 500);
      placeFortification(state, 0, 'wood_wall', 200);
      placeFortification(state, 1, 'wood_wall', 200);
      placeFortification(state, 2, 'watchtower', 200);

      const counts = countActiveForts(state);
      expect(counts.wood_wall).toBe(2);
      expect(counts.watchtower).toBe(1);
    });
  });

  describe('Config validation', () => {
    it('fortifications.json defines at least 2 types', () => {
      const config = getFortificationsConfig();
      expect(Object.keys(config.types).length).toBeGreaterThanOrEqual(2);
    });

    it('all fort types have HP and cost', () => {
      const config = getFortificationsConfig();
      for (const [_id, def] of Object.entries(config.types)) {
        expect(def.hp).toBeGreaterThan(0);
        expect(def.cost.rocks).toBeGreaterThan(0);
      }
    });

    it('wood_wall costs Rocks and blocks movement', () => {
      const def = getFortDef('wood_wall');
      expect(def.cost.rocks).toBe(15);
      expect(def.blocks_movement).toBe(true);
    });

    it('watchtower has damage and range', () => {
      const def = getFortDef('watchtower');
      expect(def.damage).toBeGreaterThan(0);
      expect(def.range).toBeGreaterThan(0);
    });
  });
});
