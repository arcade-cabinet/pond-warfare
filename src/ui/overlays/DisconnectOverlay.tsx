/**
 * DisconnectOverlay — Shown when peer disconnects during gameplay.
 *
 * Displays a reconnection countdown, with options to continue solo
 * or return to the main menu. Game is paused while this is visible.
 */

import { useEffect, useState } from 'preact/hooks';
import { disconnectMultiplayer } from '@/net/multiplayer-controller';
import { MenuButton } from '../menu-button';
import { menuState } from '../store';
import { multiplayerDisconnected } from '../store-multiplayer';

const RECONNECT_SECONDS = 30;

export function DisconnectOverlay() {
  const [timeLeft, setTimeLeft] = useState(RECONNECT_SECONDS);

  useEffect(() => {
    if (!multiplayerDisconnected.value) return;
    setTimeLeft(RECONNECT_SECONDS);

    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleContinueSolo = () => {
    disconnectMultiplayer();
  };

  const handleReturnToMenu = () => {
    disconnectMultiplayer();
    menuState.value = 'main';
  };

  if (!multiplayerDisconnected.value) return null;

  return (
    <div class="modal-overlay" data-testid="disconnect-overlay">
      <div
        class="flex flex-col items-center gap-4 p-6 rounded-lg"
        style={{
          background: 'var(--pw-bg-surface)',
          border: '1px solid var(--pw-border-accent)',
          maxWidth: '360px',
        }}
      >
        <h2
          class="font-heading text-lg uppercase tracking-wider"
          style={{ color: 'var(--pw-hp-low)' }}
        >
          Player Disconnected
        </h2>

        {timeLeft > 0 ? (
          <p class="font-game text-sm text-center" style={{ color: 'var(--pw-text-secondary)' }}>
            Reconnecting... <span data-testid="reconnect-timer">{timeLeft}s</span>
          </p>
        ) : (
          <p class="font-game text-sm text-center" style={{ color: 'var(--pw-text-muted)' }}>
            Reconnection timed out.
          </p>
        )}

        <div class="flex flex-col gap-2">
          <MenuButton label="Continue Solo" wide onClick={handleContinueSolo} />
          <MenuButton label="Return to Menu" wide onClick={handleReturnToMenu} />
        </div>
      </div>
    </div>
  );
}
