import { describe, expect, it } from 'vitest';
import { createPrestigeState, getPearlUpgradeDisplayList } from '@/config/prestige-logic';
import { getUpgradeGroups } from '@/ui/screens/pearl-upgrade-helpers';

describe('pearl-upgrade-helpers', () => {
  it('groups specialist upgrades by specialist instead of one generic bucket', () => {
    const upgrades = getPearlUpgradeDisplayList(createPrestigeState());
    const groups = getUpgradeGroups(upgrades);

    expect(groups.has('Fisher')).toBe(true);
    expect(groups.has('Ranger')).toBe(true);
    expect(groups.has('Bombardier')).toBe(true);
    expect(groups.has('Multipliers')).toBe(true);

    const fisherIds = groups.get('Fisher')?.map((upgrade) => upgrade.id) ?? [];
    expect(fisherIds).toContain('blueprint_fisher');
    expect(fisherIds).toContain('fisher_radius');
  });
});
