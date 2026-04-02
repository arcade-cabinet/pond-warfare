/**
 * ConnectionStatus — In-game HUD showing peer connection quality and ping.
 *
 * Positioned top-right, small and unobtrusive. Shows colored dot,
 * ping in ms, and peer name.
 */

import {
  connectionQuality,
  multiplayerMode,
  multiplayerPeerId,
  multiplayerPing,
} from '../store-multiplayer';

const QUALITY_COLORS = {
  connected: 'var(--pw-success)',
  degraded: 'var(--pw-warning)',
  disconnected: 'var(--pw-hp-low)',
} as const;

export function ConnectionStatus() {
  if (!multiplayerMode.value) return null;

  const quality = connectionQuality.value;
  const ping = multiplayerPing.value;
  const peerId = multiplayerPeerId.value;
  const dotColor = QUALITY_COLORS[quality];

  return (
    <div
      class="absolute top-12 right-2 z-30 flex items-center gap-2 px-2 py-1 rounded"
      style={{
        background: 'var(--pw-surface-panel-light)',
        backdropFilter: 'blur(4px)',
        border: '1px solid var(--pw-border)',
      }}
      data-testid="connection-status"
    >
      {/* Dot indicator */}
      <span
        class="inline-block w-2 h-2 rounded-full"
        style={{ background: dotColor }}
        data-testid="connection-dot"
      />

      {/* Ping */}
      <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
        {ping}ms
      </span>

      {/* Peer name */}
      {peerId && (
        <span class="font-game text-xs" style={{ color: 'var(--pw-text-muted)' }}>
          {peerId}
        </span>
      )}
    </div>
  );
}
