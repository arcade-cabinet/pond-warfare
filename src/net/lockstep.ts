/**
 * Lockstep Synchronizer – deterministic lockstep networking for 2-player co-op.
 *
 * Both players buffer commands `inputDelay` frames ahead. A frame only executes
 * when both players' inputs for that frame have been received. Commands are
 * applied in deterministic order: host first, then guest.
 */

import type { PeerConnection } from './connection';
import type { PlayerId, SerializedCommand } from './types';

/** How many frames ahead local commands are scheduled. */
const DEFAULT_INPUT_DELAY = 3;

/** Milliseconds before showing "waiting for player" UI. */
export const STALL_THRESHOLD_MS = 500;

export class LockstepSync {
  readonly inputDelay: number;
  readonly playerId: PlayerId;

  /** Frame the lockstep is currently on (waiting to execute). */
  private currentFrame = 0;

  /** Local commands indexed by target frame. */
  private localBuffer = new Map<number, SerializedCommand[]>();

  /** Remote commands indexed by target frame. */
  private remoteBuffer = new Map<number, SerializedCommand[]>();

  /** Timestamp when we first noticed the current frame was not ready. */
  private stallStart = 0;

  /** Network connection for sending commands. */
  private connection: PeerConnection | null = null;

  constructor(playerId: PlayerId, inputDelay = DEFAULT_INPUT_DELAY) {
    this.playerId = playerId;
    this.inputDelay = inputDelay;
  }

  /** Attach a network connection for sending commands. */
  attach(connection: PeerConnection): void {
    this.connection = connection;
  }

  /** Reset state for a new game session. */
  reset(): void {
    this.currentFrame = 0;
    this.localBuffer.clear();
    this.remoteBuffer.clear();
    this.stallStart = 0;
  }

  /** The frame currently being waited on for execution. */
  get frame(): number {
    return this.currentFrame;
  }

  /**
   * Queue local commands. They are scheduled for `currentFrame + inputDelay`
   * and immediately sent to the peer.
   */
  queueLocal(commands: SerializedCommand[]): void {
    const targetFrame = this.currentFrame + this.inputDelay;
    this.localBuffer.set(targetFrame, commands);
    if (this.connection) {
      this.connection.sendCmd({ frame: targetFrame, commands }).catch(() => {});
    }
  }

  /** Receive remote commands for a specific frame. */
  receiveRemote(frame: number, commands: SerializedCommand[]): void {
    this.remoteBuffer.set(frame, commands);
  }

  /** Whether `currentFrame` has both players' inputs and can execute. */
  isFrameReady(): boolean {
    return this.localBuffer.has(this.currentFrame) && this.remoteBuffer.has(this.currentFrame);
  }

  /**
   * Get both players' commands for the current frame in deterministic order
   * (host first, guest second). Returns null if the frame is not ready.
   */
  getFrameCommands(): { host: SerializedCommand[]; guest: SerializedCommand[] } | null {
    if (!this.isFrameReady()) return null;

    const local = this.localBuffer.get(this.currentFrame) ?? [];
    const remote = this.remoteBuffer.get(this.currentFrame) ?? [];

    return this.playerId === 'host'
      ? { host: local, guest: remote }
      : { host: remote, guest: local };
  }

  /** Advance to the next frame after execution. Cleans up consumed buffers. */
  advance(): void {
    this.localBuffer.delete(this.currentFrame);
    this.remoteBuffer.delete(this.currentFrame);
    this.currentFrame++;
    this.stallStart = 0;
  }

  /**
   * Returns true if the game has been waiting for peer input longer than
   * `STALL_THRESHOLD_MS`. Used to show "Waiting for player..." overlay.
   */
  isStalled(): boolean {
    if (this.isFrameReady()) {
      this.stallStart = 0;
      return false;
    }
    const now = performance.now();
    if (this.stallStart === 0) {
      this.stallStart = now;
      return false;
    }
    return now - this.stallStart >= STALL_THRESHOLD_MS;
  }

  /**
   * Pre-fill empty command entries for frames that have no player input.
   * Call once per tick so the lockstep doesn't stall on idle frames.
   */
  fillEmptyFrame(): void {
    const targetFrame = this.currentFrame + this.inputDelay;
    if (!this.localBuffer.has(targetFrame)) {
      this.queueLocal([]);
    }
  }

  /** Number of remote frames buffered ahead of the current frame. */
  get remoteBufferSize(): number {
    let count = 0;
    for (const frame of this.remoteBuffer.keys()) {
      if (frame >= this.currentFrame) count++;
    }
    return count;
  }

  /** Purge buffer entries older than the current frame (safety cleanup). */
  purgeStale(): void {
    for (const frame of this.localBuffer.keys()) {
      if (frame < this.currentFrame) this.localBuffer.delete(frame);
    }
    for (const frame of this.remoteBuffer.keys()) {
      if (frame < this.currentFrame) this.remoteBuffer.delete(frame);
    }
  }
}
