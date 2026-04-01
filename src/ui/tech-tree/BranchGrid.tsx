/**
 * BranchGrid — Mobile card grid for a single tech branch.
 *
 * Renders tech cards in a responsive CSS grid. Each card shows a text-based
 * dependency badge instead of SVG lines, making it fully touch-scrollable
 * without needing two-axis pan.
 */

import { TECH_UPGRADES, type TechId, type TechState } from '@/config/tech-tree';
import { TechCard } from './TechCard';
import type { TreeNode } from './tree-data';
import { getNodeState } from './tree-helpers';

export function BranchGrid({
  nodes,
  techState,
  clams,
  twigs,
  researchDiscount = 0,
  onResearch,
}: {
  nodes: TreeNode[];
  techState: TechState;
  clams: number;
  twigs: number;
  researchDiscount?: number;
  onResearch: (id: TechId) => void;
}) {
  const activeNodes = nodes.filter(
    (n) => TECH_UPGRADES[n.id as keyof typeof TECH_UPGRADES] != null,
  );
  if (activeNodes.length === 0) return null;

  // Sort nodes by row then column for consistent reading order.
  const sorted = [...activeNodes].sort((a, b) => a.row - b.row || a.col - b.col);

  return (
    <div class="tech-card-grid">
      {sorted.map((node) => {
        const state = getNodeState(node.id, techState, clams, twigs, researchDiscount);
        return (
          <TechCard
            key={node.id}
            node={node}
            state={state}
            researchDiscount={researchDiscount}
            onClick={() => onResearch(node.id)}
          />
        );
      })}
    </div>
  );
}
