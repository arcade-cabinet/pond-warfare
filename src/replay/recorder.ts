/**
 * Replay Recorder
 *
 * Records all player input commands as timestamped entries for deterministic
 * replay playback. Each command captures the frame number, command type, and
 * relevant data so the game can be reconstructed from a known initial state.
 *
 * This is foundational infrastructure for future multiplayer (deterministic
 * lockstep) and useful for debugging.
 */

export type ReplayCommandType =
  | 'select'
  | 'move'
  | 'attack'
  | 'build'
  | 'train'
  | 'cancel-train'
  | 'research'
  | 'rally'
  | 'stop'
  | 'auto-behavior'
  | 'speed'
  | 'pause';

export interface ReplayCommand {
  frame: number;
  type: ReplayCommandType;
  data: Record<string, unknown>;
}

export interface ReplayData {
  version: 1;
  seed: number;
  startedAt: string;
  commands: ReplayCommand[];
}

export class ReplayRecorder {
  private commands: ReplayCommand[] = [];
  private recording = false;
  private seed = 0;
  private startedAt = '';

  /** Begin recording, clearing any previous data. */
  start(seed?: number): void {
    this.commands = [];
    this.seed = seed ?? Math.floor(Math.random() * 0xffffffff);
    this.startedAt = new Date().toISOString();
    this.recording = true;
  }

  /** Stop recording and return the replay data. */
  stop(): ReplayData {
    this.recording = false;
    return this.export();
  }

  /** Whether the recorder is currently active. */
  get isRecording(): boolean {
    return this.recording;
  }

  /** Record a single command. No-op if not recording. */
  record(frame: number, type: ReplayCommandType, data: Record<string, unknown>): void {
    if (!this.recording) return;
    this.commands.push({ frame, type, data });
  }

  /** Export the current replay data (can be called while still recording). */
  export(): ReplayData {
    return {
      version: 1,
      seed: this.seed,
      startedAt: this.startedAt,
      commands: [...this.commands],
    };
  }

  /** Number of commands recorded so far. */
  get commandCount(): number {
    return this.commands.length;
  }
}
