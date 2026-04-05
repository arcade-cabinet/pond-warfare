/**
 * Schema Migrations — additive ALTER TABLE changes.
 * Each migration runs once, tracked in _migrations table.
 * Never destructive. Safe to re-run (catches "column already exists").
 */

import type { SQLiteDBConnection } from '@capacitor-community/sqlite';

interface Migration {
  version: number;
  up: string[];
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: [
      'ALTER TABLE player_profile ADD COLUMN total_pearls_earned INTEGER DEFAULT 0',
      'ALTER TABLE player_profile ADD COLUMN selected_commander TEXT DEFAULT "marshal"',
    ],
  },
];

export async function runMigrations(conn: SQLiteDBConnection): Promise<void> {
  await conn.execute(
    'CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)',
  );
  const result = await conn.query('SELECT MAX(version) as v FROM _migrations');
  const current = result.values?.[0]?.v ?? 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      for (const stmt of m.up) {
        try {
          await conn.execute(stmt);
        } catch {
          // Column may already exist on fresh DBs — safe to ignore
        }
      }
      await conn.execute(`INSERT INTO _migrations (version) VALUES (${m.version})`);
    }
  }
}
