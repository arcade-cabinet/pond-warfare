import { describe, expect, it } from 'vitest';
import {
  buildCurrentRunUpgradeState,
  parseCurrentRunUpgradeSnapshot,
  serializeCurrentRunUpgradeSnapshot,
  snapshotCurrentRunUpgradeState,
} from '@/ui/current-run-upgrades';

describe('current run upgrades', () => {
  it('parses the persisted current-run upgrade snapshot shape', () => {
    const snapshot = parseCurrentRunUpgradeSnapshot(
      '{"nodes":["gathering_fish_gathering_t0"],"diamonds":["dock_wing"]}',
    );

    expect(snapshot.nodes).toEqual(['gathering_fish_gathering_t0']);
    expect(snapshot.diamonds).toEqual(['dock_wing']);
  });

  it('supports legacy array-only snapshots as linear node ids', () => {
    const snapshot = parseCurrentRunUpgradeSnapshot('["gathering_fish_gathering_t0"]');

    expect(snapshot.nodes).toEqual(['gathering_fish_gathering_t0']);
    expect(snapshot.diamonds).toEqual([]);
  });

  it('builds a run state with prestige-filled tiers and persisted purchases', () => {
    const { state, prestigeFilledNodes } = buildCurrentRunUpgradeState({
      clams: 150,
      purchasedNodeIds: ['gathering_fish_gathering_t1'],
      purchasedDiamondIds: ['dock_wing'],
      startingTierRank: 1,
    });

    expect(state.clams).toBe(150);
    expect(prestigeFilledNodes.has('gathering_fish_gathering_t0')).toBe(true);
    expect(state.purchasedNodes.has('gathering_fish_gathering_t0')).toBe(true);
    expect(state.purchasedNodes.has('gathering_fish_gathering_t1')).toBe(true);
    expect(state.purchasedDiamonds.has('dock_wing')).toBe(true);
  });

  it('serializes only bought nodes, not prestige-filled tiers', () => {
    const { state, prestigeFilledNodes } = buildCurrentRunUpgradeState({
      clams: 100,
      purchasedNodeIds: ['gathering_fish_gathering_t1'],
      purchasedDiamondIds: [],
      startingTierRank: 1,
    });

    const snapshot = snapshotCurrentRunUpgradeState(state, prestigeFilledNodes);

    expect(snapshot.nodes).toEqual(['gathering_fish_gathering_t1']);
    expect(serializeCurrentRunUpgradeSnapshot(snapshot)).toBe(
      '{"nodes":["gathering_fish_gathering_t1"],"diamonds":[]}',
    );
  });
});
