/**
 * TechCard — Mobile-friendly card for a single tech upgrade.
 *
 * Replaces the desktop absolute-positioned TechNode on small screens.
 * Uses a flowing CSS grid layout. Shows a text-based "Requires: X"
 * dependency badge instead of SVG lines, making it fully touch-friendly.
 */

import { TECH_UPGRADES } from '@/config/tech-tree';
import type { TreeNode } from './tree-data';
import { type NodeState, stateStyles } from './tree-helpers';

export function TechCard({
  node,
  state,
  researchDiscount = 0,
  onClick,
}: {
  node: TreeNode;
  state: NodeState;
  researchDiscount?: number;
  onClick: () => void;
}) {
  const upgrade = TECH_UPGRADES[node.id as keyof typeof TECH_UPGRADES];
  if (!upgrade) return null;
  const styles = stateStyles(state);
  const mult = 1 - researchDiscount;
  const clamCost = Math.round(upgrade.clamCost * mult);
  const twigCost = Math.round(upgrade.twigCost * mult);

  return (
    <button
      type="button"
      class={`tech-card stone-node rounded-lg p-2 text-left select-none transition-colors duration-200 ${styles.extra}`}
      style={{
        borderColor: styles.border,
        background: styles.background,
        color: styles.color,
        minHeight: '72px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (state === 'available') onClick();
      }}
      disabled={state === 'locked'}
    >
      {/* Top row: name + check */}
      <div class="flex items-start justify-between gap-1">
        <span class="font-heading text-xs font-bold leading-tight">{upgrade.name}</span>
        {state === 'researched' && (
          <span class="text-xs flex-shrink-0" style={{ color: 'var(--pw-success)' }}>
            &#10003;
          </span>
        )}
      </div>

      {/* Cost */}
      <div
        class="font-numbers text-[10px] mt-0.5"
        style={{
          color: state === 'unaffordable' ? 'var(--pw-enemy-light)' : 'var(--pw-accent)',
        }}
      >
        {clamCost}C {twigCost}T
        {'pearlCost' in upgrade && (upgrade as { pearlCost: number }).pearlCost > 0 && (
          <span style={{ color: 'var(--pw-pearl, #e0b0ff)' }}>
            {' '}
            {(upgrade as { pearlCost: number }).pearlCost}P
          </span>
        )}
      </div>

      {/* Description */}
      <div class="font-game text-[9px] leading-tight mt-0.5 opacity-80">{upgrade.description}</div>

      {/* Dependency badge (text, not SVG) */}
      {'requires' in upgrade && upgrade.requires && (
        <div
          class="font-game text-[8px] mt-1 rounded px-1 py-0.5 inline-block"
          style={{
            background:
              state === 'locked' ? 'rgba(232, 160, 48, 0.15)' : 'rgba(64, 184, 104, 0.15)',
            color: state === 'locked' ? 'var(--pw-warning)' : 'var(--pw-success)',
            border: `1px solid ${state === 'locked' ? 'rgba(232, 160, 48, 0.3)' : 'rgba(64, 184, 104, 0.3)'}`,
          }}
        >
          {state === 'locked' ? 'Needs' : 'From'}:{' '}
          {TECH_UPGRADES[upgrade.requires as keyof typeof TECH_UPGRADES]?.name ?? upgrade.requires}
        </div>
      )}

      {/* Unlock badge */}
      {node.unlocks && (
        <div class="font-game text-[8px] mt-0.5" style={{ color: 'var(--pw-warning)' }}>
          &#x1F513; {node.unlocks}
        </div>
      )}
    </button>
  );
}
