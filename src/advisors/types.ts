/**
 * Advisor System Types
 *
 * Type definitions for the Civ-style advisor system that replaces
 * the old timed tutorial. Advisors fire tips based on game state
 * pressure, not hardcoded frame counts.
 */

import type { GameWorld } from '@/ecs/world';

export type AdvisorRole = 'economy' | 'war' | 'builder';

export interface AdvisorTip {
  /** Unique identifier for tracking shown/dismissed state. */
  id: string;
  /** Which advisor persona delivers this tip. */
  advisor: AdvisorRole;
  /** Pure predicate: returns true when the tip should fire. */
  condition: (world: GameWorld) => boolean;
  /** Minimum frames between re-showing this tip. */
  cooldown: number;
  /** Higher = more urgent; highest-priority tip displays first. */
  priority: number;
  /** The advice text shown in the toast. */
  message: string;
  /** Optional UI element reference (e.g. 'forces-tab', 'build-armory'). */
  action?: string;
  /** When true, show at most once per game session. */
  oncePerGame?: boolean;
}

export interface AdvisorState {
  /** Per-advisor enable/disable (toggled in settings). */
  enabled: Record<AdvisorRole, boolean>;
  /** tipId -> frame number when last shown. */
  shownTips: Map<string, number>;
  /** Tips the player permanently dismissed via the [!] button. */
  dismissedTips: Set<string>;
  /** The tip currently displayed in the toast (null if none). */
  currentTip: AdvisorTip | null;
  /** Pending tips sorted by priority, waiting to display. */
  tipQueue: AdvisorTip[];
}

export function createAdvisorState(): AdvisorState {
  return {
    enabled: { economy: true, war: true, builder: true },
    shownTips: new Map(),
    dismissedTips: new Set(),
    currentTip: null,
    tipQueue: [],
  };
}
