/**
 * Replay Player
 *
 * Plays back recorded commands by yielding them frame-by-frame. The caller
 * advances the replay by requesting commands for each game frame; the player
 * returns all commands whose recorded frame matches the requested frame.
 *
 * Commands must be sorted by frame (ascending), which the ReplayRecorder
 * guarantees since it appends in real-time order.
 */

import type { ReplayCommand, ReplayData } from './recorder';

export class ReplayPlayer {
  private commands: ReplayCommand[] = [];
  private index = 0;
  private _loaded = false;
  private _seed = 0;

  /** Load replay data for playback. Resets the playback cursor to frame 0. */
  load(data: ReplayData): void {
    this.commands = data.commands;
    this._seed = data.seed;
    this.index = 0;
    this._loaded = true;
  }

  /** Whether replay data has been loaded. */
  get loaded(): boolean {
    return this._loaded;
  }

  /** The random seed from the loaded replay. */
  get seed(): number {
    return this._seed;
  }

  /** Whether all commands have been consumed. */
  get finished(): boolean {
    return this.index >= this.commands.length;
  }

  /**
   * Return all commands for the given frame and advance the internal cursor.
   * Returns an empty array if there are no commands for that frame.
   */
  getCommands(frame: number): ReplayCommand[] {
    const cmds: ReplayCommand[] = [];
    while (this.index < this.commands.length && this.commands[this.index].frame === frame) {
      cmds.push(this.commands[this.index]);
      this.index++;
    }
    return cmds;
  }

  /** Reset the playback cursor to the beginning. */
  reset(): void {
    this.index = 0;
  }
}
