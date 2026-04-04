/**
 * Database Schema & Initialization
 *
 * SQLite connection setup, schema migrations, and persistence helpers.
 * v3: adds player_profile v3 columns and current_run table.
 */

import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite';

const DB_NAME = 'pond_warfare';
const DB_VERSION = 2;

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

  // Legacy v1/v2 tables (kept for save compatibility)
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
  `);

  // v3 player_profile: prestige-aware schema
  await db.execute(`
    CREATE TABLE IF NOT EXISTS player_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      rank INTEGER DEFAULT 0,
      pearls INTEGER DEFAULT 0,
      pearl_upgrades TEXT DEFAULT '{}',
      total_matches INTEGER DEFAULT 0,
      total_clams_earned INTEGER DEFAULT 0,
      highest_progression INTEGER DEFAULT 0,
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
      wins_zero_losses INTEGER DEFAULT 0,
      total_xp INTEGER DEFAULT 0,
      player_level INTEGER DEFAULT 0
    );
  `);

  // v3 current_run: resets on prestige
  await db.execute(`
    CREATE TABLE IF NOT EXISTS current_run (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      clams INTEGER DEFAULT 0,
      upgrades_purchased TEXT DEFAULT '{}',
      lodge_state TEXT DEFAULT '{}',
      progression_level INTEGER DEFAULT 0,
      matches_this_run INTEGER DEFAULT 0
    );
  `);

  // v3 match_history: enhanced schema
  await db.execute(`
    CREATE TABLE IF NOT EXISTS match_history (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      result TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      scenario TEXT NOT NULL DEFAULT 'standard',
      commander TEXT NOT NULL DEFAULT 'marshal',
      duration INTEGER DEFAULT 0,
      kills INTEGER DEFAULT 0,
      units_lost INTEGER DEFAULT 0,
      buildings_built INTEGER DEFAULT 0,
      techs_researched INTEGER DEFAULT 0,
      xp_earned INTEGER DEFAULT 0,
      clams_earned INTEGER DEFAULT 0,
      events_completed INTEGER DEFAULT 0,
      progression_level INTEGER DEFAULT 0,
      rank INTEGER DEFAULT 0
    );
  `);

  // Migration: add v3 columns to existing tables
  await safeAddColumn(db, 'player_profile', 'total_xp', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'player_level', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'rank', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'pearls', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'pearl_upgrades', "TEXT DEFAULT '{}'");
  await safeAddColumn(db, 'player_profile', 'total_matches', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'total_clams_earned', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'highest_progression', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'player_profile', 'selected_commander', "TEXT DEFAULT 'marshal'");
  await safeAddColumn(db, 'match_history', 'clams_earned', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'match_history', 'events_completed', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'match_history', 'progression_level', 'INTEGER DEFAULT 0');
  await safeAddColumn(db, 'match_history', 'rank', 'INTEGER DEFAULT 0');

  // Ensure default rows exist
  await db.execute(`
    INSERT OR IGNORE INTO player_profile (id) VALUES (1);
    INSERT OR IGNORE INTO current_run (id) VALUES (1);
  `);

  _initialized = true;
}

/**
 * Safely add a column to a table. Ignores errors if the column already exists.
 */
async function safeAddColumn(
  conn: SQLiteDBConnection,
  table: string,
  column: string,
  typedef: string,
): Promise<void> {
  try {
    await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${typedef}`);
  } catch {
    // Column already exists -- safe to ignore
  }
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

// ---- v3 Prestige State Persistence ----

export interface V3PrestigeRow {
  rank: number;
  pearls: number;
  pearl_upgrades: string;
  total_matches: number;
  total_clams_earned: number;
  highest_progression: number;
}

/** Load prestige state from SQLite. Returns null if DB not ready. */
export async function loadPrestigeState(): Promise<V3PrestigeRow | null> {
  if (!_initialized) return null;
  const result = await db.query(
    'SELECT rank, pearls, pearl_upgrades, total_matches, total_clams_earned, highest_progression FROM player_profile WHERE id = 1',
  );
  if (!result.values || result.values.length === 0) return null;
  return result.values[0] as V3PrestigeRow;
}

/** Save prestige state to SQLite. */
export async function savePrestigeState(state: V3PrestigeRow): Promise<void> {
  if (!_initialized) return;
  await db.execute(
    `UPDATE player_profile SET rank = ${state.rank}, pearls = ${state.pearls}, pearl_upgrades = '${state.pearl_upgrades}', total_matches = ${state.total_matches}, total_clams_earned = ${state.total_clams_earned}, highest_progression = ${state.highest_progression} WHERE id = 1`,
  );
  await persist();
}

export interface V3CurrentRunRow {
  clams: number;
  upgrades_purchased: string;
  lodge_state: string;
  progression_level: number;
  matches_this_run: number;
}

/** Load current run state. */
export async function loadCurrentRun(): Promise<V3CurrentRunRow | null> {
  if (!_initialized) return null;
  const result = await db.query('SELECT * FROM current_run WHERE id = 1');
  if (!result.values || result.values.length === 0) return null;
  return result.values[0] as V3CurrentRunRow;
}

/** Save current run state. */
export async function saveCurrentRun(state: V3CurrentRunRow): Promise<void> {
  if (!_initialized) return;
  await db.execute(
    `UPDATE current_run SET clams = ${state.clams}, upgrades_purchased = '${state.upgrades_purchased}', lodge_state = '${state.lodge_state}', progression_level = ${state.progression_level}, matches_this_run = ${state.matches_this_run} WHERE id = 1`,
  );
  await persist();
}

/** Load selected commander from player_profile. */
export async function loadSelectedCommander(): Promise<string> {
  if (!_initialized) return 'marshal';
  const result = await db.query('SELECT selected_commander FROM player_profile WHERE id = 1');
  const row = result.values?.[0] as { selected_commander?: string } | undefined;
  return row?.selected_commander || 'marshal';
}

/** Save selected commander to player_profile. */
export async function saveSelectedCommander(commanderId: string): Promise<void> {
  if (!_initialized) return;
  await db.execute(`UPDATE player_profile SET selected_commander = '${commanderId}' WHERE id = 1`);
  await persist();
}

/** Reset current_run on prestige. */
export async function resetCurrentRun(): Promise<void> {
  if (!_initialized) return;
  await db.execute(
    `UPDATE current_run SET clams = 0, upgrades_purchased = '{}', lodge_state = '{}', progression_level = 0, matches_this_run = 0 WHERE id = 1`,
  );
  await persist();
}
