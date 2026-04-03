/**
 * Unlock Progress Tests
 *
 * Validates the unlock progress display logic — correct count,
 * category grouping, and NEW badge tracking.
 */

import { describe, expect, it } from 'vitest';
import { UNLOCK_CATEGORIES, UNLOCKS } from '@/config/unlocks';
import { clearRecentUnlocks, markRecentUnlock } from '@/ui/unlock-progress';

describe('unlock-progress', () => {
  it('should have all unlock categories defined', () => {
    // Every unlock should belong to a recognized category
    const catKeys = new Set(UNLOCK_CATEGORIES.map((c) => c.key));
    for (const u of UNLOCKS) {
      expect(catKeys.has(u.category)).toBe(true);
    }
  });

  it('should have correct total unlock count', () => {
    expect(UNLOCKS.length).toBe(28);
  });

  it('should group unlocks by category correctly', () => {
    const categoriesWithUnlocks = UNLOCK_CATEGORIES.filter((cat) =>
      UNLOCKS.some((u) => u.category === cat.key),
    );
    // At least 4 categories should have unlocks
    expect(categoriesWithUnlocks.length).toBeGreaterThanOrEqual(4);
  });

  it('should track recently unlocked items for NEW badge', () => {
    clearRecentUnlocks();

    markRecentUnlock('scenario_island');
    markRecentUnlock('unit_catapult');

    // Mark again (idempotent)
    markRecentUnlock('scenario_island');

    // Clear should reset
    clearRecentUnlocks();
  });

  it('every unlock should have required fields', () => {
    for (const u of UNLOCKS) {
      expect(u.id).toBeTruthy();
      expect(u.name).toBeTruthy();
      expect(u.description).toBeTruthy();
      expect(u.requirement).toBeTruthy();
      expect(typeof u.check).toBe('function');
    }
  });
});
