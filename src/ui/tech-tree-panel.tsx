/**
 * Tech Tree Panel
 *
 * Full-screen overlay showing all techs. Layout chosen by screenClass signal:
 * - compact (phones, landscape phones): SwipeableTabView with card grids
 * - medium/large (tablets, foldables, laptops, desktops): side-by-side SVG graphs
 *
 * Decomposed into submodules under src/ui/tech-tree/.
 */

import { useState } from 'preact/hooks';
import type { TechId, TechState } from '@/config/tech-tree';
import { screenClass } from '@/platform';
import { PondTabButton } from './components/PondTabButton';
import { useScrollDrag } from './hooks/useScrollDrag';
import { BranchGrid } from './tech-tree/BranchGrid';
import { BranchPanel } from './tech-tree/BranchPanel';
import { ARMORY_EDGES, ARMORY_NODES, LODGE_EDGES, LODGE_NODES } from './tech-tree/tree-data';

export interface TechTreePanelProps {
  techState: TechState;
  clams: number;
  twigs: number;
  researchDiscount?: number;
  onResearch: (id: TechId) => void;
  onClose: () => void;
}

type BranchTab = 'lodge' | 'armory';

const BRANCH_TABS: { key: BranchTab; label: string }[] = [
  { key: 'lodge', label: 'Lodge' },
  { key: 'armory', label: 'Armory' },
];

export function TechTreePanel({
  techState,
  clams,
  twigs,
  researchDiscount = 0,
  onResearch,
  onClose,
}: TechTreePanelProps) {
  const scrollRef = useScrollDrag<HTMLDivElement>();
  const [branch, setBranch] = useState<BranchTab>('lodge');

  return (
    <div
      class="absolute inset-0 z-50 modal-overlay"
      style={{ background: 'rgba(12, 26, 31, 0.9)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Inner scroll container — has max-height constraint, centered */}
      <div
        ref={scrollRef}
        class="absolute inset-0 flex flex-col items-center modal-scroll-both parchment-panel"
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

        {/* Compact: branch tabs + card grid (phones, landscape phones) */}
        {screenClass.value === 'compact' && (
          <div class="w-full flex-1 flex flex-col">
            <div class="flex gap-2 justify-center py-2">
              {BRANCH_TABS.map((t) => (
                <PondTabButton
                  key={t.key}
                  label={t.label}
                  active={branch === t.key}
                  onClick={() => setBranch(t.key)}
                />
              ))}
            </div>
            <div class="px-4 pb-8">
              <BranchGrid
                nodes={branch === 'lodge' ? LODGE_NODES : ARMORY_NODES}
                techState={techState}
                clams={clams}
                twigs={twigs}
                researchDiscount={researchDiscount}
                onResearch={onResearch}
              />
            </div>
          </div>
        )}

        {/* Medium/Large: side-by-side SVG graphs (tablets, foldables, desktops) */}
        {screenClass.value !== 'compact' && (
          <div class="flex gap-16 px-4 pb-8 items-start justify-center">
            <BranchPanel
              title="Lodge / Nature"
              nodes={LODGE_NODES}
              edges={LODGE_EDGES}
              techState={techState}
              clams={clams}
              twigs={twigs}
              researchDiscount={researchDiscount}
              onResearch={onResearch}
            />
            <BranchPanel
              title="Armory"
              nodes={ARMORY_NODES}
              edges={ARMORY_EDGES}
              techState={techState}
              clams={clams}
              twigs={twigs}
              researchDiscount={researchDiscount}
              onResearch={onResearch}
            />
          </div>
        )}
      </div>
    </div>
  );
}
