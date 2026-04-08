/**
 * Multiplayer Controller -- bridge between UI signals and the P2P network layer.
 *
 * Owns the PeerConnection and LockstepSync instances. UI components call
 * these functions; reactive store signals update automatically so the UI
 * re-renders without direct coupling to Trystero.
 */

import { game } from '@/game';
import { mapScenario, menuState, selectedCommander, selectedDifficulty } from '@/ui/store';
import * as mp from '@/ui/store-multiplayer';
import {
  buildAdversarialCommanderDestroyedMessage,
  buildAdversarialLodgeDestroyedMessage,
} from './adversarial-rules';
import { createRoom, generateRoomCode, type PeerConnection } from './connection';
import {
  applyCoopPing,
  applyResourceSync,
  buildLodgeDestroyedMessage,
  buildResourceSyncMessage,
} from './coop-rules';
import { LockstepSync } from './lockstep';
import type { MatchMode, NetMessage, PlayerId } from './types';

let connection: PeerConnection | null = null;
let lockstep: LockstepSync | null = null;

// ---- Accessors (for tests / external inspection) ----

export function getConnection(): PeerConnection | null {
  return connection;
}

export function getLockstep(): LockstepSync | null {
  return lockstep;
}

// ---- Host / Join ----

/** Create a room as host. Returns the generated room code. */
export function hostGame(): string {
  cleanup();
  const code = generateRoomCode();
  connection = createRoom(code);
  mp.multiplayerRoomCode.value = code;
  mp.multiplayerIsHost.value = true;
  mp.multiplayerView.value = 'menu';
  wireConnectionEvents(connection);
  return code;
}

/** Join an existing room by code. */
export function joinGame(code: string): void {
  cleanup();
  connection = createRoom(code);
  mp.multiplayerRoomCode.value = code;
  mp.multiplayerIsHost.value = false;
  mp.multiplayerView.value = 'menu';
  wireConnectionEvents(connection);
}

// ---- Lobby ----

/** Send the local player's ready state to the peer. */
export function sendReady(): void {
  connection?.sendMeta({ type: 'ready' });
}

/** Host broadcasts current game settings to the guest. */
export function sendSettings(matchMode: MatchMode = 'coop'): void {
  if (!connection) return;
  const seed = Math.floor(Math.random() * 2_147_483_647);
  const msg: NetMessage = {
    type: 'settings',
    seed,
    difficulty: selectedDifficulty.value,
    scenario: mapScenario.value,
    commander: selectedCommander.value,
    matchMode,
  };
  connection.sendMeta(msg);
  mp.multiplayerHostSettings.value = {
    scenario: mapScenario.value,
    difficulty: selectedDifficulty.value,
    mapSeed: seed,
    matchMode,
  };
}

// ---- Start Game ----

/** Transition from lobby to active gameplay with lockstep sync. */
export function startMultiplayerGame(matchMode: MatchMode = 'coop'): void {
  if (!connection) return;
  const playerId: PlayerId = mp.multiplayerIsHost.value ? 'host' : 'guest';
  lockstep = new LockstepSync(playerId, 3);
  lockstep.attach(connection);

  // Wire incoming commands into lockstep buffer
  connection.onCmd((msg) => {
    lockstep?.receiveRemote(msg.frame, msg.commands);
  });

  connection.startPing();

  // Attach lockstep to the game loop via the Game singleton
  game.setLockstep(lockstep);

  mp.multiplayerMode.value = true;
  mp.multiplayerDisconnected.value = false;
  menuState.value = 'playing';

  // Enable the chosen mode on the world
  const world = game.world;
  if (world) {
    if (matchMode === 'adversarial') {
      world.adversarialMode = true;
      world.coopMode = false;
    } else {
      world.coopMode = true;
      world.adversarialMode = false;
      world.coopResourceCallback = () => {
        if (!connection) return;
        connection.sendMeta(buildResourceSyncMessage(world));
      };
    }
  }
}

// ---- Co-op: Send Ground Ping ----

/** Broadcast a world-space ground ping to the co-op partner. */
export function sendCoopPing(x: number, y: number): void {
  connection?.sendMeta({ type: 'coop-ping', x, y });
}

/** Notify partner that our Lodge was destroyed. */
export function sendLodgeDestroyed(): void {
  connection?.sendMeta(buildLodgeDestroyedMessage());
}

