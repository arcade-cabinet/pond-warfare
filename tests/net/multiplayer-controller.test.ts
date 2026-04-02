import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock trystero/nostr before any imports that use it
vi.mock('trystero/nostr', () => {
  const mockRoom = {
    makeAction: vi.fn(() => [vi.fn(), vi.fn()]),
    onPeerJoin: vi.fn(),
    onPeerLeave: vi.fn(),
    leave: vi.fn().mockResolvedValue(undefined),
  };
  return {
    joinRoom: vi.fn(() => mockRoom),
    selfId: 'mock-self-id',
  };
});

// Mock the Game singleton so setLockstep doesn't need a real game loop
vi.mock('@/game', () => ({
  game: { setLockstep: vi.fn(), world: {} },
}));

import { game } from '@/game';
import {
  disconnectMultiplayer,
  getConnection,
  getLockstep,
  hostGame,
  joinGame,
  startMultiplayerGame,
} from '@/net/multiplayer-controller';
import * as mp from '@/ui/store-multiplayer';

describe('multiplayer-controller', () => {
  beforeEach(() => {
    // Reset all multiplayer store signals to defaults
    mp.multiplayerMode.value = false;
    mp.multiplayerConnected.value = false;
    mp.multiplayerDisconnected.value = false;
    mp.multiplayerRoomCode.value = '';
    mp.multiplayerPeerId.value = '';
    mp.multiplayerIsHost.value = false;
    mp.multiplayerPing.value = 0;
    mp.multiplayerLobbyPlayers.value = [];
    mp.multiplayerHostSettings.value = null;
    // Clean up any leftover connection
    disconnectMultiplayer();
  });

  afterEach(() => {
    disconnectMultiplayer();
  });

  it('hostGame creates a connection and sets store signals', () => {
    const code = hostGame();
    expect(code).toHaveLength(6);
    expect(mp.multiplayerRoomCode.value).toBe(code);
    expect(mp.multiplayerIsHost.value).toBe(true);
    expect(getConnection()).not.toBeNull();
  });

  it('joinGame connects with the given code', () => {
    joinGame('ABC123');
    expect(mp.multiplayerRoomCode.value).toBe('ABC123');
    expect(mp.multiplayerIsHost.value).toBe(false);
    expect(getConnection()).not.toBeNull();
  });

  it('hostGame replaces a previous connection', () => {
    hostGame();
    const first = getConnection();
    hostGame();
    const second = getConnection();
    expect(first).not.toBe(second);
  });

  it('startMultiplayerGame sets up lockstep and transitions to playing', () => {
    hostGame();
    startMultiplayerGame();

    expect(mp.multiplayerMode.value).toBe(true);
    expect(getLockstep()).not.toBeNull();
    expect(getLockstep()?.playerId).toBe('host');
    expect(game.setLockstep).toHaveBeenCalledWith(getLockstep());
  });

  it('startMultiplayerGame as guest uses guest playerId', () => {
    joinGame('XYZ789');
    startMultiplayerGame();

    expect(getLockstep()?.playerId).toBe('guest');
  });

  it('startMultiplayerGame is a no-op without a connection', () => {
    startMultiplayerGame();
    expect(mp.multiplayerMode.value).toBe(false);
    expect(getLockstep()).toBeNull();
  });

  it('disconnectMultiplayer cleans up all state', () => {
    hostGame();
    startMultiplayerGame();
    expect(getConnection()).not.toBeNull();
    expect(getLockstep()).not.toBeNull();

    disconnectMultiplayer();

    expect(getConnection()).toBeNull();
    expect(getLockstep()).toBeNull();
    expect(mp.multiplayerMode.value).toBe(false);
    expect(mp.multiplayerConnected.value).toBe(false);
    expect(mp.multiplayerDisconnected.value).toBe(false);
    expect(mp.multiplayerRoomCode.value).toBe('');
    expect(mp.multiplayerPeerId.value).toBe('');
    expect(game.setLockstep).toHaveBeenCalledWith(null);
  });

  it('disconnectMultiplayer is safe to call when not connected', () => {
    expect(() => disconnectMultiplayer()).not.toThrow();
  });
});
