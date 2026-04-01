/**
 * Advisor Persona Config
 *
 * Visual identity for each advisor role. Used by the toast UI
 * component for border color, icon circle, and display name.
 */

import type { AdvisorRole } from '@/advisors/types';

export interface AdvisorPersona {
  role: AdvisorRole;
  name: string;
  /** CSS color for the toast border and icon background. */
  color: string;
  /** Single character shown in the icon circle (MVP). */
  initial: string;
}

export const ADVISOR_PERSONAS: Record<AdvisorRole, AdvisorPersona> = {
  economy: { role: 'economy', name: 'Elder Whiskers', color: '#fbbf24', initial: 'E' },
  war: { role: 'war', name: 'Captain Claw', color: '#ef4444', initial: 'W' },
  builder: { role: 'builder', name: 'Architect Pebble', color: '#60a5fa', initial: 'B' },
};

/** Evaluation interval in frames (~1 second at 60fps). */
export const ADVISOR_EVAL_INTERVAL = 60;

/** Auto-dismiss timeout in frames (15 seconds at 60fps). */
export const ADVISOR_TOAST_DURATION = 900;
