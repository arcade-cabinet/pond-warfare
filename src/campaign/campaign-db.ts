/**
 * Campaign DB – SQLite persistence for campaign progress.
 */

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { isDatabaseReady, persist } from '@/storage';

let _dbReady = false;

async function ensureCampaignTable(): Promise<void> {
  if (_dbReady) return;
  if (!isDatabaseReady()) return;

  const sqlite = new SQLiteConnection(CapacitorSQLite);
  const db = await sqlite.retrieveConnection('pond_warfare', false);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaign_progress (
      mission_id TEXT PRIMARY KEY,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      best_time_frames INTEGER
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS campaign_state (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
  await persist();
  _dbReady = true;
}

/** Mark a mission as completed in SQLite. */
export async function saveMissionCompleted(missionId: string, frames: number): Promise<void> {
  try {
    await ensureCampaignTable();
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const db = await sqlite.retrieveConnection('pond_warfare', false);
    await db.run(
      `INSERT INTO campaign_progress (mission_id, completed, completed_at, best_time_frames)
       VALUES (?, 1, CURRENT_TIMESTAMP, ?)
       ON CONFLICT(mission_id) DO UPDATE SET
         completed = 1,
         completed_at = CURRENT_TIMESTAMP,
         best_time_frames = MIN(best_time_frames, ?)`,
      [missionId, frames, frames],
    );
    await persist();
  } catch {
    // Best-effort persistence
  }
}

/** Save the campaign branch choice (A or B) after Mission 3. */
export async function saveBranchChoice(path: 'A' | 'B'): Promise<void> {
  try {
    await ensureCampaignTable();
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const db = await sqlite.retrieveConnection('pond_warfare', false);
    await db.run(
      `INSERT INTO campaign_state (key, value) VALUES ('branch_path', ?)
       ON CONFLICT(key) DO UPDATE SET value = ?`,
      [path, path],
    );
    await persist();
  } catch {
    // Best-effort persistence
  }
}

/** Load the campaign branch choice. Returns 'A', 'B', or null. */
export async function loadBranchChoice(): Promise<'A' | 'B' | null> {
  try {
    await ensureCampaignTable();
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const db = await sqlite.retrieveConnection('pond_warfare', false);
    const result = await db.query("SELECT value FROM campaign_state WHERE key = 'branch_path'");
    if (result.values && result.values.length > 0) {
      const val = (result.values[0] as { value: string }).value;
      if (val === 'A' || val === 'B') return val;
    }
  } catch {
    // If DB isn't ready, return null
  }
  return null;
}

/** Load which missions have been completed. Returns a Set of mission IDs. */
export async function loadCampaignProgress(): Promise<Set<string>> {
  const completed = new Set<string>();
  try {
    await ensureCampaignTable();
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const db = await sqlite.retrieveConnection('pond_warfare', false);
    const result = await db.query('SELECT mission_id FROM campaign_progress WHERE completed = 1');
    if (result.values) {
      for (const row of result.values) {
        completed.add((row as { mission_id: string }).mission_id);
      }
    }
  } catch {
    // If DB isn't ready, return empty set
  }
  return completed;
}
