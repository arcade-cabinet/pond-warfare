/**
 * Tech Tree — Shared helpers
 *
 * Pure functions for computing node state and visual styles.
 * Used by both the desktop graph view and the mobile card view.
 */

import type { TechId, TechState } from '@/config/tech-tree';
import { canResearch, TECH_UPGRADES } from '@/config/tech-tree';

// -------------------------------------------------------------------
// Node state
// -------------------------------------------------------------------

export type NodeState = 'researched' | 'available' | 'unaffordable' | 'locked';

export function getNodeState(
  id: TechId,
  techState: TechState,
  clams: number,
  twigs: number,
  researchDiscount = 0,
): NodeState {
  const upgrade = TECH_UPGRADES[id];
  if (!upgrade) return 'locked';
  if (techState[id]) return 'researched';
  if (!canResearch(id, techState)) return 'locked';
  const mult = 1 - researchDiscount;
  if (clams >= Math.round(upgrade.clamCost * mult) && twigs >= Math.round(upgrade.twigCost * mult))
    return 'available';
  return 'unaffordable';
}

// -------------------------------------------------------------------
// Visual styles per state
// -------------------------------------------------------------------

export interface StateStyle {
  border: string;
  background: string;
  color: string;
  extra: string;
}

export function stateStyles(state: NodeState): StateStyle {
  switch (state) {
    case 'researched':
      return {
        border: 'var(--pw-success)',
        background: 'rgba(64, 184, 104, 0.15)',
        color: 'var(--pw-text-primary)',
        extra: '',
      };
    case 'available':
      return {
        border: 'var(--pw-warning)',
        background: 'var(--pw-bg-elevated)',
        color: 'var(--pw-otter-light)',
        extra: 'cursor-pointer animate-pulse-subtle',
      };
    case 'unaffordable':
      return {
        border: 'rgba(232, 160, 48, 0.4)',
        background: 'rgba(26, 53, 64, 0.8)',
        color: 'var(--pw-text-secondary)',
        extra: 'cursor-not-allowed',
      };
    case 'locked':
      return {
        border: 'var(--pw-border)',
        background: 'rgba(19, 40, 48, 0.6)',
        color: 'var(--pw-text-muted)',
        extra: 'cursor-not-allowed opacity-60',
      };
  }
}
