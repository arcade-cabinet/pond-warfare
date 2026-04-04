/**
 * Match Rewards Calculator (v3.0 — US13)
 *
 * Computes post-match Clam rewards from configs/rewards.json.
 * Formula: base_clams + (kills * kill_bonus) + (events * event_bonus)
 *          + (duration_minutes * survival_bonus) * (1 + rank * prestige_multiplier)
 *
 * Display logic is separate (rewards-screen.tsx).
 */

import { getRewardFormula } from '@/config/config-loader';

// ── Types ─────────────────────────────────────────────────────────

/** Raw match stats needed for reward calculation. */
export interface MatchStats {
  /** Win or loss. */
  result: 'win' | 'loss';
  /** Match duration in seconds. */
  durationSeconds: number;
  /** Total enemy kills. */
  kills: number;
  /** Total resources gathered (any type). */
  resourcesGathered: number;
  /** Number of events completed (boss kills, escorts, etc.). */
  eventsCompleted: number;
  /** Current prestige rank. */
  prestigeRank: number;
}

/** Detailed breakdown of how Clams were calculated. */
export interface RewardBreakdown {
  /** Base Clam reward (always earned). */
  base: number;
  /** Bonus from kills. */
  killBonus: number;
  /** Bonus from events completed. */
  eventBonus: number;
  /** Bonus from survival time. */
  survivalBonus: number;
  /** Subtotal before prestige multiplier. */
  subtotal: number;
  /** Prestige multiplier applied (1.0 = no bonus). */
  prestigeMultiplier: number;
  /** Final Clam reward after multiplier. */
  totalClams: number;
  /** Whether this is a win (losers get reduced rewards). */
  isWin: boolean;
  /** Match duration formatted for display. */
  durationDisplay: string;
}

/** Threshold info for "RANK UP" button display. */
export interface RankUpInfo {
  /** Whether the player can prestige. */
  canRankUp: boolean;
  /** Current progression level. */
  progressionLevel: number;
  /** Threshold needed for rank up. */
  threshold: number;
  /** Progress fraction (0 to 1+). */
  progress: number;
}

// ── Constants ────────────────────────────────────────────────────

/** Losers receive this fraction of the total reward. */
const LOSS_MULTIPLIER = 0.5;

// ── Core Logic ────────────────────────────────────────────────────

/**
 * Calculate the full Clam reward for a match.
 */
export function calculateMatchReward(stats: MatchStats): RewardBreakdown {
  const config = getRewardFormula();

  const base = config.base_clams;
  const killBonus = stats.kills * config.kill_bonus;
  const eventBonus = stats.eventsCompleted * config.event_bonus;
  const durationMinutes = stats.durationSeconds / 60;
  const survivalBonus = Math.floor(durationMinutes * config.survival_bonus_per_minute);

  const subtotal = base + killBonus + eventBonus + survivalBonus;

  const prestigeMultiplier = 1 + stats.prestigeRank * config.prestige_multiplier_per_rank;

  let totalClams = Math.floor(subtotal * prestigeMultiplier);

  // Losers get reduced rewards
  const isWin = stats.result === 'win';
  if (!isWin) {
    totalClams = Math.floor(totalClams * LOSS_MULTIPLIER);
  }

  return {
    base,
    killBonus,
    eventBonus,
    survivalBonus,
    subtotal,
    prestigeMultiplier,
    totalClams,
    isWin,
    durationDisplay: formatDuration(stats.durationSeconds),
  };
}

/**
 * Generate the stat lines for the rewards screen display.
 */
export function generateRewardStatLines(stats: MatchStats, breakdown: RewardBreakdown): string[] {
  const lines: string[] = [];

  lines.push(`Duration: ${breakdown.durationDisplay}`);
  lines.push(`Kills: ${stats.kills}`);
  lines.push(`Resources Gathered: ${stats.resourcesGathered}`);
  lines.push(`Events Completed: ${stats.eventsCompleted}`);
  lines.push('---');
  lines.push(`Base Clams: ${breakdown.base}`);

  if (breakdown.killBonus > 0) {
    lines.push(`Kill Bonus: +${breakdown.killBonus}`);
  }
  if (breakdown.eventBonus > 0) {
    lines.push(`Event Bonus: +${breakdown.eventBonus}`);
  }
  if (breakdown.survivalBonus > 0) {
    lines.push(`Survival Bonus: +${breakdown.survivalBonus}`);
  }

  if (breakdown.prestigeMultiplier > 1) {
    lines.push(`Prestige x${breakdown.prestigeMultiplier.toFixed(1)}`);
  }

  if (!breakdown.isWin) {
    lines.push('Loss Penalty: x0.5');
  }

  lines.push('---');
  lines.push(`Total Clams Earned: ${breakdown.totalClams}`);

  return lines;
}

/**
 * Check if the "RANK UP" button should pulse on the rewards screen.
 */
export function checkRankUpAvailable(
  progressionLevel: number,
  _currentRank: number,
  threshold: number,
): RankUpInfo {
  const canRankUp = progressionLevel >= threshold;
  const progress = threshold > 0 ? progressionLevel / threshold : 0;

  return {
    canRankUp,
    progressionLevel,
    threshold,
    progress,
  };
}

// ── Display Helpers ──────────────────────────────────────────────

/**
 * Format duration in seconds to "Xm Ys" display.
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  return `${minutes}m ${secs}s`;
}

/**
 * Get the result title text for the rewards screen.
 */
export function getResultTitle(result: 'win' | 'loss'): {
  title: string;
  subtitle: string;
  color: string;
} {
  if (result === 'win') {
    return {
      title: 'VICTORY',
      subtitle: 'The Lodge stands strong!',
      color: '#fbbf24',
    };
  }
  return {
    title: 'DEFEAT',
    subtitle: 'The Lodge has fallen.',
    color: '#ef4444',
  };
}
