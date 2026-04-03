/**
 * Upgrade Web State Tests (v3.0 — US12)
 *
 * Validates upgrade web purchase logic:
 * - Node purchase with prerequisite chains
 * - Diamond node unlock when prereqs met
 * - Cost deduction and Clam balance tracking
 * - Active effect computation
 * - Display state resolution
 */

import { describe, expect, it } from 'vitest';
import { generateUpgradeWeb, type UpgradeWeb } from '@/config/upgrade-web';
import {
  computeActiveEffects,
  countPurchased,
  createUpgradeWebState,
  getDiamondDisplayInfo,
  getNodeDisplayState,
  getPathDisplayInfo,
  purchaseDiamondNode,
  purchaseNode,
  type UpgradeWebPurchaseState,
} from '@/ui/upgrade-web-state';

// ── Helpers ───────────────────────────────────────────────────────

let web: UpgradeWeb;

function freshWeb(): UpgradeWeb {
  if (!web) web = generateUpgradeWeb();
  return web;
}

function stateWithClams(clams: number): UpgradeWebPurchaseState {
  return createUpgradeWebState(clams);
}

// ── State creation tests ──────────────────────────────────────────

describe('Upgrade web state creation', () => {
  it('should create fresh state with given Clams', () => {
    const state = createUpgradeWebState(1000);
    expect(state.clams).toBe(1000);
    expect(state.purchasedNodes.size).toBe(0);
    expect(state.purchasedDiamonds.size).toBe(0);
    expect(state.highestTiers.size).toBe(0);
  });
});

// ── Linear node purchase tests ────────────────────────────────────

describe('Linear node purchase', () => {
  it('should purchase tier 0 node when affordable', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const nodeId = 'gathering_fish_gathering_t0'; // cost 10

    const result = purchaseNode(state, w, nodeId);
    expect(result.success).toBe(true);
    expect(result.newClams).toBe(990);
    expect(state.purchasedNodes.has(nodeId)).toBe(true);
  });

  it('should reject purchase when not enough Clams', () => {
    const w = freshWeb();
    const state = stateWithClams(5); // fish_gathering t0 costs 10

    const result = purchaseNode(state, w, 'gathering_fish_gathering_t0');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Need');
  });

  it('should reject purchase of already-owned node', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const nodeId = 'gathering_fish_gathering_t0';

    purchaseNode(state, w, nodeId);
    const result = purchaseNode(state, w, nodeId);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Already purchased');
  });

  it('should enforce prerequisite chain', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);

    // Tier 1 requires tier 0
    const result = purchaseNode(state, w, 'gathering_fish_gathering_t1');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Prerequisite');
  });

  it('should allow tier 1 after tier 0 purchased', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);

    purchaseNode(state, w, 'gathering_fish_gathering_t0');
    const result = purchaseNode(state, w, 'gathering_fish_gathering_t1');
    expect(result.success).toBe(true);
  });

  it('should track highest tier per path (1-indexed)', () => {
    const w = freshWeb();
    const state = stateWithClams(10000);

    // highestTiers stores tier+1 (1-indexed) for diamond prereq compatibility
    purchaseNode(state, w, 'gathering_fish_gathering_t0');
    expect(state.highestTiers.get('gathering_fish_gathering')).toBe(1); // t0 purchased = level 1

    purchaseNode(state, w, 'gathering_fish_gathering_t1');
    expect(state.highestTiers.get('gathering_fish_gathering')).toBe(2); // t1 purchased = level 2

    purchaseNode(state, w, 'gathering_fish_gathering_t2');
    expect(state.highestTiers.get('gathering_fish_gathering')).toBe(3); // t2 purchased = level 3
  });

  it('should reject unknown node ID', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const result = purchaseNode(state, w, 'nonexistent_node');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Unknown');
  });
});

// ── Diamond node purchase tests ──────────────────────────────────

describe('Diamond node purchase', () => {
  function buyPath(
    state: UpgradeWebPurchaseState,
    w: UpgradeWeb,
    category: string,
    subcategory: string,
    upToTier: number,
  ): void {
    for (let t = 0; t <= upToTier; t++) {
      purchaseNode(state, w, `${category}_${subcategory}_t${t}`);
    }
  }

  it('should reject diamond when prerequisites not met', () => {
    const w = freshWeb();
    const state = stateWithClams(10000);

    // dock_wing requires gathering.fish_gathering tier 5
    const result = purchaseDiamondNode(state, w, 'dock_wing');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Prerequisites');
  });

  it('should purchase diamond when prerequisites met', () => {
    const w = freshWeb();
    const state = stateWithClams(100000);

    // Buy fish_gathering t0 through t4 (stores tier level 5, matching requirement)
    buyPath(state, w, 'gathering', 'fish_gathering', 4);

    const result = purchaseDiamondNode(state, w, 'dock_wing');
    expect(result.success).toBe(true);
    expect(state.purchasedDiamonds.has('dock_wing')).toBe(true);
  });

  it('should reject diamond when not enough Clams', () => {
    const w = freshWeb();
    const state = stateWithClams(100000);

    buyPath(state, w, 'gathering', 'fish_gathering', 4);
    // Force low clams after buying path
    state.clams = 50; // dock_wing costs 100

    const result = purchaseDiamondNode(state, w, 'dock_wing');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Need');
  });

  it('should reject duplicate diamond purchase', () => {
    const w = freshWeb();
    const state = stateWithClams(100000);

    buyPath(state, w, 'gathering', 'fish_gathering', 4);
    purchaseDiamondNode(state, w, 'dock_wing');

    const result = purchaseDiamondNode(state, w, 'dock_wing');
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Already purchased');
  });

  it('should handle multi-path diamond prerequisites', () => {
    const w = freshWeb();
    const state = stateWithClams(100000);

    // guardian_specialist requires defense.lodge_hp:5 AND defense.wall_hp:5
    buyPath(state, w, 'defense', 'lodge_hp', 4);

    // Only one path met
    const result1 = purchaseDiamondNode(state, w, 'guardian_specialist');
    expect(result1.success).toBe(false);

    // Both paths met
    buyPath(state, w, 'defense', 'wall_hp', 4);
    const result2 = purchaseDiamondNode(state, w, 'guardian_specialist');
    expect(result2.success).toBe(true);
  });
});

