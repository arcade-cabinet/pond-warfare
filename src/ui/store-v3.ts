/**
 * v3 Store Signals
 *
 * New signals for v3 rearchitecture features: prestige, Pearl upgrades,
 * upgrade web screen, rewards screen, event-driven match flow.
 * Kept separate from store.ts to avoid growing that file beyond 300 LOC.
 */

import { signal } from '@preact/signals';
import type { PrestigeState } from '@/config/prestige-logic';
import type { RewardBreakdown } from '@/game/match-rewards';

// ── Prestige ─────────────────────────────────────────────────────

/** Current prestige rank (persists across sessions via SQLite). */
export const prestigeRank = signal(0);

/** Available Pearls for spending. */
export const totalPearls = signal(0);

/** Total Clams available for upgrade web. */
export const totalClams = signal(0);

/** Current progression level (determines event pool, map size). */
export const progressionLevel = signal(0);

/** Full prestige state for UI components. */
export const prestigeState = signal<PrestigeState>({
  rank: 0,
  pearls: 0,
  totalPearlsEarned: 0,
  upgradeRanks: {},
});

// ── Screen Visibility ────────────────────────────────────────────

/** True when upgrade web screen is open (from main menu). */
export const upgradesScreenOpen = signal(false);

/** True when Pearl upgrade screen is open (from main menu). */
export const pearlScreenOpen = signal(false);

/** True when rank-up modal is showing (from rewards screen). */
export const rankUpModalOpen = signal(false);

/** True when rewards screen is showing (post-match). */
export const rewardsScreenOpen = signal(false);

// ── Rewards Screen ───────────────────────────────────────────────

/** Last match reward breakdown (for display). */
export const lastRewardBreakdown = signal<RewardBreakdown | null>(null);

/** Whether rank-up is available after last match. */
export const canRankUpAfterMatch = signal(false);

// ── Match Events ─────────────────────────────────────────────────

/** Count of events completed in current match (for rewards calc). */
export const matchEventsCompleted = signal(0);

/** Currently active event descriptions (for HUD display). */
export const activeEventDescriptions = signal<string[]>([]);
