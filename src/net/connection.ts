/**
 * Connection – Trystero/Nostr room management for P2P multiplayer.
 *
 * Creates a WebRTC DataChannel via Nostr relay signaling.
 * Exposes typed action senders/receivers for command and meta channels.
 */

import type { Room } from 'trystero/nostr';
import { joinRoom, selfId } from 'trystero/nostr';
import type { NetMessage, SerializedCommand } from './types';

const APP_ID = 'pond-warfare';
const ROOM_CODE_LENGTH = 6;
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
const PING_INTERVAL_MS = 3000;

export interface PeerConnection {
  room: Room;
  roomCode: string;
  selfId: string;
  sendCmd: (msg: { frame: number; commands: SerializedCommand[] }) => void;
  sendMeta: (msg: NetMessage) => void;
  onCmd: (
    handler: (msg: { frame: number; commands: SerializedCommand[] }, peerId: string) => void,
  ) => void;
  onMeta: (handler: (msg: NetMessage, peerId: string) => void) => void;
  onPeerJoin: (handler: (peerId: string) => void) => void;
  onPeerLeave: (handler: (peerId: string) => void) => void;
  startPing: () => void;
  stopPing: () => void;
  leave: () => Promise<void>;
  getLatency: () => number;
}

/** Generate a human-friendly 6-char room code. */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

/** Join or create a Trystero room and set up typed action channels. */
export function createRoom(roomCode: string): PeerConnection {
  const room = joinRoom({ appId: APP_ID }, roomCode);

  // Command channel: frame-stamped player commands (lockstep)
  type CmdPayload = { frame: number; commands: SerializedCommand[] };
  const [sendCmd, receiveCmd] = room.makeAction<CmdPayload>('cmd');

  // Meta channel: settings, ready, pause, ping/pong, disconnect
  const [sendMeta, receiveMeta] = room.makeAction<NetMessage>('meta');

  let latency = 0;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  // Ping/pong latency measurement
  const latencySamples: number[] = [];
  const MAX_SAMPLES = 5;

  function handlePong(timestamp: number): void {
    const rtt = performance.now() - timestamp;
    latencySamples.push(rtt / 2);
    if (latencySamples.length > MAX_SAMPLES) latencySamples.shift();
    latency = latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length;
  }

  function startPing(): void {
    if (pingTimer) return;
    pingTimer = setInterval(() => {
      sendMeta({ type: 'ping', timestamp: performance.now() }).catch(() => {});
    }, PING_INTERVAL_MS);
  }

  function stopPing(): void {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  }

  return {
    room,
    roomCode,
    selfId,
    sendCmd: (msg) => {
      sendCmd(msg);
    },
    sendMeta: (msg) => {
      sendMeta(msg);
    },
    onCmd: (handler) => receiveCmd(handler),
    onMeta: (handler) => {
      receiveMeta((msg, peerId) => {
        // Handle ping/pong internally
        if (msg.type === 'ping') {
          sendMeta({ type: 'pong', timestamp: msg.timestamp });
          return;
        }
        if (msg.type === 'pong') {
          handlePong(msg.timestamp);
          return;
        }
        handler(msg, peerId);
      });
    },
    onPeerJoin: (handler) => room.onPeerJoin(handler),
    onPeerLeave: (handler) => room.onPeerLeave(handler),
    startPing,
    stopPing,
    leave: async () => {
      stopPing();
      await room.leave();
    },
    getLatency: () => Math.round(latency),
  };
}
