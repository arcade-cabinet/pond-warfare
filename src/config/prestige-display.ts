/**
 * Prestige Display Helpers
 *
 * UI formatting and display logic for the Pearl upgrade screen.
 * Extracted from prestige-logic.ts to keep files under 300 LOC.
 */

import { getAllPearlUpgradeEntries } from './config-loader';
import type { PrestigeState } from './prestige-logic';
import type { PearlUpgradeDef } from './v3-types';

/** Summary of a Pearl upgrade for UI display. */
export interface PearlUpgradeDisplay {
  id: string;
  label: string;
  description: string;
  currentRank: number;
  maxRank: number;
  costPerRank: number;
  canAfford: boolean;
  isMaxed: boolean;
  effectSummary: string;
}

/**
 * Get all Pearl upgrades formatted for display.
 */
export function getPearlUpgradeDisplayList(state: PrestigeState): PearlUpgradeDisplay[] {
  const entries = getAllPearlUpgradeEntries();

  return entries.map(({ id, def }) => {
    const currentRank = state.upgradeRanks[id] ?? 0;
    const isMaxed = currentRank >= def.max_rank;

    return {
      id,
      label: def.label,
      description: def.description,
      currentRank,
      maxRank: def.max_rank,
      costPerRank: def.cost_per_rank,
      canAfford: !isMaxed && state.pearls >= def.cost_per_rank,
      isMaxed,
      effectSummary: formatEffectSummary(def, currentRank),
    };
  });
}

function formatEffectSummary(def: PearlUpgradeDef, rank: number): string {
  const effect = def.effect;
  switch (effect.type) {
    case 'auto_deploy':
      return `${effect.count_per_rank * rank}x ${effect.unit}`;
    case 'multiplier':
      return `+${Math.round(effect.value_per_rank * rank * 100)}% ${effect.stat}`;
    case 'auto_behavior':
      return rank > 0 ? `${effect.behavior} active` : 'Locked';
    default:
      return '';
  }
}
