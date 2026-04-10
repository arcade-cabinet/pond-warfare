// @vitest-environment jsdom
/**
 * Pearl Loadout Builder Tests (v3.1 — US5, US6)
 *
 * Validates:
 * - Commander selection updates signal
 * - Locked commander shows cost, unlocked shows checkmark
 * - Starting tier auto-fills correct number of nodes
 * - Pearl deduction works for commander unlock and starting tier
 * - Variable cost schedule for starting tier
 */

import { describe, expect, it } from 'vitest';
import {
  createPrestigeState,
  getCostForRank,
  getStartingTierName,
  getStartingTierRank,
  getPearlUpgradeDisplayList,
  type PrestigeState,
  purchasePearlUpgrade,
  STARTING_TIER_NAMES,
} from '@/config/prestige-logic';
import { getPearlUpgrade } from '@/config/config-loader';
import { COMMANDERS } from '@/config/commanders';
import type { PlayerProfile } from '@/storage';
import { generateUpgradeWeb } from '@/config/upgrade-web';
import {
  autoFillToStartingTier,
  createUpgradeWebState,
  getNodeDisplayState,
} from '@/ui/upgrade-web-state';

describe('Pearl Loadout Builder — US5', () => {
  describe('Commander selection', () => {
    it('should list all 7 commanders in config', () => {
      expect(COMMANDERS.length).toBe(7);
    });

    it('marshal is unlocked by default (null unlock check)', () => {
      const marshal = COMMANDERS.find((c) => c.id === 'marshal');
      expect(marshal).toBeDefined();
      expect(marshal!.unlock).toBeNull();
    });

    it('other commanders have unlock requirements', () => {
      const locked = COMMANDERS.filter((c) => c.unlock !== null);
      expect(locked.length).toBe(6);
    });

    it('sage unlocks at 3 wins', () => {
      const sage = COMMANDERS.find((c) => c.id === 'sage')!;
      expect(sage.unlock).not.toBeNull();

      const noWins = { total_wins: 0 } as unknown as PlayerProfile;
      expect(sage.unlock!.check(noWins)).toBe(false);

      const threeWins = { total_wins: 3 } as unknown as PlayerProfile;
      expect(sage.unlock!.check(threeWins)).toBe(true);
    });
  });

  describe('Starting tier config', () => {
    it('starting_tier upgrade exists in prestige.json', () => {
      const def = getPearlUpgrade('starting_tier');
      expect(def).toBeDefined();
      expect(def.max_rank).toBe(8);
      expect(def.effect.type).toBe('starting_tier');
    });

    it('cost_schedule provides variable costs per rank', () => {
      const def = getPearlUpgrade('starting_tier');
      expect(def.cost_schedule).toBeDefined();
      expect(def.cost_schedule!.length).toBe(8);
      expect(def.cost_schedule![0]).toBe(20);
      expect(def.cost_schedule![7]).toBe(2560);
    });

    it('getCostForRank returns schedule cost when available', () => {
      const def = getPearlUpgrade('starting_tier');
      expect(getCostForRank(def, 0)).toBe(20);
      expect(getCostForRank(def, 1)).toBe(40);
      expect(getCostForRank(def, 4)).toBe(320);
      expect(getCostForRank(def, 7)).toBe(2560);
    });

    it('getCostForRank falls back to cost_per_rank for flat-cost upgrades', () => {
      const def = getPearlUpgrade('blueprint_fisher');
      expect(def.cost_schedule).toBeUndefined();
      expect(getCostForRank(def, 0)).toBe(3);
      expect(getCostForRank(def, 4)).toBe(3);
    });

    it('has 9 tier names from Basic to Mythic', () => {
      expect(STARTING_TIER_NAMES.length).toBe(9);
      expect(STARTING_TIER_NAMES[0]).toBe('Basic');
      expect(STARTING_TIER_NAMES[8]).toBe('Mythic');
    });
  });

  describe('Starting tier purchase', () => {
    it('first rank costs 20 Pearls', () => {
      const state: PrestigeState = {
        rank: 2,
        pearls: 30,
        totalPearlsEarned: 50,
        upgradeRanks: {},
      };

      const { state: newState, result } = purchasePearlUpgrade(state, 'starting_tier');
      expect(result.success).toBe(true);
      expect(newState.pearls).toBe(10); // 30 - 20
      expect(getStartingTierRank(newState)).toBe(1);
      expect(getStartingTierName(1)).toBe('Enhanced');
    });

    it('second rank costs 40 Pearls (not 20)', () => {
      const state: PrestigeState = {
        rank: 3,
        pearls: 100,
        totalPearlsEarned: 200,
        upgradeRanks: { starting_tier: 1 },
      };

      const { state: newState, result } = purchasePearlUpgrade(state, 'starting_tier');
      expect(result.success).toBe(true);
      expect(newState.pearls).toBe(60); // 100 - 40
      expect(getStartingTierRank(newState)).toBe(2);
    });

    it('rejects purchase when insufficient Pearls for current rank cost', () => {
      const state: PrestigeState = {
        rank: 5,
        pearls: 30,
        totalPearlsEarned: 500,
        upgradeRanks: { starting_tier: 1 }, // next rank costs 40
      };

      const { result } = purchasePearlUpgrade(state, 'starting_tier');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Need 40');
    });

    it('rejects purchase at max rank (8)', () => {
      const state: PrestigeState = {
        rank: 10,
        pearls: 10000,
        totalPearlsEarned: 20000,
        upgradeRanks: { starting_tier: 8 },
      };

      const { result } = purchasePearlUpgrade(state, 'starting_tier');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('max rank');
    });
  });

  describe('Display list includes starting_tier', () => {
    it('starting_tier appears in display list with correct effect summary', () => {
      const state: PrestigeState = {
        rank: 3,
        pearls: 100,
        totalPearlsEarned: 200,
        upgradeRanks: { starting_tier: 3 },
      };

      const list = getPearlUpgradeDisplayList(state);
      const st = list.find((u) => u.id === 'starting_tier');
      expect(st).toBeDefined();
      expect(st!.effectSummary).toBe('Mega'); // rank 3 = Mega
      expect(st!.currentRank).toBe(3);
      expect(st!.maxRank).toBe(8);
      expect(st!.costPerRank).toBe(160); // cost_schedule[3]
    });

    it('starting_tier at rank 0 shows Basic', () => {
      const state = createPrestigeState();
      const list = getPearlUpgradeDisplayList(state);
      const st = list.find((u) => u.id === 'starting_tier');
      expect(st!.effectSummary).toBe('Basic');
      expect(st!.costPerRank).toBe(20); // cost_schedule[0]
    });
  });
});

