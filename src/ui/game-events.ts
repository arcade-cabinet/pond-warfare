/**
 * Game Event Feed — push helper
 *
 * Pushes events to the gameEvents signal for the HUD event feed.
 * Auto-trims to the most recent 5 events.
 */

import { type GameEvent, gameEvents } from './store';

const MAX_EVENTS = 5;

/** Push a new event into the event feed. */
export function pushGameEvent(text: string, color: string, frame: number): void {
  const next: GameEvent[] = [...gameEvents.value, { text, color, frame }];
  if (next.length > MAX_EVENTS) next.splice(0, next.length - MAX_EVENTS);
  gameEvents.value = next;
}

/** Remove events older than `maxAge` frames from current frame. */
export function pruneGameEvents(currentFrame: number, maxAge: number): void {
  const filtered = gameEvents.value.filter((e) => currentFrame - e.frame < maxAge);
  if (filtered.length !== gameEvents.value.length) {
    gameEvents.value = filtered;
  }
}
