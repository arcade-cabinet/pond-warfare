/**
 * TechNode — Desktop absolute-positioned node in the tech tree graph.
 *
 * Positioned using pixel offsets derived from the node's grid col/row and
 * the cell sizing constants. Shows tech name, cost, description, and
 * prerequisite/unlock badges.
 */

import { TECH_UPGRADES } from '@/config/tech-tree';
import type { TreeNode } from './tree-data';
import { CELL_H, CELL_W, NODE_H, NODE_W } from './tree-data';
import { type NodeState, stateStyles } from './tree-helpers';

export function TechNode({
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
  const mult = 1 - researchDiscount;
  const clamCost = Math.round(upgrade.clamCost * mult);
  const twigCost = Math.round(upgrade.twigCost * mult);

  const x = node.col * CELL_W;
  const y = node.row * CELL_H;
  const styles = stateStyles(state);

  return (
    <div
      class={`absolute rounded-lg stone-node flex flex-col items-center justify-center text-center p-1 select-none transition-colors duration-200 ${styles.extra}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${NODE_W}px`,
        height: `${NODE_H}px`,
        minHeight: '44px',
        minWidth: '44px',
        borderColor: styles.border,
        background: styles.background,
        color: styles.color,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (state === 'available') onClick();
      }}
    >
      {state === 'researched' && (
        <span class="absolute top-1 right-1 text-xs" style={{ color: 'var(--pw-success)' }}>
          &#10003;
        </span>
      )}
      <span class="font-heading text-xs font-bold leading-tight">{upgrade.name}</span>
      <span
        class="font-numbers text-[10px] mt-0.5"
        style={{
          color: state === 'unaffordable' ? 'var(--pw-enemy-light)' : 'var(--pw-accent)',
        }}
      >
        {clamCost}C {twigCost}T
      </span>
      <span class="font-game text-[9px] leading-tight mt-0.5 opacity-80">
        {upgrade.description}
      </span>
      {state === 'locked' && 'requires' in upgrade && upgrade.requires && (
        <span class="font-game text-[8px] mt-0.5" style={{ color: 'var(--pw-text-muted)' }}>
          Needs:{' '}
          {TECH_UPGRADES[upgrade.requires as keyof typeof TECH_UPGRADES]?.name ?? upgrade.requires}
        </span>
      )}
      {node.unlocks && (
        <span class="font-game text-[8px] mt-0.5" style={{ color: 'var(--pw-warning)' }}>
          Unlocks: {node.unlocks}
        </span>
      )}
    </div>
  );
}
