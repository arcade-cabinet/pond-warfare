/**
 * Database Schema & Initialization
 *
 * SQLite connection setup, schema migrations, and persistence helpers.
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
 * Initialize the SQLite database. MUST be called once at app startup.
 * Throws on failure -- there is no fallback.
 */
export async function initDatabase(): Promise<void> {
  if (_initialized) return;

  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    const { defineCustomElements } = await import('jeep-sqlite/loader');
    await defineCustomElements(window);
    const jeepEl = document.createElement('jeep-sqlite');
    const base = import.meta.env.BASE_URL ?? '/';
    jeepEl.setAttribute('wasmpath', `${base}assets`);
    document.body.appendChild(jeepEl);
    await customElements.whenDefined('jeep-sqlite');
  }

  sqlite = new SQLiteConnection(CapacitorSQLite);

  if (platform === 'web') {
    await sqlite.initWebStore();
  }

  const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  if (isConn) {
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
  }

  await db.open();

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

    CREATE TABLE IF NOT EXISTS unlocks (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      unlocked INTEGER DEFAULT 0,
      unlocked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS player_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_wins INTEGER DEFAULT 0,
      total_losses INTEGER DEFAULT 0,
      total_kills INTEGER DEFAULT 0,
      total_games INTEGER DEFAULT 0,
      total_playtime_seconds INTEGER DEFAULT 0,
      highest_difficulty_won TEXT DEFAULT '',
      longest_survival_seconds INTEGER DEFAULT 0,
      fastest_win_seconds INTEGER DEFAULT 0,
      total_buildings_built INTEGER DEFAULT 0,
      hero_units_earned INTEGER DEFAULT 0,
      wins_commander_alive INTEGER DEFAULT 0,
      total_pearls INTEGER DEFAULT 0,
      wins_zero_losses INTEGER DEFAULT 0
    );
  `);

  _initialized = true;
}

export function isDatabaseReady(): boolean {
  return _initialized;
}

export function getDb(): SQLiteDBConnection {
  if (!_initialized) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

/**
 * Persist the in-memory database to IndexedDB (web only).
 */
export async function persist(): Promise<void> {
  if (Capacitor.getPlatform() === 'web') {
    await sqlite.saveToStore(DB_NAME);
  }
}

export async function closeDatabase(): Promise<void> {
  if (!_initialized) return;
  await sqlite.closeConnection(DB_NAME, false);
  _initialized = false;
}
