/**
 * Tech Tree Panel
 *
 * Full-screen overlay showing all techs organized in a visual skill-tree graph.
 * Two columns: Lodge branch (left) and Armory branch (right). Each node shows
 * research state (researched/available/locked/unaffordable) with dependency lines.
 */

import type { TechState } from '@/config/tech-tree';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';

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
  { id: 'cartography', col: 0, row: 0, unlocks: 'Scout Post' },
  { id: 'tidalHarvest', col: 1, row: 0 },
  { id: 'herbalMedicine', col: 2, row: 0, unlocks: 'Herbalist Hut' },
  { id: 'tradeRoutes', col: 0, row: 1 },
  { id: 'aquaticTraining', col: 2, row: 1, unlocks: 'Swimmer' },
  { id: 'pondBlessing', col: 1, row: 1 },
  { id: 'deepDiving', col: 2, row: 2 },
  { id: 'rootNetwork', col: 1, row: 2 },
  { id: 'tidalSurge', col: 0, row: 2 },
];

const LODGE_EDGES: TreeEdge[] = [
  { from: 'herbalMedicine', to: 'aquaticTraining' },
  { from: 'herbalMedicine', to: 'pondBlessing' },
  { from: 'aquaticTraining', to: 'deepDiving' },
  { from: 'cartography', to: 'tradeRoutes' },
  { from: 'deepDiving', to: 'rootNetwork' },
  { from: 'deepDiving', to: 'tidalSurge' },
];

// Armory branch layout
const ARMORY_NODES: TreeNode[] = [
  { id: 'sturdyMud', col: 0, row: 0 },
  { id: 'swiftPaws', col: 1, row: 0 },
  { id: 'sharpSticks', col: 0, row: 1 },
  { id: 'ironShell', col: 1, row: 1, unlocks: 'Shieldbearer' },
  { id: 'battleRoar', col: 2, row: 1 },
  { id: 'eagleEye', col: 0, row: 2 },
  { id: 'siegeWorks', col: 1, row: 2, unlocks: 'Catapult' },
  { id: 'cunningTraps', col: 2, row: 2, unlocks: 'Trapper' },
  { id: 'hardenedShells', col: 0, row: 3 },
  { id: 'piercingShot', col: 1, row: 3 },
  { id: 'camouflage', col: 2, row: 3 },
  { id: 'fortifiedWalls', col: 0, row: 4 },
  { id: 'rallyCry', col: 1, row: 4 },
  { id: 'warDrums', col: 2, row: 4 },
  { id: 'venomCoating', col: 0, row: 5 },
  { id: 'siegeEngineering', col: 1, row: 5 },
];

const ARMORY_EDGES: TreeEdge[] = [
  { from: 'sturdyMud', to: 'swiftPaws' },
  { from: 'sturdyMud', to: 'fortifiedWalls' },
  { from: 'sharpSticks', to: 'ironShell' },
  { from: 'sharpSticks', to: 'battleRoar' },
  { from: 'sharpSticks', to: 'eagleEye' },
  { from: 'sharpSticks', to: 'cunningTraps' },
  { from: 'eagleEye', to: 'siegeWorks' },
  { from: 'eagleEye', to: 'hardenedShells' },
  { from: 'eagleEye', to: 'piercingShot' },
  { from: 'cunningTraps', to: 'camouflage' },
  { from: 'cunningTraps', to: 'venomCoating' },
  { from: 'swiftPaws', to: 'rallyCry' },
  { from: 'battleRoar', to: 'warDrums' },
  { from: 'siegeWorks', to: 'siegeEngineering' },
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

function getNodeState(id: TechId, techState: TechState, clams: number, twigs: number): NodeState {
  const upgrade = TECH_UPGRADES[id];
  if (!upgrade) return 'locked';
  if (techState[id]) return 'researched';
  if (!canResearch(id, techState)) return 'locked';
  if (clams >= upgrade.clamCost && twigs >= upgrade.twigCost) return 'available';
  return 'unaffordable';
}

function stateStyles(state: NodeState): {
  border: string;
  background: string;
  color: string;
  extra: string;
} {
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
        style={{ color: state === 'unaffordable' ? 'var(--pw-enemy-light)' : 'var(--pw-accent)' }}
      >
        {upgrade.clamCost}C {upgrade.twigCost}T
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
      role="img"
      aria-label="Tech tree dependency lines"
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
      <h3
        class="font-heading text-sm uppercase tracking-wider mb-3"
        style={{ color: 'var(--pw-warning)' }}
      >
        {title}
      </h3>
      <div class="relative" style={{ width: `${gridW}px`, height: `${gridH}px` }}>
        <EdgeLines edges={edges} nodes={activeNodes} techState={techState} />
        {activeNodes.map((node) => {
          const state = getNodeState(node.id, techState, clams, twigs);
          return (
            <TechNode key={node.id} node={node} state={state} onClick={() => onResearch(node.id)} />
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
      class="absolute inset-0 z-50 flex flex-col items-center overflow-auto overscroll-contain touch-pan-y parchment-panel"
      style={{ background: 'rgba(12, 26, 31, 0.9)' }}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Header */}
      <div class="w-full flex items-center justify-between px-6 pt-4 pb-2 max-w-4xl mx-auto">
        <h2
          class="font-title text-lg uppercase tracking-widest"
          style={{ color: 'var(--pw-text-primary)' }}
        >
          Tech Tree
        </h2>
        <button
          type="button"
          class="hud-btn w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center rounded text-lg font-bold transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          X
        </button>
      </div>

      {/* Resources bar */}
      <div class="flex gap-4 text-xs mb-4 font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
        <span>
          Clams:{' '}
          <span class="font-bold" style={{ color: 'var(--pw-clam)' }}>
            {clams}
          </span>
        </span>
        <span>
          Twigs:{' '}
          <span class="font-bold" style={{ color: 'var(--pw-twig)' }}>
            {twigs}
          </span>
        </span>
      </div>

      {/* Tree columns */}
      <div class="flex flex-col md:flex-row gap-10 md:gap-16 px-4 pb-8 items-start justify-center">
        <BranchPanel
          title="Lodge / Nature"
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
