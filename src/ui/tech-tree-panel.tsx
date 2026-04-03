/**
 * Tech Tree Panel
 *
 * Full-screen overlay showing all techs across 5 branches.
 * Layout chosen by screenClass signal:
 * - compact: collapsible accordion sections with card grids
 * - medium/large: side-by-side SVG graphs (row of 3 + row of 2)
 */

import { useState } from 'preact/hooks';
import type { TechId, TechState } from '@/config/tech-tree';
import { screenClass } from '@/platform';
import { Frame9Slice } from './components/frame';
import { PondAccordionSection } from './components/PondAccordionSection';
import { useScrollDrag } from './hooks/useScrollDrag';
import { BranchGrid } from './tech-tree/BranchGrid';
import { BranchPanel } from './tech-tree/BranchPanel';
import {
  FORTIFICATION_EDGES,
  FORTIFICATION_NODES,
  LODGE_EDGES,
  LODGE_NODES,
  NATURE_EDGES,
  NATURE_NODES,
  SHADOW_EDGES,
  SHADOW_NODES,
  WARFARE_EDGES,
  WARFARE_NODES,
} from './tech-tree/tree-data';

export interface TechTreePanelProps {
  techState: TechState;
  clams: number;
  twigs: number;
  researchDiscount?: number;
  onResearch: (id: TechId) => void;
  onClose: () => void;
}

interface BranchDef {
  key: string;
  label: string;
  subtitle: string;
  nodes: typeof LODGE_NODES;
  edges: typeof LODGE_EDGES;
}

const BRANCHES: BranchDef[] = [
  {
    key: 'lodge',
    label: 'Lodge',
    subtitle: 'Economy & Expansion',
    nodes: LODGE_NODES,
    edges: LODGE_EDGES,
  },
  {
    key: 'nature',
    label: 'Nature',
    subtitle: 'Support & Healing',
    nodes: NATURE_NODES,
    edges: NATURE_EDGES,
  },
  {
    key: 'warfare',
    label: 'Warfare',
    subtitle: 'Offense & Damage',
    nodes: WARFARE_NODES,
    edges: WARFARE_EDGES,
  },
  {
    key: 'fortifications',
    label: 'Fortifications',
    subtitle: 'Defense & Siege',
    nodes: FORTIFICATION_NODES,
    edges: FORTIFICATION_EDGES,
  },
  {
    key: 'shadow',
    label: 'Shadow',
    subtitle: 'Subterfuge & Control',
    nodes: SHADOW_NODES,
    edges: SHADOW_EDGES,
  },
];

function branchSummary(nodes: typeof LODGE_NODES, techState: TechState): string {
  let count = 0;
  for (const n of nodes) {
    if (techState[n.id]) count++;
  }
  return `${count}/${nodes.length} researched`;
}

export function TechTreePanel({
  techState,
  clams,
  twigs,
  researchDiscount = 0,
  onResearch,
  onClose,
}: TechTreePanelProps) {
  const scrollRef = useScrollDrag<HTMLDivElement>();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['lodge']));

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div
      class="absolute inset-0 z-50 modal-overlay"
      style={{ background: 'var(--pw-overlay-heavy)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={scrollRef} class="absolute inset-0 flex flex-col items-center modal-scroll-both">
        <Frame9Slice title="TECH TREE">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
            >
              {'\u2715'}
            </button>

            {/* Resources bar */}
            <div
              class="flex gap-4 text-xs mb-4 font-numbers"
              style={{ color: 'var(--pw-text-muted)' }}
            >
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

            {/* Compact: accordion sections with card grids */}
            {screenClass.value === 'compact' && (
              <div class="w-full flex-1 flex flex-col gap-1">
                {BRANCHES.map((b) => (
                  <PondAccordionSection
                    key={b.key}
                    sectionKey={b.key}
                    title={`${b.label} -- ${b.subtitle}`}
                    summary={branchSummary(b.nodes, techState)}
                    open={openSections.has(b.key)}
                    onToggle={toggleSection}
                  >
                    <BranchGrid
                      nodes={b.nodes}
                      techState={techState}
                      clams={clams}
                      twigs={twigs}
                      researchDiscount={researchDiscount}
                      onResearch={onResearch}
                    />
                  </PondAccordionSection>
                ))}
              </div>
            )}

            {/* Medium/Large: side-by-side SVG graphs (3+2 rows) */}
            {screenClass.value !== 'compact' && (
              <div class="flex flex-col gap-10 items-center">
                <div class="flex gap-10 items-start justify-center flex-wrap">
                  {BRANCHES.slice(0, 3).map((b) => (
                    <BranchPanel
                      key={b.key}
                      title={`${b.label} -- ${b.subtitle}`}
                      nodes={b.nodes}
                      edges={b.edges}
                      techState={techState}
                      clams={clams}
                      twigs={twigs}
                      researchDiscount={researchDiscount}
                      onResearch={onResearch}
                    />
                  ))}
                </div>
                <div class="flex gap-10 items-start justify-center flex-wrap">
                  {BRANCHES.slice(3).map((b) => (
                    <BranchPanel
                      key={b.key}
                      title={`${b.label} -- ${b.subtitle}`}
                      nodes={b.nodes}
                      edges={b.edges}
                      techState={techState}
                      clams={clams}
                      twigs={twigs}
                      researchDiscount={researchDiscount}
                      onResearch={onResearch}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
