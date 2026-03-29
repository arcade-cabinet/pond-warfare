/**
 * Tech Tree Panel
 *
 * Full-screen overlay showing all techs organized in a visual skill-tree graph.
 * Two columns: Lodge branch (left) and Armory branch (right). Each node shows
 * research state (researched/available/locked/unaffordable) with dependency lines.
 */

import { type TechId, TECH_UPGRADES, canResearch } from '@/config/tech-tree';
import type { TechState } from '@/config/tech-tree';

// -------------------------------------------------------------------
// Tree layout definition
// -------------------------------------------------------------------

interface TreeNode {
  id: TechId;
  /** Grid column (0-based) within the branch */
  col: number;
  /** Grid row (0-based) */
  row: number;
  /** Unit unlock text shown below the node */
  unlocks?: string;
}

interface TreeEdge {
  from: TechId;
  to: TechId;
}

// Lodge branch layout
const LODGE_NODES: TreeNode[] = [
  { id: 'cartography' as TechId, col: 0, row: 0 },
  { id: 'tidalHarvest' as TechId, col: 1, row: 0 },
];

const LODGE_EDGES: TreeEdge[] = [
  { from: 'cartography' as TechId, to: 'tidalHarvest' as TechId },
];

// Armory branch layout
const ARMORY_NODES: TreeNode[] = [
  { id: 'sturdyMud', col: 0, row: 0 },
  { id: 'swiftPaws', col: 1, row: 0 },
  { id: 'sharpSticks', col: 0, row: 1 },
  { id: 'ironShell' as TechId, col: 1, row: 1, unlocks: 'Shieldbearer' },
  { id: 'battleRoar' as TechId, col: 2, row: 1 },
  { id: 'eagleEye', col: 0, row: 2 },
  { id: 'siegeWorks' as TechId, col: 1, row: 2, unlocks: 'Catapult' },
  { id: 'hardenedShells', col: 0, row: 3 },
];

const ARMORY_EDGES: TreeEdge[] = [
  { from: 'sturdyMud', to: 'swiftPaws' },
  { from: 'sharpSticks', to: 'ironShell' as TechId },
  { from: 'ironShell' as TechId, to: 'battleRoar' as TechId },
  { from: 'sharpSticks', to: 'eagleEye' },
  { from: 'eagleEye', to: 'siegeWorks' as TechId },
  { from: 'eagleEye', to: 'hardenedShells' },
];

// -------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------

const NODE_W = 130;
const NODE_H = 80;
const GAP_X = 30;
const GAP_Y = 24;
const CELL_W = NODE_W + GAP_X;
const CELL_H = NODE_H + GAP_Y;

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

type NodeState = 'researched' | 'available' | 'unaffordable' | 'locked';

function getNodeState(
  id: TechId,
  techState: TechState,
  clams: number,
  twigs: number,
): NodeState {
  const upgrade = TECH_UPGRADES[id];
  if (!upgrade) return 'locked';
  if (techState[id]) return 'researched';
  if (!canResearch(id, techState)) return 'locked';
  if (clams >= upgrade.clamCost && twigs >= upgrade.twigCost) return 'available';
  return 'unaffordable';
}

function stateClasses(state: NodeState): string {
  switch (state) {
    case 'researched':
      return 'border-green-500 bg-green-900/60 text-green-100';
    case 'available':
      return 'border-amber-400 bg-slate-700 text-amber-100 cursor-pointer hover:bg-slate-600 shadow-[0_0_12px_rgba(251,191,36,0.35)] animate-pulse-subtle';
    case 'unaffordable':
      return 'border-amber-400/60 bg-slate-700/80 text-slate-300 cursor-not-allowed';
    case 'locked':
      return 'border-slate-600 bg-slate-800/60 text-slate-500 cursor-not-allowed opacity-60';
  }
}

// -------------------------------------------------------------------
// Sub-components
// -------------------------------------------------------------------

