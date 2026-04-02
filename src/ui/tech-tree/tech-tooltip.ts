/**
 * Tech Tooltip — Builds TooltipData for tech tree nodes.
 *
 * Shared between TechCard (mobile) and TechNode (desktop).
 */

import { TECH_UPGRADES, type TechUpgrade } from '@/config/tech-tree';
import type { TooltipData } from '@/types';
import type { NodeState } from './tree-helpers';

const STATE_LABELS: Record<NodeState, { text: string; color: string }> = {
  researched: { text: 'Researched', color: 'var(--pw-success)' },
  available: { text: 'Available', color: 'var(--pw-warning)' },
  unaffordable: { text: 'Cannot Afford', color: 'var(--pw-enemy-light)' },
  locked: { text: 'Locked', color: 'var(--pw-text-muted)' },
};

const BRANCH_LABELS: Record<string, string> = {
  lodge: 'Lodge (Economy)',
  nature: 'Nature (Support)',
  warfare: 'Warfare (Offense)',
  fortifications: 'Fortifications (Defense)',
  shadow: 'Shadow (Subterfuge)',
};

export function techTooltipData(
  _id: string,
  upgrade: TechUpgrade,
  state: NodeState,
  researchDiscount: number,
): TooltipData {
  const mult = 1 - researchDiscount;
  const clams = Math.round(upgrade.clamCost * mult);
  const twigs = Math.round(upgrade.twigCost * mult);
  const pearls = upgrade.pearlCost ? Math.round(upgrade.pearlCost * mult) : 0;
  const stateInfo = STATE_LABELS[state];

  const reqName =
    'requires' in upgrade && upgrade.requires
      ? (TECH_UPGRADES[upgrade.requires as keyof typeof TECH_UPGRADES]?.name ?? upgrade.requires)
      : undefined;

  return {
    title: upgrade.name,
    cost: '',
    costBreakdown: { clams, twigs, pearls: pearls || undefined },
    description: upgrade.description,
    hotkey: '',
    requires: reqName ? `Requires: ${reqName}` : undefined,
    status: stateInfo.text,
    statusColor: stateInfo.color,
    statLines: [{ label: 'Branch', value: BRANCH_LABELS[upgrade.branch] ?? upgrade.branch }],
  };
}
