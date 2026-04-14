// @vitest-environment jsdom
/**
 * UpgradeWebScreen Tests (v3.1 -- US12)
 *
 * Validates the compact Clam upgrade modal:
 * - Generates 240+ nodes across 6 categories
 * - Next-available-node logic per category
 * - Purchase updates state and deducts clams
 * - Category completion detection
 * - findCheapestAvailableNodeId helper
 * - Diamond node display info
 */

import { signal } from '@preact/signals';
import { describe, expect, it } from 'vitest';
import { getUpgradeCategories } from '@/config/config-loader';
import {
  generateUpgradeWeb,
  getDiamondsForCategory,
  getNodesForCategory,
  getNodesForPath,
  type UpgradeNode,
} from '@/config/upgrade-web';
import { findCheapestAvailableNodeId, stateColor } from '@/ui/screens/UpgradeNodeRow';
import {
  createUpgradeWebState,
  getDiamondDisplayInfo,
  getNodeDisplayState,
  purchaseNode,
} from '@/ui/upgrade-web-state';

function requireNode(web: ReturnType<typeof generateUpgradeWeb>, nodeId: string): UpgradeNode {
  const node = web.nodeMap.get(nodeId);
  expect(node).toBeDefined();
  if (!node) {
    throw new Error(`Expected upgrade node ${nodeId}`);
  }
  return node;
}

