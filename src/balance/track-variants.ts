import { getAllPearlUpgradeEntries, getUpgradeCategories } from '@/config/config-loader';
import { createPrestigeState, type PrestigeState } from '@/config/prestige-logic';
import type { MultiplierEffect } from '@/config/v3-types';

export interface BalanceVariantConfig {
  kind: 'clam' | 'pearl';
  id: string;
  label: string;
  cost: number;
  budgetPct?: number | null;
  purchasedNodeIds?: string[];
  prestigeState?: PrestigeState;
  startingTierRank?: number;
}

export function buildClamTierOneVariants(): BalanceVariantConfig[] {
  const categories = getUpgradeCategories();
  const variants: BalanceVariantConfig[] = [];

  for (const [categoryId, category] of Object.entries(categories)) {
    for (const [subcategoryId, subcategory] of Object.entries(category.subcategories)) {
      variants.push({
        kind: 'clam',
        id: `${categoryId}_${subcategoryId}_t0`,
        label: `${category.label} / ${subcategory.label} T1`,
        cost: subcategory.base_cost,
        budgetPct: Number((subcategory.base_effect * 100).toFixed(2)),
        purchasedNodeIds: [`${categoryId}_${subcategoryId}_t0`],
      });
    }
  }

  return variants;
}

export function buildPearlRankOneVariants(): BalanceVariantConfig[] {
  return getAllPearlUpgradeEntries().map(({ id, def }) => {
    const prestigeState: PrestigeState = {
      ...createPrestigeState(),
      rank: 1,
      upgradeRanks: { [id]: 1 },
      totalPearlsEarned: getPearlVariantCost(def),
    };

    return {
      kind: 'pearl',
      id,
      label: def.label,
      cost: getPearlVariantCost(def),
      budgetPct: getPearlBudgetPct(def.effect),
      prestigeState,
      startingTierRank: id === 'starting_tier' ? 1 : 0,
    };
  });
}

function getPearlVariantCost(def: { cost_per_rank: number; cost_schedule?: number[] }): number {
  return def.cost_schedule?.[0] ?? def.cost_per_rank;
}

function getPearlBudgetPct(effect: { type: string }): number | null {
  if (effect.type !== 'multiplier') return null;
  return Number((((effect as MultiplierEffect).value_per_rank ?? 0) * 100).toFixed(2));
}
