/**
 * Match History Storage
 *
 * Saves match summaries to SQLite and auto-prunes to the last 50 records.
 */

import { getDb, persist } from './schema';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchRecord {
  id: string;
  date: string;
  result: 'win' | 'loss';
  difficulty: string;
  scenario: string;
  commander: string;
  duration: number;
  kills: number;
  unitsLost: number;
  buildingsBuilt: number;
  techsResearched: number;
  xpEarned: number;
}

const MAX_RECORDS = 50;

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Save a match record and prune old entries beyond MAX_RECORDS. */
export async function saveMatchRecord(record: MatchRecord): Promise<void> {
  const conn = getDb();
  await conn.run(
    `INSERT INTO match_history (id, date, result, difficulty, scenario, commander,
       duration, kills, units_lost, buildings_built, techs_researched, xp_earned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.date,
      record.result,
      record.difficulty,
      record.scenario,
      record.commander,
      record.duration,
      record.kills,
      record.unitsLost,
      record.buildingsBuilt,
      record.techsResearched,
      record.xpEarned,
    ],
  );

  // Auto-prune: keep only the most recent MAX_RECORDS
  await conn.run(
    `DELETE FROM match_history WHERE id NOT IN (
       SELECT id FROM match_history ORDER BY date DESC LIMIT ?
     )`,
    [MAX_RECORDS],
  );

  await persist();
}

/** Load match history, most recent first. */
export async function getMatchHistory(): Promise<MatchRecord[]> {
  const conn = getDb();
  const result = await conn.query('SELECT * FROM match_history ORDER BY date DESC LIMIT ?', [
    MAX_RECORDS,
  ]);

  if (!result.values) return [];

  return result.values.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    date: row.date as string,
    result: row.result as 'win' | 'loss',
    difficulty: row.difficulty as string,
    scenario: row.scenario as string,
    commander: row.commander as string,
    duration: row.duration as number,
    kills: row.kills as number,
    unitsLost: row.units_lost as number,
    buildingsBuilt: row.buildings_built as number,
    techsResearched: row.techs_researched as number,
    xpEarned: row.xp_earned as number,
  }));
}

/** Get total match count (for display). */
export async function getMatchCount(): Promise<number> {
  const conn = getDb();
  const result = await conn.query('SELECT COUNT(*) as cnt FROM match_history');
  return (result.values?.[0] as { cnt: number } | undefined)?.cnt ?? 0;
}
