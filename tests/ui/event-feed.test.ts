/**
 * Event Feed Tests
 *
 * Validates pushGameEvent, pruneGameEvents, and max event cap.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { pruneGameEvents, pushGameEvent } from '@/ui/game-events';
import { gameEvents } from '@/ui/store';

describe('Event Feed', () => {
  beforeEach(() => {
    gameEvents.value = [];
  });

  it('pushGameEvent adds events with correct text, color, and frame', () => {
    pushGameEvent('Unit trained', '#22c55e', 100);
    expect(gameEvents.value).toHaveLength(1);
    expect(gameEvents.value[0]).toEqual({ text: 'Unit trained', color: '#22c55e', frame: 100 });
  });

  it('max 5 events visible — oldest pruned on push', () => {
    for (let i = 0; i < 7; i++) {
      pushGameEvent(`Event ${i}`, '#fff', i * 10);
    }
    expect(gameEvents.value).toHaveLength(5);
    // Oldest events (0,1) should be gone; newest 5 remain
    expect(gameEvents.value[0].text).toBe('Event 2');
    expect(gameEvents.value[4].text).toBe('Event 6');
  });

  it('pruneGameEvents removes events older than maxAge', () => {
    pushGameEvent('Old event', '#fff', 100);
    pushGameEvent('New event', '#fff', 500);

    // At frame 590, maxAge 480: event at frame 100 is 490 frames old (> 480)
    pruneGameEvents(590, 480);

    expect(gameEvents.value).toHaveLength(1);
    expect(gameEvents.value[0].text).toBe('New event');
  });

  it('pruneGameEvents keeps events within maxAge', () => {
    pushGameEvent('Recent event', '#fff', 500);

    pruneGameEvents(550, 480);

    expect(gameEvents.value).toHaveLength(1);
    expect(gameEvents.value[0].text).toBe('Recent event');
  });
});
