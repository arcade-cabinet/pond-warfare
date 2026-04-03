/**
 * Campaign Mission Integration Tests — Structural + Branch 8A/8B + Unlocks
 *
 * Validates the full 10-mission campaign structure, branch dependencies,
 * and unlock entries for missions 6-10.
 */

import { describe, expect, it, vi } from 'vitest';
import { BRANCH_MISSIONS_LATE, CAMPAIGN_MISSIONS, getMission } from '@/campaign/missions';
import { UNLOCKS } from '@/config/unlocks';

vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(false),
  persist: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Structural validation — full 10-mission campaign
// ---------------------------------------------------------------------------

describe('Campaign missions — structural (10 total)', () => {
  it('has exactly 10 missions numbered 1-10', () => {
    expect(CAMPAIGN_MISSIONS).toHaveLength(10);
    expect(CAMPAIGN_MISSIONS.map((m) => m.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('each mission has a unique id', () => {
    const ids = CAMPAIGN_MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('each mission has at least 1 objective', () => {
    for (const m of CAMPAIGN_MISSIONS) {
      expect(m.objectives.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('each mission has briefing text', () => {
    for (const m of CAMPAIGN_MISSIONS) {
      expect(m.briefing.length).toBeGreaterThan(50);
    }
  });

  it('each mission has at least 3 dialogues', () => {
    for (const m of CAMPAIGN_MISSIONS) {
      expect(m.dialogues.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('every mission is findable via getMission', () => {
    for (const m of CAMPAIGN_MISSIONS) {
      expect(getMission(m.id)).toBe(m);
    }
  });
});

// ---------------------------------------------------------------------------
// Branch missions 8A/8B (requires Mission 7)
// ---------------------------------------------------------------------------

describe('Branch missions 8A/8B (after Mission 7)', () => {
  it('Mission 8A "Shadow Strike" is defined', () => {
    const m8a = BRANCH_MISSIONS_LATE.A;
    expect(m8a.id).toBe('shadow-strike');
    expect(m8a.number).toBe(8);
    expect(m8a.recommendedBranch).toBe('shadow');
    expect(m8a.objectives).toHaveLength(2);
  });

  it('Mission 8B "Iron Tide" is defined', () => {
    const m8b = BRANCH_MISSIONS_LATE.B;
    expect(m8b.id).toBe('iron-tide');
    expect(m8b.number).toBe(8);
    expect(m8b.recommendedBranch).toBe('fortifications');
    expect(m8b.objectives).toHaveLength(3);
  });

  it('8A pre-unlocks shadow techs', () => {
    expect(BRANCH_MISSIONS_LATE.A.worldOverrides?.startingTech).toEqual(
      expect.arrayContaining(['swiftPaws', 'cunningTraps', 'camouflage']),
    );
  });

  it('8B pre-unlocks fortification + warfare techs', () => {
    expect(BRANCH_MISSIONS_LATE.B.worldOverrides?.startingTech).toEqual(
      expect.arrayContaining(['siegeWorks', 'fortifiedWalls']),
    );
  });

  it('main CAMPAIGN_MISSIONS uses 8A as default path', () => {
    const m8 = CAMPAIGN_MISSIONS.find((m) => m.number === 8);
    expect(m8?.id).toBe('shadow-strike');
  });
});

// ---------------------------------------------------------------------------
// Unlock entries for missions 6-10
// ---------------------------------------------------------------------------

describe('Campaign unlock entries', () => {
  const campaignUnlockIds = [
    'commander_ironpaw',
    'cosmetic_siege_master',
    'cosmetic_shadow_ops',
    'cosmetic_heavy_armor',
    'cosmetic_veteran_badge',
    'cosmetic_champion_title',
    'commander_stormcaller',
  ];

  it('all campaign unlock entries are defined', () => {
    for (const id of campaignUnlockIds) {
      expect(UNLOCKS.find((u) => u.id === id)).toBeDefined();
    }
  });

  it('campaign unlocks have valid check functions', () => {
    for (const id of campaignUnlockIds) {
      const unlock = UNLOCKS.find((u) => u.id === id)!;
      expect(typeof unlock.check).toBe('function');
    }
  });
});
