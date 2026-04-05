/**
 * World Snapshot Tests
 *
 * Validates run state detection and snapshot capture for seamless PLAY (US7).
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { captureRunSnapshot, getRunState, hasActiveRun } from '@/storage/world-snapshot';
import * as storeV3 from '@/ui/store-v3';

describe('world-snapshot', () => {
  beforeEach(() => {
    storeV3.progressionLevel.value = 0;
    storeV3.totalClams.value = 0;
    storeV3.matchEventsCompleted.value = 0;
    storeV3.prestigeState.value = {
      rank: 0,
      pearls: 0,
      totalPearlsEarned: 0,
      upgradeRanks: {},
    };
  });

  describe('getRunState', () => {
    it('returns "fresh" when no progression and no clams', () => {
      expect(getRunState()).toBe('fresh');
    });

    it('returns "continue" when progression > 0', () => {
      storeV3.progressionLevel.value = 3;
      expect(getRunState()).toBe('continue');
    });

    it('returns "continue" when clams > 0 (same predicate as hasActiveRun)', () => {
      storeV3.totalClams.value = 100;
      expect(getRunState()).toBe('continue');
    });
  });

  describe('hasActiveRun', () => {
    it('returns false when fresh', () => {
      expect(hasActiveRun()).toBe(false);
    });

    it('returns true when progression > 0', () => {
      storeV3.progressionLevel.value = 1;
      expect(hasActiveRun()).toBe(true);
    });

    it('returns true when clams > 0', () => {
      storeV3.totalClams.value = 50;
      expect(hasActiveRun()).toBe(true);
    });
  });

  describe('getRunState and hasActiveRun consistency', () => {
    it('getRunState returns "continue" iff hasActiveRun returns true', () => {
      expect(getRunState() === 'continue').toBe(hasActiveRun());

      storeV3.totalClams.value = 50;
      expect(getRunState() === 'continue').toBe(hasActiveRun());

      storeV3.totalClams.value = 0;
      storeV3.progressionLevel.value = 3;
      expect(getRunState() === 'continue').toBe(hasActiveRun());
    });
  });

  describe('captureRunSnapshot', () => {
    it('captures current store state including matchEventsCompleted', () => {
      storeV3.totalClams.value = 200;
      storeV3.progressionLevel.value = 5;
      storeV3.matchEventsCompleted.value = 3;

      const snap = captureRunSnapshot('sage');

      expect(snap.clams).toBe(200);
      expect(snap.progressionLevel).toBe(5);
      expect(snap.commanderId).toBe('sage');
      expect(snap.matchesThisRun).toBe(3);
    });

    it('captures upgrade ranks from prestige state', () => {
      storeV3.prestigeState.value = {
        rank: 2,
        pearls: 50,
        totalPearlsEarned: 100,
        upgradeRanks: { gather_speed: 1, army_size: 2 },
      };

      const snap = captureRunSnapshot('marshal');

      expect(snap.upgradesPurchased).toContain('gather_speed');
      expect(snap.upgradesPurchased).toContain('army_size');
      expect(snap.upgradesPurchased).toHaveLength(2);
    });

    it('captures fresh state correctly', () => {
      const snap = captureRunSnapshot('marshal');

      expect(snap.clams).toBe(0);
      expect(snap.progressionLevel).toBe(0);
      expect(snap.commanderId).toBe('marshal');
      expect(snap.matchesThisRun).toBe(0);
      expect(snap.upgradesPurchased).toEqual([]);
    });
  });
});
