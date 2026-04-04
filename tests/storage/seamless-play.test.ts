/**
 * Seamless Play Tests (US7)
 *
 * Validates that PLAY button flow works correctly for both fresh starts
 * and returning players with active runs. Tests the persistence bridge
 * between SQLite (mocked) and store-v3 signals.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock SQLite layer
vi.mock('@/storage/schema', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(true),
  loadPrestigeState: vi.fn().mockResolvedValue(null),
  loadCurrentRun: vi.fn().mockResolvedValue(null),
  loadSelectedCommander: vi.fn().mockResolvedValue('marshal'),
  savePrestigeState: vi.fn().mockResolvedValue(undefined),
  saveCurrentRun: vi.fn().mockResolvedValue(undefined),
  saveSelectedCommander: vi.fn().mockResolvedValue(undefined),
  resetCurrentRun: vi.fn().mockResolvedValue(undefined),
  persist: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/storage/database', () => ({
  getPlayerProfile: vi.fn().mockResolvedValue({
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
  }),
}));

import {
  isDatabaseReady,
  loadCurrentRun,
  loadPrestigeState,
  saveCurrentRun,
} from '@/storage/schema';
import * as storeV3 from '@/ui/store-v3';
import {
  hydrateV3StoreFromDb,
  persistCurrentRun,
  resetCurrentRunOnPrestige,
} from '@/ui/store-v3-persistence';

describe('seamless play — hydration', () => {
  beforeEach(() => {
    storeV3.progressionLevel.value = 0;
    storeV3.totalClams.value = 0;
    storeV3.prestigeRank.value = 0;
    storeV3.totalPearls.value = 0;
    storeV3.prestigeState.value = {
      rank: 0,
      pearls: 0,
      totalPearlsEarned: 0,
      upgradeRanks: {},
    };
    vi.clearAllMocks();
    vi.mocked(isDatabaseReady).mockReturnValue(true);
  });

  it('fresh start: signals stay at defaults when no run exists', async () => {
    vi.mocked(loadPrestigeState).mockResolvedValue(null);
    vi.mocked(loadCurrentRun).mockResolvedValue(null);

    await hydrateV3StoreFromDb();

    expect(storeV3.progressionLevel.value).toBe(0);
    expect(storeV3.totalClams.value).toBe(0);
  });

  it('returning player: hydrates progression and clams from SQLite', async () => {
    vi.mocked(loadPrestigeState).mockResolvedValue({
      rank: 2,
      pearls: 50,
      pearl_upgrades: '{"gathering_speed": 1}',
      total_matches: 10,
      total_clams_earned: 500,
      highest_progression: 5,
    });
    vi.mocked(loadCurrentRun).mockResolvedValue({
      clams: 120,
      upgrades_purchased: '{}',
      lodge_state: '{}',
      progression_level: 3,
      matches_this_run: 5,
    });

    await hydrateV3StoreFromDb();

    expect(storeV3.progressionLevel.value).toBe(3);
    expect(storeV3.totalClams.value).toBe(120);
    expect(storeV3.prestigeRank.value).toBe(2);
    expect(storeV3.totalPearls.value).toBe(50);
  });

  it('does nothing when database is not ready', async () => {
    vi.mocked(isDatabaseReady).mockReturnValue(false);
    storeV3.progressionLevel.value = 99;

    await hydrateV3StoreFromDb();

    // Should not have changed
    expect(storeV3.progressionLevel.value).toBe(99);
    expect(loadPrestigeState).not.toHaveBeenCalled();
  });
});

describe('seamless play — auto-save after match', () => {
  beforeEach(() => {
    storeV3.progressionLevel.value = 0;
    storeV3.totalClams.value = 0;
    vi.clearAllMocks();
    vi.mocked(isDatabaseReady).mockReturnValue(true);
  });

  it('persistCurrentRun saves progression and clams to SQLite', async () => {
    storeV3.totalClams.value = 200;
    storeV3.progressionLevel.value = 4;

    vi.mocked(loadCurrentRun).mockResolvedValue({
      clams: 100,
      upgrades_purchased: '{}',
      lodge_state: '{}',
      progression_level: 3,
      matches_this_run: 2,
    });

    await persistCurrentRun();

    expect(saveCurrentRun).toHaveBeenCalledWith({
      clams: 200,
      upgrades_purchased: '{}',
      lodge_state: '{}',
      progression_level: 4,
      matches_this_run: 3, // incremented from 2
    });
  });

  it('persistCurrentRun handles first match (no existing run)', async () => {
    storeV3.totalClams.value = 50;
    storeV3.progressionLevel.value = 1;

    vi.mocked(loadCurrentRun).mockResolvedValue(null);

    await persistCurrentRun();

    expect(saveCurrentRun).toHaveBeenCalledWith({
      clams: 50,
      upgrades_purchased: '{}',
      lodge_state: '{}',
      progression_level: 1,
      matches_this_run: 1,
    });
  });
});

describe('seamless play — prestige reset', () => {
  beforeEach(() => {
    storeV3.progressionLevel.value = 5;
    storeV3.totalClams.value = 300;
    vi.clearAllMocks();
    vi.mocked(isDatabaseReady).mockReturnValue(true);
  });

  it('resetCurrentRunOnPrestige clears signals and SQLite', async () => {
    await resetCurrentRunOnPrestige();

    expect(storeV3.progressionLevel.value).toBe(0);
    expect(storeV3.totalClams.value).toBe(0);
  });
});
