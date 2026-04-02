/**
 * MultiplayerLobby Tests
 *
 * Validates player list rendering, host settings display, commander
 * selection, and ready toggle behavior.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return { screenClass: signal('large'), canDockPanels: signal(false) };
});

import type { LobbyPlayer } from '@/net/types';
import { MultiplayerLobby } from '@/ui/screens/MultiplayerLobby';
import { selectedCommander } from '@/ui/store';
import {
  multiplayerHostSettings,
  multiplayerIsHost,
  multiplayerLobbyPlayers,
} from '@/ui/store-multiplayer';

const MOCK_PLAYERS: LobbyPlayer[] = [
  { id: 'host-1', name: 'Player 1', commander: 'marshal', ready: false, isHost: true },
  { id: 'guest-1', name: 'Player 2', commander: 'sage', ready: false, isHost: false },
];

beforeEach(() => {
  multiplayerLobbyPlayers.value = [...MOCK_PLAYERS];
  multiplayerIsHost.value = true;
  multiplayerHostSettings.value = {
    scenario: 'standard',
    difficulty: 'normal',
    mapSeed: 42,
  };
  selectedCommander.value = 'marshal';
});

afterEach(() => {
  cleanup();
});

describe('MultiplayerLobby', () => {
  it('renders both player names', () => {
    render(h(MultiplayerLobby, {}));
    const lobby = document.querySelector('[data-testid="multiplayer-lobby"]');
    expect(lobby).not.toBeNull();
    expect(lobby?.textContent).toContain('Player 1');
    expect(lobby?.textContent).toContain('Player 2');
  });

  it('shows host indicator on host player', () => {
    render(h(MultiplayerLobby, {}));
    const hostRow = document.querySelector('[data-testid="player-row-host-1"]');
    expect(hostRow?.textContent).toContain('(Host)');
  });

  it('displays game settings from host', () => {
    render(h(MultiplayerLobby, {}));
    const lobby = document.querySelector('[data-testid="multiplayer-lobby"]');
    expect(lobby?.textContent).toContain('standard');
    expect(lobby?.textContent).toContain('normal');
    expect(lobby?.textContent).toContain('42');
  });

  it('shows Not Ready status initially', () => {
    render(h(MultiplayerLobby, {}));
    const rows = document.querySelectorAll('[data-testid^="player-row-"]');
    for (const row of rows) {
      expect(row.textContent).toContain('Not Ready');
    }
  });

  it('toggles ready state on button click', () => {
    render(h(MultiplayerLobby, {}));
    const readyBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Toggle Ready'),
    );
    fireEvent.click(readyBtn!);

    const hostPlayer = multiplayerLobbyPlayers.value.find((p) => p.isHost);
    expect(hostPlayer?.ready).toBe(true);
  });

  it('Start Game is disabled when not all players are ready', () => {
    render(h(MultiplayerLobby, {}));
    const startBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Start Game'),
    );
    expect(startBtn?.disabled).toBe(true);
  });

  it('shows waiting message when fewer than 2 players', () => {
    multiplayerLobbyPlayers.value = [MOCK_PLAYERS[0]];
    render(h(MultiplayerLobby, {}));
    const lobby = document.querySelector('[data-testid="multiplayer-lobby"]');
    expect(lobby?.textContent).toContain('Waiting for second player');
  });
});