function TechNode({
  node,
  state,
  onClick,
}: {
  node: TreeNode;
  state: NodeState;
  onClick: () => void;
}) {
  const upgrade = TECH_UPGRADES[node.id as keyof typeof TECH_UPGRADES];
  if (!upgrade) return null;

  const x = node.col * CELL_W;
  const y = node.row * CELL_H;

  return (
    <div
      class={`absolute rounded-lg border-2 flex flex-col items-center justify-center text-center p-1 select-none transition-colors duration-200 ${stateClasses(state)}`}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${NODE_W}px`,
        height: `${NODE_H}px`,
        minHeight: '44px',
        minWidth: '44px',
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (state === 'available') onClick();
      }}
    >
      {state === 'researched' && (
        <span class="absolute top-1 right-1 text-green-400 text-xs">&#10003;</span>
      )}
      <span class="text-xs font-bold leading-tight">{upgrade.name}</span>
      <span
        class={`text-[10px] mt-0.5 ${state === 'unaffordable' ? 'text-red-400' : 'text-sky-200'}`}
      >
        {upgrade.clamCost}C {upgrade.twigCost}T
      </span>
      <span class="text-[9px] leading-tight mt-0.5 opacity-80">{upgrade.description}</span>
      {state === 'locked' && 'requires' in upgrade && upgrade.requires && (
        <span class="text-[8px] text-slate-500 mt-0.5">
          Needs: {TECH_UPGRADES[upgrade.requires as keyof typeof TECH_UPGRADES]?.name ?? upgrade.requires}
        </span>
      )}
      {node.unlocks && (
        <span class="text-[8px] text-amber-300 mt-0.5">Unlocks: {node.unlocks}</span>
      )}
    </div>
  );
}

function EdgeLines({
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
    >
      {edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) return null;
        // Only draw if both techs exist in TECH_UPGRADES
        if (!TECH_UPGRADES[edge.from as keyof typeof TECH_UPGRADES]) return null;
        if (!TECH_UPGRADES[edge.to as keyof typeof TECH_UPGRADES]) return null;

        const x1 = fromNode.col * CELL_W + NODE_W / 2;
        const y1 = fromNode.row * CELL_H + NODE_H / 2;
        const x2 = toNode.col * CELL_W + NODE_W / 2;
        const y2 = toNode.row * CELL_H + NODE_H / 2;

        const researched =
          techState[edge.from as TechId] && techState[edge.to as TechId];
        const partial = techState[edge.from as TechId];

        let stroke = '#475569'; // slate-600
        if (researched) stroke = '#22c55e'; // green-500
        else if (partial) stroke = '#f59e0b'; // amber-500

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

function BranchPanel({
  title,
  nodes,
  edges,
  techState,
  clams,
  twigs,
  onResearch,
}: {
  title: string;
  nodes: TreeNode[];
  edges: TreeEdge[];
  techState: TechState;
  clams: number;
  twigs: number;
  onResearch: (id: TechId) => void;
}) {
  // Filter to only nodes whose tech actually exists
  const activeNodes = nodes.filter(
    (n) => TECH_UPGRADES[n.id as keyof typeof TECH_UPGRADES] != null,
  );
  if (activeNodes.length === 0) return null;

  // Compute grid bounds
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
      <h3 class="text-amber-400 font-bold text-sm uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div class="relative" style={{ width: `${gridW}px`, height: `${gridH}px` }}>
        <EdgeLines edges={edges} nodes={activeNodes} techState={techState} />
        {activeNodes.map((node) => {
          const state = getNodeState(node.id, techState, clams, twigs);
          return (
            <TechNode
              key={node.id}
              node={node}
              state={state}
              onClick={() => onResearch(node.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// -------------------------------------------------------------------
// Main exported component
// -------------------------------------------------------------------

export interface TechTreePanelProps {
  techState: TechState;
  clams: number;
  twigs: number;
  onResearch: (id: TechId) => void;
  onClose: () => void;
}

export function TechTreePanel({
  techState,
  clams,
  twigs,
  onResearch,
  onClose,
}: TechTreePanelProps) {
  return (
    <div
      class="absolute inset-0 z-50 bg-black/80 flex flex-col items-center overflow-auto"
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div class="w-full flex items-center justify-between px-6 pt-4 pb-2 max-w-4xl mx-auto">
        <h2 class="text-lg font-bold text-slate-100 uppercase tracking-widest">
          Tech Tree
        </h2>
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded bg-slate-700 hover:bg-red-700 text-slate-300 hover:text-white text-lg font-bold transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          X
        </button>
      </div>

      {/* Resources bar */}
      <div class="flex gap-4 text-xs text-slate-400 mb-4">
        <span>
          Clams: <span class="text-sky-200 font-bold">{clams}</span>
        </span>
        <span>
          Twigs: <span class="text-sky-200 font-bold">{twigs}</span>
        </span>
      </div>

      {/* Tree columns */}
      <div class="flex flex-col md:flex-row gap-10 md:gap-16 px-4 pb-8 items-start justify-center">
        <BranchPanel
          title="Lodge"
          nodes={LODGE_NODES}
          edges={LODGE_EDGES}
          techState={techState}
          clams={clams}
          twigs={twigs}
          onResearch={onResearch}
        />
        <BranchPanel
          title="Armory"
          nodes={ARMORY_NODES}
          edges={ARMORY_EDGES}
          techState={techState}
          clams={clams}
          twigs={twigs}
          onResearch={onResearch}
        />
      </div>
    </div>
  );
}
