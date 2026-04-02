/**
 * MultiplayerLobby — Pre-game lobby after both players connect.
 *
 * Shows player list, host settings, commander selection, ready toggles.
 * Host clicks "Start Game" when both players are ready.
 */

import { useCallback } from 'preact/hooks';
import { COMMANDERS } from '@/config/commanders';
import type { LobbyPlayer } from '@/net/types';
import { MenuButton } from '../menu-button';
import { menuState, selectedCommander } from '../store';
import {
  multiplayerAllReady,
  multiplayerHostSettings,
  multiplayerIsHost,
  multiplayerLobbyPlayers,
  multiplayerMode,
  multiplayerView,
} from '../store-multiplayer';

export function MultiplayerLobby() {
  const players = multiplayerLobbyPlayers.value;
  const settings = multiplayerHostSettings.value;
  const isHost = multiplayerIsHost.value;
  const allReady = multiplayerAllReady.value;

  const handleCommanderChange = useCallback((commanderId: string) => {
    selectedCommander.value = commanderId;
  }, []);

  const handleToggleReady = useCallback(() => {
    const players = multiplayerLobbyPlayers.value;
    const selfId = isHost ? players.find((p) => p.isHost)?.id : players.find((p) => !p.isHost)?.id;
    if (!selfId) return;
    multiplayerLobbyPlayers.value = players.map((p) =>
      p.id === selfId ? { ...p, ready: !p.ready } : p,
    );
  }, [isHost]);

  const handleStartGame = useCallback(() => {
    multiplayerMode.value = true;
    menuState.value = 'playing';
  }, []);

  const handleBack = useCallback(() => {
    multiplayerView.value = 'menu';
  }, []);

  return (
    <div class="modal-overlay" data-testid="multiplayer-lobby">
      <div class="modal-scroll" style={{ maxWidth: '480px' }}>
        <h2
          class="font-heading text-xl tracking-wider uppercase text-center mb-4"
          style={{ color: 'var(--pw-accent)' }}
        >
          Lobby
        </h2>

        {/* Player list */}
        <div class="flex flex-col gap-2 mb-4">
          {players.map((player) => (
            <PlayerRow key={player.id} player={player} />
          ))}
          {players.length < 2 && (
            <p class="font-game text-xs text-center" style={{ color: 'var(--pw-text-muted)' }}>
              Waiting for second player...
            </p>
          )}
        </div>

        {/* Host settings */}
        {settings && (
          <div
            class="rounded p-3 mb-4"
            style={{ background: 'var(--pw-bg-elevated)', border: '1px solid var(--pw-border)' }}
          >
            <h3
              class="font-heading text-sm uppercase mb-2"
              style={{ color: 'var(--pw-text-secondary)' }}
            >
              Game Settings
            </h3>
            <div
              class="font-game text-xs grid grid-cols-2 gap-1"
              style={{ color: 'var(--pw-text-primary)' }}
            >
              <span style={{ color: 'var(--pw-text-muted)' }}>Map:</span>
              <span>{settings.scenario}</span>
              <span style={{ color: 'var(--pw-text-muted)' }}>Difficulty:</span>
              <span>{settings.difficulty}</span>
              <span style={{ color: 'var(--pw-text-muted)' }}>Seed:</span>
              <span>{settings.mapSeed}</span>
            </div>
          </div>
        )}

        {/* Commander picker */}
        <CommanderPicker selected={selectedCommander.value} onChange={handleCommanderChange} />

        {/* Actions */}
        <div class="flex flex-col items-center gap-2 mt-4">
          <MenuButton label="Toggle Ready" wide onClick={handleToggleReady} />
          {isHost && (
            <MenuButton label="Start Game" wide onClick={handleStartGame} disabled={!allReady} />
          )}
          <MenuButton label="Back" onClick={handleBack} />
        </div>
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: LobbyPlayer }) {
  const readyColor = player.ready ? 'var(--pw-success)' : 'var(--pw-text-muted)';
  return (
    <div
      class="flex items-center justify-between px-3 py-2 rounded"
      style={{ background: 'var(--pw-bg-elevated)', border: '1px solid var(--pw-border)' }}
      data-testid={`player-row-${player.id}`}
    >
      <div class="flex items-center gap-2">
        <span class="font-game text-sm" style={{ color: 'var(--pw-text-primary)' }}>
          {player.name}
        </span>
        {player.isHost && (
          <span class="font-game text-xs" style={{ color: 'var(--pw-accent)' }}>
            (Host)
          </span>
        )}
      </div>
      <span class="font-game text-xs" style={{ color: readyColor }}>
        {player.ready ? 'Ready' : 'Not Ready'}
      </span>
    </div>
  );
}

function CommanderPicker(props: { selected: string; onChange: (id: string) => void }) {
  return (
    <div>
      <h3 class="font-heading text-sm uppercase mb-2" style={{ color: 'var(--pw-text-secondary)' }}>
        Commander
      </h3>
      <div class="flex flex-wrap gap-2">
        {COMMANDERS.map((cmd) => (
          <button
            key={cmd.id}
            type="button"
            class="px-3 py-1 rounded font-game text-xs cursor-pointer"
            style={{
              background:
                props.selected === cmd.id ? 'var(--pw-accent-dim)' : 'var(--pw-bg-elevated)',
              color:
                props.selected === cmd.id ? 'var(--pw-accent-bright)' : 'var(--pw-text-secondary)',
              border: `1px solid ${props.selected === cmd.id ? 'var(--pw-accent)' : 'var(--pw-border)'}`,
            }}
            onClick={() => props.onChange(cmd.id)}
          >
            {cmd.name}
          </button>
        ))}
      </div>
    </div>
  );
}
