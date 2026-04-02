/**
 * Replay Viewer
 *
 * Loads a replay file and plays back the game with full visual rendering.
 * Supports play/pause, speed control (1x/2x/4x/8x), and skip to timestamp.
 * Shows full map (no fog of war) during replay playback.
 */

import type { ReplayData } from './recorder';

export type ReplaySpeed = 1 | 2 | 4 | 8;

export interface ReplayViewerState {
  /** The replay data being played back. */
  data: ReplayData;
  /** Current playback frame. */
  currentFrame: number;
  /** Whether playback is paused. */
  paused: boolean;
  /** Playback speed multiplier. */
  speed: ReplaySpeed;
  /** Index of the next command to execute. */
  commandIndex: number;
  /** Total duration in frames (from last command). */
  totalFrames: number;
  /** Whether playback has reached the end. */
  finished: boolean;
}

/** Available replay speed options. */
export const REPLAY_SPEEDS: ReplaySpeed[] = [1, 2, 4, 8];

/** Create initial viewer state from replay data. */
export function createReplayViewerState(data: ReplayData): ReplayViewerState {
  const totalFrames =
    data.commands.length > 0 ? data.commands[data.commands.length - 1].frame + 600 : 3600;
  return {
    data,
    currentFrame: 0,
    paused: false,
    speed: 1,
    commandIndex: 0,
    totalFrames,
    finished: false,
  };
}

/** Toggle pause state. */
export function toggleReplayPause(state: ReplayViewerState): void {
  state.paused = !state.paused;
}

/** Cycle to next speed. */
export function cycleReplaySpeed(state: ReplayViewerState): void {
  const idx = REPLAY_SPEEDS.indexOf(state.speed);
  state.speed = REPLAY_SPEEDS[(idx + 1) % REPLAY_SPEEDS.length];
}

/** Set a specific replay speed. */
export function setReplaySpeed(state: ReplayViewerState, speed: ReplaySpeed): void {
  state.speed = speed;
}

/** Skip to a specific frame. */
export function skipToFrame(state: ReplayViewerState, frame: number): void {
  const targetFrame = Math.max(0, Math.min(frame, state.totalFrames));
  state.currentFrame = targetFrame;
  // Reset command index to the first command at or after this frame
  state.commandIndex = 0;
  for (let i = 0; i < state.data.commands.length; i++) {
    if (state.data.commands[i].frame >= targetFrame) {
      state.commandIndex = i;
      break;
    }
    state.commandIndex = i + 1;
  }
  state.finished = targetFrame >= state.totalFrames;
}

/**
 * Advance the replay by one logical tick.
 * Returns any commands that should be executed this frame.
 */
export function tickReplay(
  state: ReplayViewerState,
): { frame: number; type: string; data: Record<string, unknown> }[] {
  if (state.paused || state.finished) return [];

  const commands: { frame: number; type: string; data: Record<string, unknown> }[] = [];

  // Process N frames per tick based on speed
  for (let s = 0; s < state.speed; s++) {
    state.currentFrame++;

    // Collect all commands for this frame
    while (
      state.commandIndex < state.data.commands.length &&
      state.data.commands[state.commandIndex].frame <= state.currentFrame
    ) {
      commands.push(state.data.commands[state.commandIndex]);
      state.commandIndex++;
    }

    if (state.currentFrame >= state.totalFrames) {
      state.finished = true;
      break;
    }
  }

  return commands;
}

/** Get playback progress as a 0-1 fraction. */
export function getReplayProgress(state: ReplayViewerState): number {
  return state.totalFrames > 0 ? state.currentFrame / state.totalFrames : 0;
}

/** Format a frame number as a time string (MM:SS). */
export function formatReplayTime(frame: number): string {
  const totalSeconds = Math.floor(frame / 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
