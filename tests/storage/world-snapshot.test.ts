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
  });

  describe('getRunState', () => {
    it('returns "fresh" when no progression', () => {
      expect(getRunState()).toBe('fresh');
    });

    it('returns "continue" when progression > 0', () => {
      storeV3.progressionLevel.value = 3;
      expect(getRunState()).toBe('continue');
    });

    it('returns "fresh" when progression is 0 even with clams', () => {
      storeV3.totalClams.value = 100;
      expect(getRunState()).toBe('fresh');
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

  describe('captureRunSnapshot', () => {
    it('captures current store state', () => {
      storeV3.totalClams.value = 200;
      storeV3.progressionLevel.value = 5;

      const snap = captureRunSnapshot('sage');

      expect(snap.clams).toBe(200);
      expect(snap.progressionLevel).toBe(5);
      expect(snap.commanderId).toBe('sage');
      expect(snap.matchesThisRun).toBe(0);
      expect(snap.upgradesPurchased).toEqual([]);
    });

    it('captures fresh state correctly', () => {
      const snap = captureRunSnapshot('marshal');

      expect(snap.clams).toBe(0);
      expect(snap.progressionLevel).toBe(0);
      expect(snap.commanderId).toBe('marshal');
    });
  });
});