describe('UpgradeWebScreen -- US12', () => {
  describe('Upgrade web catalog', () => {
    it('should generate 240+ linear nodes', () => {
      const web = generateUpgradeWeb();
      expect(web.nodes.length).toBeGreaterThanOrEqual(240);
    });

    it('should have 6 categories', () => {
      const categories = getUpgradeCategories();
      expect(Object.keys(categories).length).toBe(6);
    });

    it('should have expected category keys', () => {
      const categories = getUpgradeCategories();
      const keys = Object.keys(categories);
      expect(keys).toContain('gathering');
      expect(keys).toContain('combat');
      expect(keys).toContain('defense');
      expect(keys).toContain('utility');
      expect(keys).toContain('economy');
      expect(keys).toContain('siege');
    });

    it('should have 10 tiers per subcategory path', () => {
      const web = generateUpgradeWeb();
      const nodes = getNodesForPath(web, 'gathering', 'fish_gathering');
      expect(nodes.length).toBe(10);
    });

    it('should have diamond nodes', () => {
      const web = generateUpgradeWeb();
      expect(web.diamondNodes.length).toBeGreaterThan(0);
    });
  });

  describe('Next-available-node per category', () => {
    it('should find tier 0 nodes as next available when none purchased', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      const nodes = getNodesForCategory(web, 'gathering');
      const cheapest = findCheapestAvailableNodeId(nodes, state);
      expect(cheapest).toBeTruthy();
      expect(requireNode(web, cheapest as string)?.tier).toBe(0);
    });

    it('should find tier 1 node after purchasing all tier 0 in a category', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(50000);
      const categories = getUpgradeCategories();
      const subcats = Object.keys(categories.gathering.subcategories);

      // Purchase all tier 0 nodes in gathering
      for (const sub of subcats) {
        purchaseNode(state, web, `gathering_${sub}_t0`);
      }

      const nodes = getNodesForCategory(web, 'gathering');
      const cheapest = findCheapestAvailableNodeId(nodes, state);
      expect(cheapest).toBeTruthy();
      expect(requireNode(web, cheapest as string)?.tier).toBe(1);
    });

    it('should return null when all nodes are purchased', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(999999);
      const categories = getUpgradeCategories();
      const subcats = Object.keys(categories.gathering.subcategories);

      // Purchase all 10 tiers for all gathering subcategories
      for (const sub of subcats) {
        for (let t = 0; t < 10; t++) {
          purchaseNode(state, web, `gathering_${sub}_t${t}`);
        }
      }

      const nodes = getNodesForCategory(web, 'gathering');
      const cheapest = findCheapestAvailableNodeId(nodes, state);
      expect(cheapest).toBeNull();
    });

    it('should detect category completion', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(999999);
      const categories = getUpgradeCategories();
      const subcats = Object.keys(categories.gathering.subcategories);

      const nodes = getNodesForCategory(web, 'gathering');

      // Not complete initially
      expect(nodes.every((n) => state.purchasedNodes.has(n.id))).toBe(false);

      // Purchase all
      for (const sub of subcats) {
        for (let t = 0; t < 10; t++) {
          purchaseNode(state, web, `gathering_${sub}_t${t}`);
        }
      }

      // Now complete
      expect(nodes.every((n) => state.purchasedNodes.has(n.id))).toBe(true);
    });
  });

  describe('Purchase state management', () => {
    it('should start with all nodes unpurchased', () => {
      const state = createUpgradeWebState(500);
      expect(state.purchasedNodes.size).toBe(0);
      expect(state.purchasedDiamonds.size).toBe(0);
    });

    it('should purchase tier 0 node successfully', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      const result = purchaseNode(state, web, 'gathering_fish_gathering_t0');
      expect(result.success).toBe(true);
      expect(state.purchasedNodes.has('gathering_fish_gathering_t0')).toBe(true);
    });

    it('should deduct clams on purchase', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      const node = web.nodeMap.get('gathering_fish_gathering_t0');
      expect(node).toBeDefined();
      const costBefore = state.clams;
      purchaseNode(state, web, 'gathering_fish_gathering_t0');
      expect(state.clams).toBe(costBefore - (node?.cost ?? 0));
    });

    it('should block purchase without prerequisite', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(5000);
      const result = purchaseNode(state, web, 'gathering_fish_gathering_t1');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Prerequisite');
    });

    it('should block purchase without enough clams', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(0);
      const result = purchaseNode(state, web, 'gathering_fish_gathering_t0');
      expect(result.success).toBe(false);
      expect(result.reason).toContain('Clams');
    });
  });

  describe('Node display state', () => {
    it('should show tier 0 as available', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      const node = requireNode(web, 'gathering_fish_gathering_t0');
      expect(getNodeDisplayState(state, node)).toBe('available');
    });

    it('should show purchased node as purchased', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      purchaseNode(state, web, 'gathering_fish_gathering_t0');
      const node = requireNode(web, 'gathering_fish_gathering_t0');
      expect(getNodeDisplayState(state, node)).toBe('purchased');
    });

    it('should show tier 1 as locked when tier 0 not purchased', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      const node = requireNode(web, 'gathering_fish_gathering_t1');
      expect(getNodeDisplayState(state, node)).toBe('locked');
    });
  });

  describe('stateColor helper', () => {
    it('should return green for purchased', () => {
      expect(stateColor('purchased')).toBe('#5A6B3A');
    });

    it('should return gold for available', () => {
      expect(stateColor('available')).toBe('#C5A059');
    });

    it('should return steel for locked', () => {
      expect(stateColor('locked')).toBe('#6A7A7A');
    });
  });

  describe('Diamond nodes for category', () => {
    it('should find diamonds for gathering', () => {
      const web = generateUpgradeWeb();
      const diamonds = getDiamondsForCategory(web, 'gathering');
      expect(diamonds.length).toBeGreaterThan(0);
    });

    it('should display diamond info with locked state initially', () => {
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(500);
      const diamonds = getDiamondsForCategory(web, 'gathering');
      const info = getDiamondDisplayInfo(state, diamonds[0]);
      expect(info.state).toBe('locked');
      expect(info.prerequisitesMet).toBe(false);
    });
  });

  describe('Signal integration', () => {
    it('upgradesScreenOpen signal toggles correctly', () => {
      const upgradesScreenOpen = signal(false);
      expect(upgradesScreenOpen.value).toBe(false);
      upgradesScreenOpen.value = true;
      expect(upgradesScreenOpen.value).toBe(true);
      upgradesScreenOpen.value = false;
      expect(upgradesScreenOpen.value).toBe(false);
    });

    it('totalClams signal updates on purchase', () => {
      const totalClams = signal(500);
      const web = generateUpgradeWeb();
      const state = createUpgradeWebState(totalClams.value);
      const result = purchaseNode(state, web, 'gathering_fish_gathering_t0');
      if (result.success && result.newClams !== undefined) {
        totalClams.value = result.newClams;
      }
      expect(totalClams.value).toBeLessThan(500);
    });
  });
});
