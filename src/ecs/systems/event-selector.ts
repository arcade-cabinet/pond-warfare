/**
 * Event Selector System
 *
 * Config-driven event selection that reads from configs/events.json.
 * Filters event templates by progression level and selects via seeded PRNG.
 *
 * This module replaces the hardcoded EVENT_POOL in random-events.ts
 * with data-driven selection based on min/max_progression from JSON config.
 */

import type { EventEntry } from '@/config/config-loader';
import { getEventEntriesForLevel, getEventTiming } from '@/config/config-loader';
import type { EventTiming } from '@/config/v3-types';
import { SeededRandom } from '@/utils/random';

/** Result of selecting an event: the template ID + full template data. */
export type SelectedEvent = EventEntry;

/**
 * Select a random event appropriate for the given progression level.
 *
 * Uses seeded PRNG so results are deterministic given the same seed.
 * Returns null if no events are available for this level.
 *
 * @param progressionLevel - Current player progression (0+)
 * @param seed - PRNG seed (typically mapSeed + frameCount)
 */
export function selectEvent(progressionLevel: number, seed: number): SelectedEvent | null {
  const eligible = getEventEntriesForLevel(progressionLevel);
  if (eligible.length === 0) return null;

  const rng = new SeededRandom(seed);
  const idx = rng.int(0, eligible.length);
  return eligible[idx];
}

/**
 * Select multiple non-duplicate events for concurrent event scenarios.
 *
 * @param progressionLevel - Current player progression
 * @param count - Number of events to select (capped by available pool)
 * @param seed - PRNG seed
 */
export function selectMultipleEvents(
  progressionLevel: number,
  count: number,
  seed: number,
): SelectedEvent[] {
  const eligible = getEventEntriesForLevel(progressionLevel);
  if (eligible.length === 0) return [];

  const rng = new SeededRandom(seed);
  const shuffled = [...eligible];
  rng.shuffle(shuffled);

  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Check whether enough time has elapsed since the last event
 * based on the timing config from events.json.
 *
 * @param framesSinceLastEvent - Frames since the last event fired
 * @param seed - PRNG seed for randomizing interval within range
 */
export function shouldFireEvent(framesSinceLastEvent: number, seed: number): boolean {
  const timing = getEventTiming();
  const minFrames = timing.min_interval_seconds * 60;
  const maxFrames = timing.max_interval_seconds * 60;

  if (framesSinceLastEvent < minFrames) return false;

  const rng = new SeededRandom(seed);
  const threshold = minFrames + rng.next() * (maxFrames - minFrames);
  return framesSinceLastEvent >= threshold;
}

/**
 * Get the first-event delay in frames from the timing config.
 */
export function getFirstEventDelayFrames(): number {
  return getEventTiming().first_event_delay_seconds * 60;
}

/**
 * Get the maximum number of concurrent events allowed.
 */
export function getMaxConcurrentEvents(): number {
  return getEventTiming().max_concurrent_events;
}

/**
 * Get the event timing configuration (for testing and display).
 */
export function getTimingConfig(): EventTiming {
  return getEventTiming();
}
