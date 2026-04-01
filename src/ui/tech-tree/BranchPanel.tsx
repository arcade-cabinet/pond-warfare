/**
 * BranchPanel — Desktop graph layout for a single tech branch.
 *
 * Renders tech nodes at absolute pixel positions with SVG dependency
 * lines between them. Used on screens ≥768px wide.
 */

import { TECH_UPGRADES, type TechId, type TechState } from '@/config/tech-tree';
import { EdgeLines } from './EdgeLines';
import { TechNode } from './TechNode';
import type { TreeEdge, TreeNode } from './tree-data';
import { CELL_H, CELL_W, GAP_X, GAP_Y } from './tree-data';
import { getNodeState } from './tree-helpers';

export function BranchPanel({
  title,
  nodes,
  edges,
  techState,
  clams,
  twigs,
  researchDiscount = 0,
  onResearch,
}: {
  title: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
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

  let maxCol = 0;
  let maxRow = 0;
  for (const n of activeNodes) {
    if (n.col > maxCol) maxCol = n.col;
    if (n.row > maxRow) maxRow = n.row;
  }
  const gridW = (maxCol + 1) * CELL_W - GAP_X;
  const gridH = (maxRow + 1) * CELL_H - GAP_Y;

  return (
    <div class="flex flex-col items-center">
      <h3
        class="font-heading text-sm uppercase tracking-wider mb-3"
        style={{ color: 'var(--pw-warning)' }}
      >
        {title}
      </h3>
      <div class="relative" style={{ width: `${gridW}px`, height: `${gridH}px` }}>
        <EdgeLines edges={edges} nodes={activeNodes} techState={techState} />
        {activeNodes.map((node) => {
          const state = getNodeState(node.id, techState, clams, twigs, researchDiscount);
          return (
            <TechNode
              key={node.id}
              node={node}
              state={state}
              researchDiscount={researchDiscount}
              onClick={() => onResearch(node.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
