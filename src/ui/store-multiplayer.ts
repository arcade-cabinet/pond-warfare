/**
 * Store — Multiplayer Signals
 *
 * Reactive state for P2P co-op: connection status, room codes, lobby, and ping.
 */

import { computed, signal } from '@preact/signals';
import type { ConnectionQuality, HostSettings, LobbyPlayer } from '@/net/types';

// ---- Connection state ----
export const multiplayerMode = signal(false);
export const multiplayerConnected = signal(false);
export const multiplayerPing = signal(0);
export const multiplayerPeerId = signal('');
export const multiplayerRoomCode = signal('');
export const multiplayerDisconnected = signal(false);
export const multiplayerHostSettings = signal<HostSettings | null>(null);

// ---- Lobby state ----
export const multiplayerIsHost = signal(false);
export const multiplayerLobbyPlayers = signal<LobbyPlayer[]>([]);
export const multiplayerAllReady = computed(() => {
  const players = multiplayerLobbyPlayers.value;
  return players.length >= 2 && players.every((p) => p.ready);
});

// ---- Menu navigation ----
export const multiplayerMenuOpen = signal(false);
export type MultiplayerView = 'menu' | 'lobby';
export const multiplayerView = signal<MultiplayerView>('menu');

// ---- In-game lockstep state ----
export const multiplayerStalled = signal(false);

// ---- Connection quality derived ----
export const connectionQuality = computed<ConnectionQuality>(() => {
  if (multiplayerDisconnected.value) return 'disconnected';
  if (multiplayerPing.value > 200) return 'degraded';
  return 'connected';
});
