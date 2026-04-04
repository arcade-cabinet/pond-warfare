/**
 * v3 Store Signals
 *
 * New signals for v3 rearchitecture features: prestige, Pearl upgrades,
 * upgrade web screen, rewards screen, event-driven match flow, Lodge HP,
 * wave indicator, wave-survival mode.
 * Kept separate from store.ts to avoid growing that file beyond 300 LOC.
 */

import { computed, signal } from '@preact/signals';
import type { PrestigeState } from '@/config/prestige-logic';
import type { RewardBreakdown } from '@/game/match-rewards';
import { COLORS } from './design-tokens';

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

// ── Lodge HP (v3 Gap 5) ─────────────────────────────────────────

/** Current Lodge HP. Updated from game-ui-sync each frame. */
export const lodgeHp = signal(0);

/** Max Lodge HP. */
export const lodgeMaxHp = signal(0);

/** Lodge HP as a 0-1 fraction. */
export const lodgeHpPercent = computed(() =>
  lodgeMaxHp.value > 0 ? lodgeHp.value / lodgeMaxHp.value : 1,
);

/** Lodge HP bar color based on percentage. */
export const lodgeHpColor = computed(() => {
  const pct = lodgeHpPercent.value;
  if (pct > 0.6) return COLORS.feedbackSuccess;
  if (pct > 0.3) return COLORS.feedbackWarn;
  return '#ef4444';
});

// ── Wave Indicator (v3 Gap 6) ───────────────────────────────────

/** Current wave number from match-event-runner. */
export const currentWaveNumber = signal(0);

/** Direction of the last wave spawn (for HUD indicator). */
export const waveDirection = signal<'north' | 'east' | 'west' | 'south'>('north');

// ── Wave-Survival Mode ──────────────────────────────────────────

/** True when the match uses wave-survival win condition (no enemy nests). */
export const waveSurvivalMode = signal(false);

/** Number of waves to survive for victory. */
export const waveSurvivalTarget = signal(5);
