/**
 * Prestige Pearl Logic
 *
 * Reads from configs/prestige.json to calculate Pearl rewards,
 * determine specialist blueprint caps per rank, and resolve
 * which permanent auto-behaviors are unlocked at the current prestige state.
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
import type {
  AutoBehaviorEffect,
  MultiplierEffect,
  PearlUpgradeDef,
  SpecialistBlueprintEffect,
} from './v3-types';

// Re-export display helpers so existing imports still work
export { getPearlUpgradeDisplayList, type PearlUpgradeDisplay } from './prestige-display';

/** Get the Pearl cost for purchasing a specific rank of an upgrade. */
export function getCostForRank(def: PearlUpgradeDef, currentRank: number): number {
  if (def.cost_schedule && currentRank < def.cost_schedule.length) {
    return def.cost_schedule[currentRank];
  }
  return def.cost_per_rank;
}

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

// ── Specialist Blueprint Cap Calculations ────────────────────────

export interface SpecialistBlueprintSpec {
  unitId: string;
  cap: number;
  upgradeId: string;
}

export function getSpecialistBlueprints(state: PrestigeState): SpecialistBlueprintSpec[] {
  const result: SpecialistBlueprintSpec[] = [];
  for (const { id, def } of getAllPearlUpgradeEntries()) {
    if (def.effect.type !== 'specialist_blueprint') continue;
    const effect = def.effect as SpecialistBlueprintEffect;
    const rank = state.upgradeRanks[id] ?? 0;
    if (rank <= 0) continue;
    result.push({ unitId: effect.unit, cap: effect.cap_per_rank * rank, upgradeId: id });
  }
  return result;
}

export function getSpecialistBlueprintCap(state: PrestigeState, unitId: string): number {
  const match = getSpecialistBlueprints(state).find((d) => d.unitId === unitId);
  return match?.cap ?? 0;
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
  const cost = getCostForRank(def, currentRank);

  if (currentRank >= def.max_rank) {
    return { state, result: { success: false, reason: 'Already at max rank' } };
  }
  if (state.pearls < cost) {
    return {
      state,
      result: { success: false, reason: `Need ${cost} Pearls (have ${state.pearls})` },
    };
  }

  const newState: PrestigeState = {
    ...state,
    pearls: state.pearls - cost,
    upgradeRanks: { ...state.upgradeRanks, [upgradeId]: currentRank + 1 },
  };
  return {
    state: newState,
    result: { success: true, newPearls: newState.pearls, newRank: currentRank + 1 },
  };
}

// ── Starting Tier ────────────────────────────────────────────────

/** Get the current starting tier rank (0 = Basic/none, 1 = Enhanced, ..., 8 = Mythic). */
export function getStartingTierRank(state: PrestigeState): number {
  return state.upgradeRanks.starting_tier ?? 0;
}

/** Starting tier names indexed by rank (0-8). */
export const STARTING_TIER_NAMES = [
  'Basic',
  'Enhanced',
  'Super',
  'Mega',
  'Ultra',
  'Seismic',
  'Colossal',
  'Legendary',
  'Mythic',
] as const;

/** Get the display name for a starting tier rank. */
export function getStartingTierName(rank: number): string {
  return STARTING_TIER_NAMES[rank] ?? 'Basic';
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
