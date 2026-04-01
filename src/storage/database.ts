/**
 * SQLite Database Layer - Re-export barrel
 *
 * Maintains backward compatibility with imports from '@/storage/database'.
 */

export type { PlayerProfile, SaveRow } from './queries';
export {
  deleteSave,
  getLatestSave,
  getPlayerProfile,
  getSetting,
  getUnlock,
  listSaves,
  listUnlocks,
  loadSave,
  recordGameResult,
  saveGameToDb,
  setSetting,
  setUnlock,
  updatePlayerProfile,
  updateSave,
} from './queries';
export { closeDatabase, getDb, initDatabase, isDatabaseReady, persist } from './schema';
