/**
 * EventFeed — scrolling event log in the bottom-left corner.
 *
 * Shows the last 4-5 game events (training, research, deaths, waves)
 * with color-coded text that auto-fades after 8 seconds (480 frames).
 */

import { gameEvents } from '../store';

const EVENT_MAX_AGE = 480; // frames (~8 seconds at 60fps)

export function EventFeed() {
  const events = gameEvents.value;
  if (events.length === 0) return null;

  return (
    <div
      class="absolute bottom-16 left-2 z-20 flex flex-col gap-0.5 pointer-events-none"
      style={{ maxWidth: '260px' }}
    >
      {events.map((ev, i) => {
        const age = events.length > 0 ? events[events.length - 1].frame - ev.frame : 0;
        const fadeRatio = Math.max(0, 1 - age / EVENT_MAX_AGE);
        return (
          <div
            key={`${ev.frame}-${i}`}
            class="font-heading text-[11px] leading-tight px-1.5 py-0.5 rounded"
            style={{
              color: ev.color,
              opacity: Math.max(0.3, fadeRatio),
              background: 'var(--pw-overlay-75)',
              borderLeft: `2px solid ${ev.color}`,
            }}
          >
            {ev.text}
          </div>
        );
      })}
    </div>
  );
}
