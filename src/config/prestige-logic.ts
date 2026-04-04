/**
 * Prestige Auto-Deploy Logic
 *
 * Reads from configs/prestige.json to calculate Pearl rewards,
 * determine auto-deploy unit counts per rank, and resolve
 * which auto-behaviors are unlocked at the current prestige state.
 *
 * Display helpers live in prestige-display.ts (extracted for 300 LOC limit).
 */

import {
  calculatePearlReward,
  getAllPearlUpgradeEntries,
  getPearlUpgrade,
  getPrestigeConfig,
  getPrestigeThreshold,
} from './config-loader';
import type { AutoBehaviorEffect, AutoDeployEffect, MultiplierEffect } from './v3-types';

// Re-export display helpers so existing imports still work
export { getPearlUpgradeDisplayList, type PearlUpgradeDisplay } from './prestige-display';

// ── Player Prestige State ─────────────────────────────────────────

/** Player's current prestige progress (stored in SQLite between sessions). */
export interface PrestigeState {
  rank: number;
  pearls: number;
  totalPearlsEarned: number;
  upgradeRanks: Record<string, number>;
}

/** Create a fresh prestige state (new player). */
export function createPrestigeState(): PrestigeState {
  return { rank: 0, pearls: 0, totalPearlsEarned: 0, upgradeRanks: {} };
}

// ── Pearl Calculations ────────────────────────────────────────────

export function pearlsForPrestige(progressionLevel: number, currentRank: number): number {
  return calculatePearlReward(progressionLevel, currentRank);
}

export function canPrestige(progressionLevel: number, currentRank: number): boolean {
  return progressionLevel >= getPrestigeThreshold(currentRank);
}

export function nextPrestigeThreshold(currentRank: number): number {
  return getPrestigeThreshold(currentRank);
}

// ── Auto-Deploy Calculations ──────────────────────────────────────

export interface AutoDeploySpec {
  unitId: string;
  count: number;
  upgradeId: string;
}

export function getAutoDeployUnits(state: PrestigeState): AutoDeploySpec[] {
  const result: AutoDeploySpec[] = [];
  for (const { id, def } of getAllPearlUpgradeEntries()) {
    if (def.effect.type !== 'auto_deploy') continue;
    const effect = def.effect as AutoDeployEffect;
    const rank = state.upgradeRanks[id] ?? 0;
    if (rank <= 0) continue;
    result.push({ unitId: effect.unit, count: effect.count_per_rank * rank, upgradeId: id });
  }
  return result;
}

export function getAutoDeployCount(state: PrestigeState, unitId: string): number {
  const match = getAutoDeployUnits(state).find((d) => d.unitId === unitId);
  return match?.count ?? 0;
}

// ── Auto-Behavior Unlocks ─────────────────────────────────────────

export interface AutoBehaviorUnlock {
  behavior: string;
  upgradeId: string;
}

export function getUnlockedAutoBehaviors(state: PrestigeState): AutoBehaviorUnlock[] {
  const result: AutoBehaviorUnlock[] = [];
  for (const { id, def } of getAllPearlUpgradeEntries()) {
    if (def.effect.type !== 'auto_behavior') continue;
    const effect = def.effect as AutoBehaviorEffect;
    const rank = state.upgradeRanks[id] ?? 0;
    if (rank <= 0) continue;
    result.push({ behavior: effect.behavior, upgradeId: id });
  }
  return result;
}

export function isAutoBehaviorUnlocked(state: PrestigeState, behavior: string): boolean {
  return getUnlockedAutoBehaviors(state).some((u) => u.behavior === behavior);
}

// ── Multiplier Calculations ───────────────────────────────────────

export interface StatMultiplier {
  stat: string;
  value: number;
  upgradeId: string;
}

export function getStatMultipliers(state: PrestigeState): StatMultiplier[] {
  const result: StatMultiplier[] = [];
  for (const { id, def } of getAllPearlUpgradeEntries()) {
    if (def.effect.type !== 'multiplier') continue;
    const effect = def.effect as MultiplierEffect;
    const rank = state.upgradeRanks[id] ?? 0;
    if (rank <= 0) continue;
    result.push({ stat: effect.stat, value: 1.0 + effect.value_per_rank * rank, upgradeId: id });
  }
  return result;
}

export function getStatMultiplier(state: PrestigeState, stat: string): number {
  const match = getStatMultipliers(state).find((m) => m.stat === stat);
  return match?.value ?? 1.0;
}

// ── Upgrade Purchase Logic ────────────────────────────────────────

export interface PurchaseResult {
  success: boolean;
  reason?: string;
  newPearls?: number;
  newRank?: number;
}

export function purchasePearlUpgrade(
  state: PrestigeState,
  upgradeId: string,
): { state: PrestigeState; result: PurchaseResult } {
  const def = getPearlUpgrade(upgradeId);
  const currentRank = state.upgradeRanks[upgradeId] ?? 0;

  if (currentRank >= def.max_rank) {
    return { state, result: { success: false, reason: 'Already at max rank' } };
  }
  if (state.pearls < def.cost_per_rank) {
    return {
      state,
      result: { success: false, reason: `Need ${def.cost_per_rank} Pearls (have ${state.pearls})` },
    };
  }

  const newState: PrestigeState = {
    ...state,
    pearls: state.pearls - def.cost_per_rank,
    upgradeRanks: { ...state.upgradeRanks, [upgradeId]: currentRank + 1 },
  };
  return {
    state: newState,
    result: { success: true, newPearls: newState.pearls, newRank: currentRank + 1 },
  };
}

// ── Prestige Execution ────────────────────────────────────────────

export interface PrestigeResult {
  newRank: number;
  pearlsEarned: number;
  newPearlBalance: number;
  resets: string[];
  persists: string[];
}

export function executePrestige(
  state: PrestigeState,
  progressionLevel: number,
): { state: PrestigeState; result: PrestigeResult } {
  const config = getPrestigeConfig();
  const pearlsEarned = pearlsForPrestige(progressionLevel, state.rank);
  const newRank = state.rank + 1;

  const newState: PrestigeState = {
    rank: newRank,
    pearls: state.pearls + pearlsEarned,
    totalPearlsEarned: state.totalPearlsEarned + pearlsEarned,
    upgradeRanks: { ...state.upgradeRanks },
  };

  return {
    state: newState,
    result: {
      newRank,
      pearlsEarned,
      newPearlBalance: newState.pearls,
      resets: config.resets_on_prestige,
      persists: config.persists_on_prestige,
    },
  };
}
