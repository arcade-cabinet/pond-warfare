/**
 * EventAlert — top-center on-screen alert for match events.
 *
 * Displays "WAVE INCOMING -- FROM NORTH" style text for 3 seconds,
 * then fades out. Tapping the alert smooth-pans the camera to the
 * spawn location (T27 zoom-to-action).
 *
 * Uses font-heading + grittyGold from design tokens.
 */

import { useEffect, useState } from 'preact/hooks';
import { game } from '@/game';
import { type EventAlertData, eventAlert } from '../store-v3';

const DISPLAY_MS = 3000;

export function EventAlert() {
  const [alert, setAlert] = useState<EventAlertData | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Subscribe to eventAlert signal changes
    const unsubscribe = eventAlert.subscribe((data) => {
      if (!data) {
        setAlert(null);
        return;
      }
      setAlert(data);
      setFading(false);

      const fadeTimer = setTimeout(() => setFading(true), DISPLAY_MS - 500);
      const hideTimer = setTimeout(() => {
        setAlert(null);
        eventAlert.value = null;
      }, DISPLAY_MS);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(hideTimer);
      };
    });
    return unsubscribe;
  }, []);

  if (!alert) return null;

  const handleTap = () => {
    game.smoothPanTo(alert.spawnX, alert.spawnY);
  };

  return (
    <div
      class="absolute top-12 left-1/2 z-30"
      style={{
        transform: 'translateX(-50%)',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease-out',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      onClick={handleTap}
      onTouchEnd={handleTap}
      role="alert"
    >
      <div
        class="font-heading text-sm px-4 py-2 rounded-lg"
        style={{
          color: 'var(--pw-gold)',
          background: 'var(--pw-overlay-75)',
          border: '1px solid var(--pw-gold-dim)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
        }}
      >
        {alert.text}
      </div>
    </div>
  );
}
