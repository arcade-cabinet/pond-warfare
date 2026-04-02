/**
 * Replay Storage
 *
 * Save and load replay data as JSON. Uses localStorage for web
 * and will integrate with the SQLite database for Capacitor builds.
 */

import type { ReplayData } from './recorder';

const REPLAY_STORAGE_KEY = 'pond-warfare-replays';
const MAX_STORED_REPLAYS = 20;

export interface StoredReplay {
  id: string;
  data: ReplayData;
  label: string;
  savedAt: string;
  durationFrames: number;
  commandCount: number;
}

/** Generate a unique replay ID. */
function generateReplayId(): string {
  return `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Get all stored replays (newest first). */
export function getStoredReplays(): StoredReplay[] {
  try {
    const raw = localStorage.getItem(REPLAY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as StoredReplay[];
  } catch {
    return [];
  }
}

/** Save a replay. Auto-prunes if over MAX_STORED_REPLAYS. */
export function saveReplay(data: ReplayData, label?: string): StoredReplay {
  const durationFrames =
    data.commands.length > 0 ? data.commands[data.commands.length - 1].frame : 0;

  const stored: StoredReplay = {
    id: generateReplayId(),
    data,
    label: label ?? `Game ${new Date().toLocaleString()}`,
    savedAt: new Date().toISOString(),
    durationFrames,
    commandCount: data.commands.length,
  };

  const replays = getStoredReplays();
  replays.unshift(stored);

  // Prune old replays
  while (replays.length > MAX_STORED_REPLAYS) {
    replays.pop();
  }

  try {
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replays));
  } catch {
    // Storage full — remove oldest and try again
    replays.pop();
    localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replays));
  }

  return stored;
}

/** Load a specific replay by ID. */
export function loadReplay(id: string): ReplayData | null {
  const replays = getStoredReplays();
  const found = replays.find((r) => r.id === id);
  return found?.data ?? null;
}

/** Delete a replay by ID. */
export function deleteReplay(id: string): void {
  const replays = getStoredReplays().filter((r) => r.id !== id);
  localStorage.setItem(REPLAY_STORAGE_KEY, JSON.stringify(replays));
}

/** Delete all stored replays. */
export function clearAllReplays(): void {
  localStorage.removeItem(REPLAY_STORAGE_KEY);
}