describe('Starting Tier Auto-Fill — US6', () => {
  it('auto-fills no nodes when startingTierRank is 0', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    const filled = autoFillToStartingTier(state, web, 0);
    expect(filled.size).toBe(0);
    expect(state.purchasedNodes.size).toBe(0);
  });

  it('auto-fills tier 0 nodes when startingTierRank is 1', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    const filled = autoFillToStartingTier(state, web, 1);

    // All tier-0 nodes should be filled
    const tier0Nodes = web.nodes.filter((n) => n.tier === 0);
    expect(filled.size).toBe(tier0Nodes.length);
    expect(filled.size).toBeGreaterThan(0);

    // All filled nodes should be in purchasedNodes
    for (const nodeId of filled) {
      expect(state.purchasedNodes.has(nodeId)).toBe(true);
    }
  });

  it('auto-fills tiers 0-2 when startingTierRank is 3', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    const filled = autoFillToStartingTier(state, web, 3);

    // All tier 0, 1, 2 nodes should be filled
    const eligibleNodes = web.nodes.filter((n) => n.tier <= 2);
    expect(filled.size).toBe(eligibleNodes.length);
  });

  it('does not cost any Clams', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    autoFillToStartingTier(state, web, 3);
    expect(state.clams).toBe(100); // unchanged
  });

  it('does not overwrite already-purchased nodes', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);

    // Pre-purchase a tier 0 node
    const firstNode = web.nodes.find((n) => n.tier === 0)!;
    state.purchasedNodes.add(firstNode.id);

    const filled = autoFillToStartingTier(state, web, 1);

    // The pre-purchased node should NOT be in the filled set
    expect(filled.has(firstNode.id)).toBe(false);
    // But it should still be purchased
    expect(state.purchasedNodes.has(firstNode.id)).toBe(true);
  });

  it('updates highestTiers for diamond prereq tracking', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    autoFillToStartingTier(state, web, 2);

    // Should have highest tiers set for all paths
    expect(state.highestTiers.size).toBeGreaterThan(0);
    for (const [, tier] of state.highestTiers) {
      expect(tier).toBeGreaterThanOrEqual(1);
    }
  });

  it('prestige-filled nodes report prestige display state', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    const filled = autoFillToStartingTier(state, web, 1);

    const tier0Node = web.nodes.find((n) => n.tier === 0)!;
    const displayState = getNodeDisplayState(state, tier0Node, filled);
    expect(displayState).toBe('prestige');
  });

  it('non-prestige purchased nodes still show as purchased', () => {
    const web = generateUpgradeWeb();
    const state = createUpgradeWebState(100);
    const filled = autoFillToStartingTier(state, web, 1);

    // Manually purchase a tier 1 node (not in prestige set)
    const tier1Node = web.nodes.find((n) => n.tier === 1)!;
    state.purchasedNodes.add(tier1Node.id);

    const displayState = getNodeDisplayState(state, tier1Node, filled);
    expect(displayState).toBe('purchased');
  });
});
