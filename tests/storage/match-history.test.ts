/**
 * Match History Storage Tests
 *
 * Validates save, load, and auto-prune logic.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MatchRecord } from '@/storage/match-history';

// Mock the schema module to avoid real SQLite
const mockRun = vi.fn().mockResolvedValue({ changes: {} });
const mockQuery = vi.fn().mockResolvedValue({ values: [] });

vi.mock('@/storage/schema', () => ({
  getDb: () => ({ run: mockRun, query: mockQuery }),
  persist: vi.fn().mockResolvedValue(undefined),
}));

// Import AFTER mocks
const { saveMatchRecord, getMatchHistory } = await import('@/storage/match-history');

function makeRecord(overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: 'test-id-1',
    date: '2026-03-31T12:00:00Z',
    result: 'win',
    difficulty: 'normal',
    scenario: 'standard',
    commander: 'marshal',
    duration: 300,
    kills: 10,
    unitsLost: 2,
    buildingsBuilt: 5,
    techsResearched: 3,
    xpEarned: 450,
    ...overrides,
  };
}

describe('match-history', () => {
  beforeEach(() => {
    mockRun.mockClear();
    mockQuery.mockClear();
  });

  it('saves a match record with correct fields', async () => {
    const record = makeRecord();
    await saveMatchRecord(record);

    // Should call INSERT and DELETE (prune)
    expect(mockRun).toHaveBeenCalledTimes(2);
    const insertCall = mockRun.mock.calls[0];
    expect(insertCall[0]).toContain('INSERT INTO match_history');
    expect(insertCall[1]).toContain('test-id-1');
    expect(insertCall[1]).toContain('win');
    expect(insertCall[1]).toContain(450);
  });

  it('prunes records beyond 50', async () => {
    await saveMatchRecord(makeRecord());

    const pruneCall = mockRun.mock.calls[1];
    expect(pruneCall[0]).toContain('DELETE FROM match_history');
    expect(pruneCall[1]).toContain(50);
  });

  it('returns empty array when no records', async () => {
    mockQuery.mockResolvedValueOnce({ values: [] });
    const records = await getMatchHistory();
    expect(records).toEqual([]);
  });

  it('maps database rows to MatchRecord', async () => {
    mockQuery.mockResolvedValueOnce({
      values: [
        {
          id: 'r1',
          date: '2026-03-31T12:00:00Z',
          result: 'win',
          difficulty: 'hard',
          scenario: 'island',
          commander: 'sage',
          duration: 500,
          kills: 15,
          units_lost: 3,
          buildings_built: 7,
          techs_researched: 4,
          xp_earned: 600,
        },
      ],
    });

    const records = await getMatchHistory();
    expect(records).toHaveLength(1);
    expect(records[0].id).toBe('r1');
    expect(records[0].result).toBe('win');
    expect(records[0].unitsLost).toBe(3);
    expect(records[0].buildingsBuilt).toBe(7);
    expect(records[0].xpEarned).toBe(600);
  });
});
