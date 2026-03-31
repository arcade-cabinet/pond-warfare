/**
 * EdgeLines — SVG dependency lines between tech nodes (desktop only).
 *
 * Draws colored lines between parent and child techs. Line color reflects
 * research progress: green = both researched, yellow = parent only, grey = locked.
 */

import { TECH_UPGRADES, type TechId, type TechState } from '@/config/tech-tree';
import type { TreeEdge, TreeNode } from './tree-data';
import { CELL_H, CELL_W, NODE_H, NODE_W } from './tree-data';

export function EdgeLines({
  edges,
  nodes,
  techState,
}: {
  edges: TreeEdge[];
  nodes: TreeNode[];
  techState: TechState;
}) {
  const nodeMap = new Map<string, TreeNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  return (
    <svg
      class="absolute inset-0 pointer-events-none"
      style={{ overflow: 'visible' }}
      role="img"
      aria-label="Tech tree dependency lines"
    >
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        if (!TECH_UPGRADES[edge.from as keyof typeof TECH_UPGRADES]) return null;
        if (!TECH_UPGRADES[edge.to as keyof typeof TECH_UPGRADES]) return null;

        const x1 = fromNode.col * CELL_W + NODE_W / 2;
        const y1 = fromNode.row * CELL_H + NODE_H / 2;
        const x2 = toNode.col * CELL_W + NODE_W / 2;
        const y2 = toNode.row * CELL_H + NODE_H / 2;

        const researched = techState[edge.from as TechId] && techState[edge.to as TechId];
        const partial = techState[edge.from as TechId];

        let stroke = 'var(--pw-border)';
        if (researched) stroke = 'var(--pw-success)';
        else if (partial) stroke = 'var(--pw-warning)';

        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            stroke-width={2}
            stroke-dasharray={researched ? 'none' : '6 4'}
          />
        );
      })}
    </svg>
  );
}
