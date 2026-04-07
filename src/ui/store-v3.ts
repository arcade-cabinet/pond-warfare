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
import type { FortSlot } from '@/ecs/systems/fortification';
import type { RewardBreakdown } from '@/game/match-rewards';
import type { PlayerProfile } from '@/storage/database';
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

/** Purchased Clam web nodes for the current run. */
export const currentRunPurchasedNodeIds = signal<string[]>([]);

/** Purchased Clam web diamond nodes for the current run. */
export const currentRunPurchasedDiamondIds = signal<string[]>([]);

/** Starting tier rank from Pearl upgrades (0 = none). Used at match init for auto-fill. */
export const startingTierRank = signal(0);

/** Full prestige state for UI components. */
export const prestigeState = signal<PrestigeState>({
  rank: 0,
  pearls: 0,
  totalPearlsEarned: 0,
  upgradeRanks: {},
});

/** Cached player profile for UI (commander unlock checks). */
export const playerProfile = signal<PlayerProfile>({
  total_wins: 0,
  total_losses: 0,
  total_kills: 0,
  total_games: 0,
  total_playtime_seconds: 0,
  highest_difficulty_won: '',
  longest_survival_seconds: 0,
  fastest_win_seconds: 0,
  total_buildings_built: 0,
  hero_units_earned: 0,
  wins_commander_alive: 0,
  total_pearls: 0,
  wins_zero_losses: 0,
  total_xp: 0,
  player_level: 0,
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

/** True when Clam upgrade screen is showing (post-match, after rewards). */
export const clamUpgradeScreenOpen = signal(false);

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

// ── Event Alert (T24 + T27) ────────────────────────────────────

/** Data for the on-screen event alert banner. Null = no alert showing. */
export interface EventAlertData {
  text: string;
  direction: 'north' | 'east' | 'west' | 'south';
  /** Spawn position for zoom-to-action (T27). */
  spawnX: number;
  spawnY: number;
  /** Frame when alert was pushed. */
  frame: number;
}

/** Currently active event alert (auto-cleared after 3 seconds). */
export const eventAlert = signal<EventAlertData | null>(null);

// ── Wave-Survival Mode ──────────────────────────────────────────

/** True when the match uses wave-survival win condition (no enemy nests). */
export const waveSurvivalMode = signal(false);

/** Number of waves to survive for victory. */
export const waveSurvivalTarget = signal(5);

// ── Fortification State ────────────────────────────────────────

/** Current fortification slot state for HUD display. */
export const fortificationSlots = signal<FortSlot[]>([]);