// ── Display state tests ──────────────────────────────────────────

describe('Node display state', () => {
  it('should show tier 0 as available for new player', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const node = w.nodeMap.get('gathering_fish_gathering_t0')!;

    expect(getNodeDisplayState(state, node)).toBe('available');
  });

  it('should show tier 1 as locked when tier 0 not purchased', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const node = w.nodeMap.get('gathering_fish_gathering_t1')!;

    expect(getNodeDisplayState(state, node)).toBe('locked');
  });

  it('should show purchased node as purchased', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    purchaseNode(state, w, 'gathering_fish_gathering_t0');
    const node = w.nodeMap.get('gathering_fish_gathering_t0')!;

    expect(getNodeDisplayState(state, node)).toBe('purchased');
  });

  it('should show tier 1 as available after tier 0 purchased', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    purchaseNode(state, w, 'gathering_fish_gathering_t0');
    const node = w.nodeMap.get('gathering_fish_gathering_t1')!;

    expect(getNodeDisplayState(state, node)).toBe('available');
  });
});

describe('Path display info', () => {
  it('should generate display info for a subcategory path', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);

    const info = getPathDisplayInfo(state, w, 'gathering', 'fish_gathering');
    expect(info).toHaveLength(10);

    // First node should be available
    expect(info[0].state).toBe('available');
    expect(info[0].name).toBe('Basic Fish Gathering');
    expect(info[0].cost).toBe(10);

    // Second node should be locked
    expect(info[1].state).toBe('locked');
  });

  it('should include effect labels', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);

    const info = getPathDisplayInfo(state, w, 'gathering', 'fish_gathering');
    expect(info[0].effectLabel).toContain('%');
    expect(info[0].effectLabel).toContain('Fish Gathering');
  });
});

describe('Diamond display info', () => {
  it('should show locked diamond with prerequisite details', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const diamond = w.diamondMap.get('dock_wing')!;

    const info = getDiamondDisplayInfo(state, diamond);
    expect(info.state).toBe('locked');
    expect(info.prerequisitesMet).toBe(false);
    expect(info.prerequisites.length).toBeGreaterThan(0);
  });
});

// ── Active effects tests ──────────────────────────────────────────

describe('Active effect computation', () => {
  it('should return empty map for no purchases', () => {
    const w = freshWeb();
    const state = stateWithClams(1000);
    const effects = computeActiveEffects(state, w);
    expect(effects.size).toBe(0);
  });

  it('should accumulate effects from purchased nodes', () => {
    const w = freshWeb();
    const state = stateWithClams(10000);

    purchaseNode(state, w, 'gathering_fish_gathering_t0'); // effect 0.05
    purchaseNode(state, w, 'gathering_fish_gathering_t1'); // effect 0.10

    const effects = computeActiveEffects(state, w);
    const fishEffect = effects.get('gathering_fish_gathering');
    expect(fishEffect).toBeCloseTo(0.15); // 0.05 + 0.10
  });

  it('should track effects across multiple paths', () => {
    const w = freshWeb();
    const state = stateWithClams(10000);

    purchaseNode(state, w, 'gathering_fish_gathering_t0');
    purchaseNode(state, w, 'combat_attack_power_t0');

    const effects = computeActiveEffects(state, w);
    expect(effects.has('gathering_fish_gathering')).toBe(true);
    expect(effects.has('combat_attack_power')).toBe(true);
  });
});

// ── Count tests ──────────────────────────────────────────────────

describe('Purchase counting', () => {
  it('should count zero for fresh state', () => {
    const state = stateWithClams(1000);
    const count = countPurchased(state);
    expect(count.linear).toBe(0);
    expect(count.diamond).toBe(0);
    expect(count.total).toBe(0);
  });

  it('should count linear and diamond separately', () => {
    const w = freshWeb();
    const state = stateWithClams(100000);

    // Buy 3 linear nodes
    purchaseNode(state, w, 'gathering_fish_gathering_t0');
    purchaseNode(state, w, 'gathering_fish_gathering_t1');
    purchaseNode(state, w, 'gathering_fish_gathering_t2');

    const count = countPurchased(state);
    expect(count.linear).toBe(3);
    expect(count.diamond).toBe(0);
    expect(count.total).toBe(3);
  });
});
