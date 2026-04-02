/**
 * Database Query Functions
 *
 * CRUD operations for saves, settings, game history, unlocks, and player profile.
 */

import { getDb, persist } from './schema';

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
// Unlocks
// ---------------------------------------------------------------------------

export async function getUnlock(id: string): Promise<boolean> {
  const conn = getDb();
  const result = await conn.query('SELECT unlocked FROM unlocks WHERE id = ? LIMIT 1', [id]);
  return (result.values?.[0] as { unlocked: number } | undefined)?.unlocked === 1;
}

export async function setUnlock(id: string, category: string): Promise<void> {
  const conn = getDb();
  await conn.run(
    `INSERT INTO unlocks (id, category, unlocked, unlocked_at)
     VALUES (?, ?, 1, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET unlocked = 1, unlocked_at = CURRENT_TIMESTAMP`,
    [id, category],
  );
  await persist();
}

export async function listUnlocks(): Promise<
  { id: string; category: string; unlocked_at: string }[]
> {
  const conn = getDb();
  const result = await conn.query(
    'SELECT id, category, unlocked_at FROM unlocks WHERE unlocked = 1 ORDER BY unlocked_at DESC',
  );
  return (
    (result.values as { id: string; category: string; unlocked_at: string }[] | undefined) ?? []
  );
}

// ---------------------------------------------------------------------------
// Player profile
// ---------------------------------------------------------------------------

export interface PlayerProfile {
  total_wins: number;
  total_losses: number;
  total_kills: number;
  total_games: number;
  total_playtime_seconds: number;
  highest_difficulty_won: string;
  longest_survival_seconds: number;
  fastest_win_seconds: number;
  total_buildings_built: number;
  hero_units_earned: number;
  wins_commander_alive: number;
  total_pearls: number;
  wins_zero_losses: number;
  total_xp: number;
  player_level: number;
}

const DEFAULT_PROFILE: PlayerProfile = {
  total_wins: 0,
  total_losses: 0,
  total_kills: 0,
  total_games: 0,
  total_playtime_seconds: 0,
  highest_difficulty_won: '',
  longest_survival_seconds: 0,
  fastest_win_seconds: 0,
  total_buildings_built: 0,
  hero_units_earned: 0,
  wins_commander_alive: 0,
  total_pearls: 0,
  wins_zero_losses: 0,
  total_xp: 0,
  player_level: 0,
};

export async function getPlayerProfile(): Promise<PlayerProfile> {
  const conn = getDb();
  const result = await conn.query('SELECT * FROM player_profile WHERE id = 1 LIMIT 1');
  if (result.values && result.values.length > 0) {
    const row = result.values[0] as Record<string, unknown>;
    return {
      total_wins: (row.total_wins as number) ?? 0,
      total_losses: (row.total_losses as number) ?? 0,
      total_kills: (row.total_kills as number) ?? 0,
      total_games: (row.total_games as number) ?? 0,
      total_playtime_seconds: (row.total_playtime_seconds as number) ?? 0,
      highest_difficulty_won: (row.highest_difficulty_won as string) ?? '',
      longest_survival_seconds: (row.longest_survival_seconds as number) ?? 0,
      fastest_win_seconds: (row.fastest_win_seconds as number) ?? 0,
      total_buildings_built: (row.total_buildings_built as number) ?? 0,
      hero_units_earned: (row.hero_units_earned as number) ?? 0,
      wins_commander_alive: (row.wins_commander_alive as number) ?? 0,
      total_pearls: (row.total_pearls as number) ?? 0,
      wins_zero_losses: (row.wins_zero_losses as number) ?? 0,
      total_xp: (row.total_xp as number) ?? 0,
      player_level: (row.player_level as number) ?? 0,
    };
  }
  return { ...DEFAULT_PROFILE };
}

export async function updatePlayerProfile(updates: Partial<PlayerProfile>): Promise<void> {
  const conn = getDb();
  await conn.run(`INSERT OR IGNORE INTO player_profile (id) VALUES (1)`);

  const fields: string[] = [];
  const values: (string | number)[] = [];
  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;

  await conn.run(`UPDATE player_profile SET ${fields.join(', ')} WHERE id = 1`, values);
  await persist();
}
