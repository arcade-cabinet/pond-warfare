/**
 * SQLite Database Layer
 *
 * Uses @capacitor-community/sqlite for ALL platforms:
 * - Web: jeep-sqlite Stencil component backed by sql.js + IndexedDB (localforage)
 * - iOS/Android: native SQLite via Capacitor plugin
 *
 * SQLite is REQUIRED. If initialization fails, the app cannot start.
 * There are NO fallbacks.
 *
 * @see https://github.com/capacitor-community/sqlite/blob/master/docs/Web-Usage.md
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'pond_warfare';
const DB_VERSION = 1;

let sqlite: SQLiteConnection;
let db: SQLiteDBConnection;
let _initialized = false;

/**
 * Initialize the SQLite database. MUST be called once at app startup
 * before any other database operations.
 *
 * On web: registers jeep-sqlite custom element, waits for it to be defined,
 * then initializes the web store.
 *
 * On native: uses CapacitorSQLite directly.
 *
 * Throws on failure — there is no fallback.
 */
export async function initDatabase(): Promise<void> {
  if (_initialized) return;

  const platform = Capacitor.getPlatform();

  // Web: register jeep-sqlite Stencil component
  if (platform === 'web') {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    await defineCustomElements(window);

    // Create and mount the jeep-sqlite element
    const jeepEl = document.createElement('jeep-sqlite');
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');
  }

  // Create the SQLiteConnection wrapper (works for all platforms)
  sqlite = new SQLiteConnection(CapacitorSQLite);

  // Web: initialize the IndexedDB-backed store
  if (platform === 'web') {
    await sqlite.initWebStore();
  }

  // Open or retrieve the database connection
  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  if (isConn) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
  }

  await db.open();

  // Run migrations (CREATE TABLE IF NOT EXISTS is idempotent)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS saves (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      seed INTEGER NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      permadeath INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      result TEXT NOT NULL,
      duration_seconds INTEGER,
      seed INTEGER,
      played_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  _initialized = true;
}

/** Whether initDatabase() has completed successfully. */
export function isDatabaseReady(): boolean {
  return _initialized;
}

/**
 * Get the raw DB connection. Throws if not initialized.
 */
function getDb(): SQLiteDBConnection {
  if (!_initialized) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Persist the in-memory database to IndexedDB (web only).
 * On native platforms this is a no-op (native SQLite persists automatically).
 *
 * MUST be called after writes on web — the database lives in memory
 * and is only flushed to IndexedDB on saveToStore/close/closeConnection.
 */
export async function persist(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
}

// ---------------------------------------------------------------------------
// Save game CRUD
// ---------------------------------------------------------------------------

export interface SaveRow {
  id: number;
  name: string;
  difficulty: string;
  seed: number;
  data: string;
  created_at: string;
  updated_at: string;
  permadeath: number;
}

export async function saveGameToDb(
  name: string,
  difficulty: string,
  seed: number,
  data: string,
  permadeath: boolean,
): Promise<number> {
  const conn = getDb();
  const result = await conn.run(
    'INSERT INTO saves (name, difficulty, seed, data, permadeath) VALUES (?, ?, ?, ?, ?)',
    [name, difficulty, seed, data, permadeath ? 1 : 0],
  );
  await persist();
  return result.changes?.lastId ?? -1;
}

export async function updateSave(id: number, data: string): Promise<void> {
  const conn = getDb();
  await conn.run('UPDATE saves SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
    data,
    id,
  ]);
  await persist();
}

export async function loadSave(id: number): Promise<SaveRow | null> {
  const conn = getDb();
  const result = await conn.query('SELECT * FROM saves WHERE id = ? LIMIT 1', [id]);
  return (result.values?.[0] as SaveRow | undefined) ?? null;
}

export async function getLatestSave(): Promise<SaveRow | null> {
  const conn = getDb();
  const result = await conn.query('SELECT * FROM saves ORDER BY updated_at DESC LIMIT 1');
  return (result.values?.[0] as SaveRow | undefined) ?? null;
}

export async function listSaves(): Promise<SaveRow[]> {
  const conn = getDb();
  const result = await conn.query(
    'SELECT id, name, difficulty, seed, created_at, updated_at, permadeath FROM saves ORDER BY updated_at DESC',
  );
  return (result.values as SaveRow[] | undefined) ?? [];
}

export async function deleteSave(id: number): Promise<void> {
  const conn = getDb();
  await conn.run('DELETE FROM saves WHERE id = ?', [id]);
  await persist();
}

// ---------------------------------------------------------------------------
// Settings key/value store
// ---------------------------------------------------------------------------

export async function setSetting(key: string, value: string): Promise<void> {
  const conn = getDb();
  await conn.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
  await persist();
}

export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const conn = getDb();
  const result = await conn.query('SELECT value FROM settings WHERE key = ? LIMIT 1', [key]);
  return (result.values?.[0] as { value: string } | undefined)?.value ?? defaultValue;
}

// ---------------------------------------------------------------------------
// Game history
// ---------------------------------------------------------------------------

export async function recordGameResult(
  name: string,
  difficulty: string,
  result: string,
  durationSeconds: number,
  seed: number,
): Promise<void> {
  const conn = getDb();
  await conn.run(
    'INSERT INTO game_history (name, difficulty, result, duration_seconds, seed) VALUES (?, ?, ?, ?, ?)',
    [name, difficulty, result, durationSeconds, seed],
  );
  await persist();
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

export async function closeDatabase(): Promise<void> {
  if (!_initialized) return;
  await sqlite.closeConnection(DB_NAME, false);
  _initialized = false;
}
