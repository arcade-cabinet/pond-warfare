/**
 * Upgrade Web Catalog Generator Tests
 *
 * Validates procedural generation from configs/upgrades.json:
 * - Correct total node count (240+ linear + diamond)
 * - Cost formula: base_cost * 2^tier
 * - Effect formula: base_effect * (tier + 1)
 * - Procedural name generation: "{prefix} {subcategory_label}"
 * - Diamond node prerequisite resolution
 * - Diamond node unlock conditions
 */

import { describe, expect, it } from 'vitest';
import {
  generateUpgradeCatalog,
  getDiamondNodes,
  getTiersPerSubcategory,
  getUpgradeCategories,
} from '@/config/config-loader';
import {
  computeUpgradeCost,
  computeUpgradeEffect,
  generateUpgradeWeb,
  getDiamondsForCategory,
  getNodesForCategory,
  getNodesForPath,
  getWebSummary,
  isDiamondNodeUnlocked,
  type UpgradeWeb,
} from '@/config/upgrade-web';

describe('Upgrade catalog generation', () => {
  it('should produce correct node count from formulas', () => {
    const catalog = generateUpgradeCatalog();
    const categories = getUpgradeCategories();
    const tiersPerSub = getTiersPerSubcategory();

    let expectedCount = 0;
    for (const cat of Object.values(categories)) {
      expectedCount += Object.keys(cat.subcategories).length * tiersPerSub;
    }

    expect(catalog.length).toBe(expectedCount);
    // 6 categories * 4 subcategories * 10 tiers = 240
    expect(catalog.length).toBe(240);
  });

  it('should generate correct cost formula: base_cost * 2^tier', () => {
    const catalog = generateUpgradeCatalog();
    // fish_gathering: base_cost = 10
    const fishNodes = catalog.filter((n) => n.subcategory === 'fish_gathering');
    expect(fishNodes.length).toBe(10);

    expect(fishNodes[0].cost).toBe(10); // 10 * 2^0 = 10
    expect(fishNodes[1].cost).toBe(20); // 10 * 2^1 = 20
    expect(fishNodes[2].cost).toBe(40); // 10 * 2^2 = 40
    expect(fishNodes[3].cost).toBe(80); // 10 * 2^3 = 80
    expect(fishNodes[9].cost).toBe(Math.round(10 * 2 ** 9)); // 5120
  });

  it('should generate correct effect formula: base_effect * (tier + 1)', () => {
    const catalog = generateUpgradeCatalog();
    // fish_gathering: base_effect = 0.10
    const fishNodes = catalog.filter((n) => n.subcategory === 'fish_gathering');

    expect(fishNodes[0].effect).toBeCloseTo(0.1); // 0.10 * 1
    expect(fishNodes[1].effect).toBeCloseTo(0.2); // 0.10 * 2
    expect(fishNodes[4].effect).toBeCloseTo(0.5); // 0.10 * 5
    expect(fishNodes[9].effect).toBeCloseTo(1.0); // 0.10 * 10
  });

  it('should generate procedural names: "{prefix} {subcategory_label}"', () => {
    const catalog = generateUpgradeCatalog();
    const fishNodes = catalog.filter((n) => n.subcategory === 'fish_gathering');

    expect(fishNodes[0].name).toBe('Basic Fish Gathering');
    expect(fishNodes[1].name).toBe('Enhanced Fish Gathering');
    expect(fishNodes[2].name).toBe('Super Fish Gathering');
    expect(fishNodes[9].name).toBe('Transcendent Fish Gathering');
  });

  it('should produce non-negative costs at all tiers', () => {
    const catalog = generateUpgradeCatalog();
    for (const node of catalog) {
      expect(node.cost, `${node.id} cost`).toBeGreaterThan(0);
    }
  });

  it('should have unique IDs for all nodes', () => {
    const catalog = generateUpgradeCatalog();
    const ids = catalog.map((n) => n.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('Upgrade web generation', () => {
  let web: UpgradeWeb;

  it('should generate a complete web', () => {
    web = generateUpgradeWeb();
    expect(web.nodes.length).toBe(240);
    expect(web.diamondNodes.length).toBeGreaterThan(0);
    expect(web.totalCount).toBe(web.nodes.length + web.diamondNodes.length);
  });

  it('should have prerequisite chains within subcategory paths', () => {
    web = generateUpgradeWeb();
    const fishNodes = getNodesForPath(web, 'gathering', 'fish_gathering');

    // First tier has no prerequisite
    expect(fishNodes[0].prerequisite).toBeNull();

    // Each subsequent tier depends on the previous
    for (let i = 1; i < fishNodes.length; i++) {
      expect(fishNodes[i].prerequisite).toBe(fishNodes[i - 1].id);
    }
  });

  it('should provide node lookup by ID', () => {
    web = generateUpgradeWeb();
    const node = web.nodeMap.get('gathering_fish_gathering_t0');
    expect(node).toBeDefined();
    expect(node?.name).toBe('Basic Fish Gathering');
    expect(node?.tier).toBe(0);
  });

  it('should provide diamond node lookup by ID', () => {
    web = generateUpgradeWeb();
    const diamond = web.diamondMap.get('dock_wing');
    expect(diamond).toBeDefined();
    expect(diamond?.label).toBe('Dock Wing');
    expect(diamond?.effect.type).toBe('lodge_wing');
  });

  it('should compute diamond prerequisite node IDs', () => {
    web = generateUpgradeWeb();
    const dockWing = web.diamondMap.get('dock_wing');
    expect(dockWing).toBeDefined();
    // Requires gathering.fish_gathering tier 5 -> t4 must be purchased
    expect(dockWing?.prerequisiteNodeIds).toContain('gathering_fish_gathering_t4');
  });

  it('should compute multi-path diamond prerequisites', () => {
    web = generateUpgradeWeb();
    const guard = web.diamondMap.get('guard_specialist');
    expect(guard).toBeDefined();
    // Requires defense.lodge_hp: 5 AND defense.wall_hp: 5
    expect(guard?.prerequisiteNodeIds).toContain('defense_lodge_hp_t4');
    expect(guard?.prerequisiteNodeIds).toContain('defense_wall_hp_t4');
    expect(guard?.prerequisiteNodeIds.length).toBe(2);
  });
});

describe('Upgrade web queries', () => {
  const web = generateUpgradeWeb();

  it('should filter nodes by category', () => {
    const gatheringNodes = getNodesForCategory(web, 'gathering');
    // 4 subcategories * 10 tiers = 40
    expect(gatheringNodes.length).toBe(40);
    for (const node of gatheringNodes) {
      expect(node.category).toBe('gathering');
    }
  });

  it('should filter nodes by subcategory path', () => {
    const fishPath = getNodesForPath(web, 'gathering', 'fish_gathering');
    expect(fishPath.length).toBe(10);
    // Should be sorted by tier
    for (let i = 0; i < fishPath.length; i++) {
      expect(fishPath[i].tier).toBe(i);
    }
  });

  it('should find diamond nodes for a category', () => {
    const gatheringDiamonds = getDiamondsForCategory(web, 'gathering');
    const ids = gatheringDiamonds.map((d) => d.id);
    expect(ids).toContain('dock_wing');
    expect(ids).toContain('fisher_specialist');
  });

  it('should produce correct web summary', () => {
    const summary = getWebSummary(web);
    expect(summary.categories).toBe(6);
    expect(summary.subcategories).toBe(24);
    expect(summary.tiersPerSub).toBe(10);
    expect(summary.linearNodes).toBe(240);
    expect(summary.diamondNodes).toBeGreaterThan(10);
    expect(summary.totalNodes).toBe(summary.linearNodes + summary.diamondNodes);
  });
});

describe('Diamond node unlock logic', () => {
  it('should be locked when no tiers are purchased', () => {
    const requires = { gathering: { fish_gathering: 5 } };
    const purchased = new Map<string, number>();
    expect(isDiamondNodeUnlocked(requires, purchased)).toBe(false);
  });

  it('should be locked when tier is below requirement', () => {
    const requires = { gathering: { fish_gathering: 5 } };
    const purchased = new Map<string, number>([['gathering_fish_gathering', 4]]);
    expect(isDiamondNodeUnlocked(requires, purchased)).toBe(false);
  });

  it('should be unlocked when tier meets requirement', () => {
    const requires = { gathering: { fish_gathering: 5 } };
    const purchased = new Map<string, number>([['gathering_fish_gathering', 5]]);
    expect(isDiamondNodeUnlocked(requires, purchased)).toBe(true);
  });

  it('should be unlocked when tier exceeds requirement', () => {
    const requires = { gathering: { fish_gathering: 5 } };
    const purchased = new Map<string, number>([['gathering_fish_gathering', 9]]);
    expect(isDiamondNodeUnlocked(requires, purchased)).toBe(true);
  });

  it('should require ALL paths for multi-path diamonds', () => {
    const requires = { defense: { lodge_hp: 5, wall_hp: 5 } };

    // Only one met
    const partialPurchase = new Map<string, number>([['defense_lodge_hp', 5]]);
    expect(isDiamondNodeUnlocked(requires, partialPurchase)).toBe(false);

    // Both met
    const fullPurchase = new Map<string, number>([
      ['defense_lodge_hp', 5],
      ['defense_wall_hp', 5],
    ]);
    expect(isDiamondNodeUnlocked(requires, fullPurchase)).toBe(true);
  });

  it('should require ALL categories for cross-category diamonds', () => {
    const requires = {
      combat: { attack_speed: 5 },
      utility: { unit_speed: 5 },
    };

    const partial = new Map<string, number>([['combat_attack_speed', 5]]);
    expect(isDiamondNodeUnlocked(requires, partial)).toBe(false);

    const full = new Map<string, number>([
      ['combat_attack_speed', 5],
      ['utility_unit_speed', 5],
    ]);
    expect(isDiamondNodeUnlocked(requires, full)).toBe(true);
  });
});

describe('Cost and effect formulas', () => {
  it('computeUpgradeCost follows base_cost * 2^tier', () => {
    expect(computeUpgradeCost(10, 0)).toBe(10);
    expect(computeUpgradeCost(10, 1)).toBe(20);
    expect(computeUpgradeCost(10, 2)).toBe(40);
    expect(computeUpgradeCost(10, 9)).toBe(5120);
    expect(computeUpgradeCost(15, 5)).toBe(480);
  });

  it('computeUpgradeEffect follows base_effect * (tier + 1)', () => {
    expect(computeUpgradeEffect(0.05, 0)).toBeCloseTo(0.05);
    expect(computeUpgradeEffect(0.05, 1)).toBeCloseTo(0.1);
    expect(computeUpgradeEffect(0.05, 9)).toBeCloseTo(0.5);
    expect(computeUpgradeEffect(0.1, 5)).toBeCloseTo(0.6);
  });
});

describe('Diamond node config completeness', () => {
  it('should have lodge wing diamonds', () => {
    const diamonds = getDiamondNodes();
    expect(diamonds.dock_wing).toBeDefined();
    expect(diamonds.barracks_wing).toBeDefined();
    expect(diamonds.watchtower_wing).toBeDefined();
    expect(diamonds.healing_pool_wing).toBeDefined();
  });

  it('should have specialist unlock diamonds', () => {
    const diamonds = getDiamondNodes();
    const specialistDiamonds = Object.entries(diamonds).filter(
      ([, d]) => d.effect.type === 'unlock_specialist',
    );
    expect(specialistDiamonds.length).toBe(8);
  });

  it('should have auto-behavior diamonds', () => {
    const diamonds = getDiamondNodes();
    expect(diamonds.auto_battlements).toBeDefined();
    expect(diamonds.auto_siege).toBeDefined();
  });

  it('all diamond node prerequisites reference valid categories', () => {
    const diamonds = getDiamondNodes();
    const categories = getUpgradeCategories();
    const validCategories = Object.keys(categories);

    for (const [id, diamond] of Object.entries(diamonds)) {
      for (const category of Object.keys(diamond.requires)) {
        expect(validCategories, `${id} requires invalid category "${category}"`).toContain(
          category,
        );
        const validSubs = Object.keys(categories[category].subcategories);
        for (const sub of Object.keys(diamond.requires[category])) {
          expect(validSubs, `${id} requires invalid subcategory "${sub}"`).toContain(sub);
        }
      }
    }
  });
});