// ---- Adversarial: Notify opponent ----

/** Notify opponent that we destroyed their Lodge. */
export function sendAdversarialLodgeDestroyed(): void {
  connection?.sendMeta(buildAdversarialLodgeDestroyedMessage());
}

/** Notify opponent that we destroyed their Commander. */
export function sendAdversarialCommanderDestroyed(): void {
  connection?.sendMeta(buildAdversarialCommanderDestroyedMessage());
}

// ---- Disconnect ----

/** Tear down multiplayer state and return to single-player mode. */
export function disconnectMultiplayer(): void {
  cleanup();
  mp.multiplayerMode.value = false;
  mp.multiplayerConnected.value = false;
  mp.multiplayerDisconnected.value = false;
  mp.multiplayerRoomCode.value = '';
  mp.multiplayerPeerId.value = '';
  mp.multiplayerPing.value = 0;
  mp.multiplayerLobbyPlayers.value = [];
  mp.multiplayerHostSettings.value = null;
  game.setLockstep(null);
}

// ---- Internal helpers ----

function wireConnectionEvents(conn: PeerConnection): void {
  conn.onPeerJoin((peerId) => {
    mp.multiplayerConnected.value = true;
    mp.multiplayerPeerId.value = peerId;
    mp.multiplayerLobbyPlayers.value = buildLobbyPlayers(peerId);
    conn.startPing();
  });

  conn.onPeerLeave(() => {
    mp.multiplayerConnected.value = false;
    mp.multiplayerDisconnected.value = true;
    conn.stopPing();
  });

  conn.onMeta((msg) => {
    handleMetaMessage(msg);
  });
}

function handleMetaMessage(msg: NetMessage): void {
  switch (msg.type) {
    case 'settings':
      mp.multiplayerHostSettings.value = {
        scenario: msg.scenario as import('@/ui/store').MapScenario,
        difficulty: msg.difficulty as import('@/ui/store').DifficultyLevel,
        mapSeed: msg.seed,
        matchMode: msg.matchMode,
      };
      break;
    case 'ready': {
      const players = mp.multiplayerLobbyPlayers.value;
      const guest = players.find((p) => !p.isHost);
      if (guest) {
        mp.multiplayerLobbyPlayers.value = players.map((p) =>
          p.id === guest.id ? { ...p, ready: true } : p,
        );
      }
      break;
    }
    case 'disconnect':
      mp.multiplayerDisconnected.value = true;
      mp.multiplayerConnected.value = false;
      break;
    // Co-op messages
    case 'coop-resource': {
      const world = game.world;
      if (world?.coopMode) {
        applyResourceSync(world, msg);
      }
      break;
    }
    case 'coop-ping': {
      const world = game.world;
      if (world?.coopMode) {
        applyCoopPing(world, msg.x, msg.y);
      }
      break;
    }
    case 'coop-lodge-destroyed': {
      const world = game.world;
      if (world?.coopMode) {
        world.partnerLodgeDestroyed = true;
        mp.coopPartnerLodgeDestroyed.value = true;
      }
      break;
    }
    // Adversarial messages
    case 'adversarial-lodge-destroyed': {
      const world = game.world;
      if (world?.adversarialMode && world.opponentLodgeEid >= 0) {
        // Opponent reports our Lodge was destroyed from their perspective
        mp.adversarialOpponentLodgeDestroyed.value = true;
      }
      break;
    }
    case 'adversarial-commander-destroyed': {
      const world = game.world;
      if (world?.adversarialMode && world.opponentCommanderEid >= 0) {
        mp.adversarialOpponentCommanderDestroyed.value = true;
      }
      break;
    }
    default:
      break;
  }
}

function buildLobbyPlayers(peerId: string) {
  const selfId = connection?.selfId ?? 'local';
  const isHost = mp.multiplayerIsHost.value;
  return [
    { id: selfId, name: isHost ? 'Host' : 'Guest', commander: '', ready: false, isHost },
    { id: peerId, name: isHost ? 'Guest' : 'Host', commander: '', ready: false, isHost: !isHost },
  ];
}

function cleanup(): void {
  lockstep = null;
  if (connection) {
    connection.sendMeta({ type: 'disconnect' });
    connection.leave().catch(() => {});
    connection = null;
  }
}
