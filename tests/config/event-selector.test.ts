/**
 * Event Selector Tests
 *
 * Validates config-driven event selection from events.json:
 * - Progression level filtering
 * - PRNG determinism
 * - Multiple event selection
 * - Timing calculations
 */

import { describe, expect, it } from 'vitest';
import { getAllEventIds, getEventEntriesForLevel, getEventTemplate } from '@/config/config-loader';
import {
  getFirstEventDelayFrames,
  getMaxConcurrentEvents,
  getTimingConfig,
  selectEvent,
  selectMultipleEvents,
  shouldFireEvent,
} from '@/ecs/systems/event-selector';

describe('Event config loading', () => {
  it('should load all event templates from events.json', () => {
    const ids = getAllEventIds();
    expect(ids.length).toBeGreaterThanOrEqual(11);
    expect(ids).toContain('basic_wave');
    expect(ids).toContain('boss_croc');
    expect(ids).toContain('storm');
    expect(ids).toContain('resource_surge');
    expect(ids).toContain('escort_mission');
  });

  it('should load event template by ID with all required fields', () => {
    const tmpl = getEventTemplate('basic_wave');
    expect(tmpl.type).toBe('wave');
    expect(tmpl.min_progression).toBe(0);
    expect(tmpl.max_progression).toBe(999);
    expect(tmpl.duration_seconds).toBeGreaterThan(0);
    expect(tmpl.reward_clams).toBeGreaterThan(0);
    expect(tmpl.enemy_composition).toBeDefined();
    expect(tmpl.description).toBeTruthy();
  });

  it('should throw for unknown event ID', () => {
    expect(() => getEventTemplate('nonexistent')).toThrow('Unknown event');
  });
});

describe('Event progression filtering', () => {
  it('should return all level-0 events for a new player', () => {
    const entries = getEventEntriesForLevel(0);
    // basic_wave, raider_wave, resource_surge all have min_progression 0
    expect(entries.length).toBeGreaterThanOrEqual(3);
    const ids = entries.map((e) => e.id);
    expect(ids).toContain('basic_wave');
    expect(ids).toContain('raider_wave');
    expect(ids).toContain('resource_surge');
  });

  it('should include more events at higher progression', () => {
    const level0 = getEventEntriesForLevel(0);
    const level10 = getEventEntriesForLevel(10);
    const level20 = getEventEntriesForLevel(20);

    expect(level10.length).toBeGreaterThanOrEqual(level0.length);
    expect(level20.length).toBeGreaterThanOrEqual(level10.length);
  });

  it('should include boss_croc at progression 8+', () => {
    const level7 = getEventEntriesForLevel(7);
    const level8 = getEventEntriesForLevel(8);

    const ids7 = level7.map((e) => e.id);
    const ids8 = level8.map((e) => e.id);

    expect(ids7).not.toContain('boss_croc');
    expect(ids8).toContain('boss_croc');
  });

  it('should include sabotage_raid at progression 15+', () => {
    const level14 = getEventEntriesForLevel(14);
    const level15 = getEventEntriesForLevel(15);

    const ids14 = level14.map((e) => e.id);
    const ids15 = level15.map((e) => e.id);

    expect(ids14).not.toContain('sabotage_raid');
    expect(ids15).toContain('sabotage_raid');
  });
});

describe('selectEvent', () => {
  it('should return a valid event for level 0', () => {
    const result = selectEvent(0, 42);
    expect(result).not.toBeNull();
    expect(result?.id).toBeTruthy();
    expect(result?.template).toBeDefined();
    expect(result?.template.type).toBeTruthy();
  });

  it('should be deterministic with the same seed', () => {
    const result1 = selectEvent(10, 12345);
    const result2 = selectEvent(10, 12345);
    expect(result1?.id).toBe(result2?.id);
  });

  it('should produce different events with different seeds', () => {
    const events = new Set<string>();
    // Use large spread-out seeds like the game does (mapSeed + frameCount)
    // The LCG's first output for consecutive small seeds may cluster,
    // but widely-spaced seeds produce good distribution.
    for (let i = 0; i < 200; i++) {
      const seed = i * 7919 + 42; // spread across large range
      const result = selectEvent(20, seed);
      if (result) events.add(result.id);
    }
    // 12 eligible events at level 20 — expect at least a few distinct
    expect(events.size).toBeGreaterThan(1);
  });

  it('should only return events within progression range', () => {
    for (let seed = 0; seed < 50; seed++) {
      const result = selectEvent(0, seed);
      if (result) {
        expect(result.template.min_progression).toBeLessThanOrEqual(0);
        expect(result.template.max_progression).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('selectMultipleEvents', () => {
  it('should return requested count (when enough events available)', () => {
    const results = selectMultipleEvents(20, 3, 42);
    expect(results.length).toBe(3);
  });

  it('should not return duplicates', () => {
    const results = selectMultipleEvents(20, 5, 42);
    const ids = results.map((e) => e.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should cap at available pool size', () => {
    const level0Events = getEventEntriesForLevel(0);
    const results = selectMultipleEvents(0, 100, 42);
    expect(results.length).toBeLessThanOrEqual(level0Events.length);
  });

  it('should return empty array for impossible progression level', () => {
    // All events have max_progression 999, so 1000 would have nothing
    const results = selectMultipleEvents(1000, 3, 42);
    expect(results).toHaveLength(0);
  });
});

describe('Event timing', () => {
  it('should load timing config from events.json', () => {
    const timing = getTimingConfig();
    expect(timing.first_event_delay_seconds).toBeGreaterThan(0);
    expect(timing.min_interval_seconds).toBeGreaterThan(0);
    expect(timing.max_interval_seconds).toBeGreaterThan(timing.min_interval_seconds);
    expect(timing.max_concurrent_events).toBeGreaterThan(0);
  });

  it('should calculate first event delay in frames', () => {
    const timing = getTimingConfig();
    const delayFrames = getFirstEventDelayFrames();
    expect(delayFrames).toBe(timing.first_event_delay_seconds * 60);
  });

  it('should report max concurrent events', () => {
    const max = getMaxConcurrentEvents();
    expect(max).toBe(2); // From events.json
  });

  it('shouldFireEvent returns false before min interval', () => {
    const timing = getTimingConfig();
    const tooEarly = timing.min_interval_seconds * 60 - 1;
    expect(shouldFireEvent(tooEarly, 42)).toBe(false);
  });

  it('shouldFireEvent returns true after max interval', () => {
    const timing = getTimingConfig();
    const lateEnough = timing.max_interval_seconds * 60 + 1;
    expect(shouldFireEvent(lateEnough, 42)).toBe(true);
  });

  it('shouldFireEvent is deterministic with same seed', () => {
    const timing = getTimingConfig();
    // Use a middle value between min and max
    const midFrames = ((timing.min_interval_seconds + timing.max_interval_seconds) / 2) * 60;
    const result1 = shouldFireEvent(midFrames, 42);
    const result2 = shouldFireEvent(midFrames, 42);
    expect(result1).toBe(result2);
  });
});
