/**
 * Command Serializer – converts between game commands and network-safe
 * SerializedCommand format.
 *
 * Uses the same structure as ReplayRecorder so commands are compatible
 * with both the replay system and the network layer.
 */

import type { ReplayCommand, ReplayCommandType } from '@/replay';
import type { JsonValue, SerializedCommand } from './types';

/** All valid command types that can be sent over the network. */
const VALID_COMMAND_TYPES: ReadonlySet<string> = new Set<ReplayCommandType>([
  'select',
  'move',
  'attack',
  'build',
  'train',
  'cancel-train',
  'research',
  'rally',
  'stop',
  'auto-behavior',
  'speed',
  'pause',
]);

/** Convert a ReplayCommand to a network-safe SerializedCommand. */
export function serializeCommand(cmd: ReplayCommand): SerializedCommand {
  return { type: cmd.type, data: cmd.data as { [key: string]: JsonValue } };
}

/** Convert multiple ReplayCommands to network format. */
export function serializeCommands(cmds: ReplayCommand[]): SerializedCommand[] {
  return cmds.map(serializeCommand);
}

/**
 * Deserialize a network command back to a ReplayCommand at a given frame.
 * Returns null if the command type is not recognized (safety filter).
 */
export function deserializeCommand(cmd: SerializedCommand, frame: number): ReplayCommand | null {
  if (!VALID_COMMAND_TYPES.has(cmd.type)) return null;
  return {
    frame,
    type: cmd.type as ReplayCommandType,
    data: cmd.data,
  };
}

/** Deserialize multiple network commands, filtering out invalid ones. */
export function deserializeCommands(cmds: SerializedCommand[], frame: number): ReplayCommand[] {
  const result: ReplayCommand[] = [];
  for (const cmd of cmds) {
    const deserialized = deserializeCommand(cmd, frame);
    if (deserialized) result.push(deserialized);
  }
  return result;
}
