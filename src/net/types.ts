/** Network types – P2P lockstep message protocol, player identity, connection state. */
import type { DifficultyLevel, MapScenario } from '@/ui/store';

export type PlayerId = 'host' | 'guest';

export type SerializedCommand = {
  type: string;
  data: { [key: string]: JsonValue };
};

/** JSON-safe value type matching Trystero's DataPayload constraint. */
export type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

export type NetMessage =
  | { type: 'cmd'; frame: number; commands: SerializedCommand[] }
  | { type: 'ack'; frame: number }
  | { type: 'checksum'; frame: number; hash: number }
  | {
      type: 'settings';
      seed: number;
      difficulty: string;
      scenario: string;
      commander: string;
    }
  | { type: 'ready' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number }
  | { type: 'disconnect' }
  // Co-op messages
  | { type: 'coop-resource'; clams: number; twigs: number; pearls: number }
  | { type: 'coop-ping'; x: number; y: number }
  | { type: 'coop-fog'; tiles: number[] }
  | { type: 'coop-lodge-destroyed' };

export interface NetState {
  connected: boolean;
  playerId: PlayerId;
  peerId: string | null;
  roomCode: string;
  latency: number;
}

/** Settings chosen by the host before game start. */
export interface HostSettings {
  scenario: MapScenario;
  difficulty: DifficultyLevel;
  mapSeed: number;
}

/** Connection quality tiers for the HUD indicator. */
export type ConnectionQuality = 'connected' | 'degraded' | 'disconnected';

/** Lobby player state. */
export interface LobbyPlayer {
  id: string;
  name: string;
  commander: string;
  ready: boolean;
  isHost: boolean;
}
