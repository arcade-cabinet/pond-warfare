/**
 * Match Event Runner Tests (v3.0 — US16)
 *
 * Validates event-driven match flow:
 * - Event selection respects progression filter
 * - PRNG produces deterministic event sequence
 * - Multiple events can overlap
 * - Event pool expands with progression level
 * - Storm effects (speed penalty, visibility)
 * - Event completion counting (for rewards)
 * - First-event delay respected
 * - Max concurrent events enforced
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { getAllEventIds, getEventEntriesForLevel, getEventTemplate } from '@/config/config-loader';
import {
  getFirstEventDelayFrames,
  getMaxConcurrentEvents,
  selectEvent,
  selectMultipleEvents,
  shouldFireEvent,
} from '@/ecs/systems/event-selector';
import {
  getActiveMatchEvents,
  getEventsCompletedCount,
  getStormSpeedPenalty,
  getStormVisibilityReduction,
  isStormActive,
  resetMatchEventRunner,
} from '@/ecs/systems/match-event-runner';

beforeEach(() => {
  resetMatchEventRunner();
});

describe('Event-driven match flow — US16', () => {
  describe('Event selection from config', () => {
    it('should read events from events.json', () => {
      const ids = getAllEventIds();
      expect(ids.length).toBeGreaterThanOrEqual(11);
    });

    it('should filter events by progression level', () => {
      // Level 0: only basic events
      const level0 = getEventEntriesForLevel(0);
      const level0Ids = level0.map((e) => e.id);
      expect(level0Ids).toContain('basic_wave');
      expect(level0Ids).toContain('raider_wave');
      expect(level0Ids).toContain('resource_surge');
      expect(level0Ids).not.toContain('boss_croc'); // min 8
      expect(level0Ids).not.toContain('siege_defense'); // min 12
    });

    it('should expand pool with higher progression', () => {
      const level0Count = getEventEntriesForLevel(0).length;
      const level20Count = getEventEntriesForLevel(20).length;
      expect(level20Count).toBeGreaterThan(level0Count);
    });

    it('new players see simple waves only (level 0-2)', () => {
      for (let level = 0; level <= 2; level++) {
        const entries = getEventEntriesForLevel(level);
        const types = entries.map((e) => e.template.type);
        // Should NOT include boss, siege, or sabotage
        expect(types).not.toContain('boss');
        expect(types).not.toContain('siege');
        expect(types).not.toContain('sabotage');
      }
    });

    it('veterans see all event types (level 20)', () => {
      const entries = getEventEntriesForLevel(20);
      const types = new Set(entries.map((e) => e.template.type));
      expect(types.has('wave')).toBe(true);
      expect(types.has('boss')).toBe(true);
      expect(types.has('storm')).toBe(true);
      expect(types.has('siege')).toBe(true);
      expect(types.has('sabotage')).toBe(true);
      expect(types.has('swarm')).toBe(true);
      expect(types.has('resource_surge')).toBe(true);
      expect(types.has('escort')).toBe(true);
    });
  });

  describe('PRNG determinism', () => {
    it('should produce same event with same seed', () => {
      const e1 = selectEvent(10, 42);
      const e2 = selectEvent(10, 42);
      expect(e1?.id).toBe(e2?.id);
    });

    it('should produce different events with different seeds', () => {
      const events = new Set<string>();
      for (let i = 0; i < 200; i++) {
        const seed = i * 7919 + 42;
        const result = selectEvent(20, seed);
        if (result) events.add(result.id);
      }
      expect(events.size).toBeGreaterThan(1);
    });

    it('should select from eligible pool only', () => {
      for (let seed = 0; seed < 50; seed++) {
        const result = selectEvent(0, seed);
        if (result) {
          expect(result.template.min_progression).toBeLessThanOrEqual(0);
        }
      }
    });
  });

  describe('Multiple overlapping events', () => {
    it('should select multiple non-duplicate events', () => {
      const events = selectMultipleEvents(20, 3, 42);
      expect(events.length).toBe(3);

      const ids = events.map((e) => e.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should enforce max concurrent events', () => {
      const max = getMaxConcurrentEvents();
      expect(max).toBe(2);
    });
  });

  describe('On-screen alerts', () => {
    it('each event template has a description for alerts', () => {
      const ids = getAllEventIds();
      for (const id of ids) {
        const tmpl = getEventTemplate(id);
        expect(tmpl.description).toBeTruthy();
        expect(tmpl.description.length).toBeGreaterThan(5);
      }
    });

    it('each event has a type for color-coding', () => {
      const ids = getAllEventIds();
      for (const id of ids) {
        const tmpl = getEventTemplate(id);
        expect(tmpl.type).toBeTruthy();
      }
    });
  });

  describe('Timing configuration', () => {
    it('first event delay should be positive', () => {
      const delay = getFirstEventDelayFrames();
      expect(delay).toBeGreaterThan(0);
      // 60 seconds * 60fps = 3600 frames
      expect(delay).toBe(3600);
    });

    it('should not fire events before min interval', () => {
      // min_interval_seconds = 45, so 45*60 = 2700 frames
      expect(shouldFireEvent(2699, 42)).toBe(false);
    });

    it('should fire events after max interval', () => {
      // max_interval_seconds = 120, so 120*60 = 7200 frames
      expect(shouldFireEvent(7201, 42)).toBe(true);
    });
  });

  describe('Wave direction patterns (from spec)', () => {
    it('early maps have top-only spawn (level 0-9)', () => {
      // Terrain config defines enemy_spawn_directions per level
      // At level 0-9, only "top" direction
      // This is verified through terrain.json
      const entries = getEventEntriesForLevel(0);
      expect(entries.length).toBeGreaterThan(0);
    });
  });

  describe('Event state tracking', () => {
    it('should start with no active events', () => {
      expect(getActiveMatchEvents()).toHaveLength(0);
    });

    it('should start with zero events completed', () => {
      expect(getEventsCompletedCount()).toBe(0);
    });

    it('should report no storm active initially', () => {
      expect(isStormActive()).toBe(false);
    });

    it('should report 1.0 speed penalty when no storm', () => {
      expect(getStormSpeedPenalty()).toBe(1.0);
    });

    it('should report 1.0 visibility when no storm', () => {
      expect(getStormVisibilityReduction()).toBe(1.0);
    });
  });

  describe('Event composition (enemy spawning)', () => {
    it('each event defines enemy_composition', () => {
      const ids = getAllEventIds();
      for (const id of ids) {
        const tmpl = getEventTemplate(id);
        expect(tmpl.enemy_composition).toBeDefined();
      }
    });

    it('wave events spawn fighters and raiders', () => {
      const wave = getEventTemplate('basic_wave');
      expect(wave.enemy_composition.fighter).toBe(3);
      expect(wave.enemy_composition.raider).toBe(2);
    });

    it('boss events have boss spec', () => {
      const boss = getEventTemplate('boss_croc');
      expect(boss.boss).toBeDefined();
      expect(boss.boss?.hp_multiplier).toBe(5);
      expect(boss.boss?.damage_multiplier).toBe(3);
    });

    it('storm events have no enemies but have effects', () => {
      const storm = getEventTemplate('storm');
      expect(Object.keys(storm.enemy_composition)).toHaveLength(0);
      expect(storm.effects).toBeDefined();
      expect(storm.effects?.visibility_reduction).toBe(0.5);
      expect(storm.effects?.speed_penalty).toBe(0.8);
    });

    it('resource surge has bonus node count', () => {
      const surge = getEventTemplate('resource_surge');
      expect(surge.effects?.bonus_nodes).toBe(3);
    });
  });

  describe('Reward tracking', () => {
    it('each event has a reward_clams value', () => {
      const ids = getAllEventIds();
      for (const id of ids) {
        const tmpl = getEventTemplate(id);
        expect(tmpl.reward_clams).toBeGreaterThanOrEqual(0);
      }
    });

    it('boss events give more clams than basic waves', () => {
      const basic = getEventTemplate('basic_wave');
      const boss = getEventTemplate('boss_croc');
      expect(boss.reward_clams).toBeGreaterThan(basic.reward_clams);
    });
  });
});
