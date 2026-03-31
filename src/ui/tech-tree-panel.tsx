/**
 * Tech Tree Panel
 *
 * Full-screen overlay showing all techs. Viewport-aware:
 * - Desktop (≥768px): side-by-side branch graphs with SVG dependency lines
 * - Mobile (<768px): branch tabs (Lodge/Nature | Armory) + scrollable card grid
 *
 * Decomposed into submodules under src/ui/tech-tree/.
 */

import { useState } from 'preact/hooks';
import type { TechId, TechState } from '@/config/tech-tree';
import { useScrollDrag } from './hooks/useScrollDrag';
import { BranchGrid } from './tech-tree/BranchGrid';
import { BranchPanel } from './tech-tree/BranchPanel';
import { ARMORY_EDGES, ARMORY_NODES, LODGE_EDGES, LODGE_NODES } from './tech-tree/tree-data';

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface TechTreePanelProps {
  techState: TechState;
  clams: number;
  twigs: number;
  onResearch: (id: TechId) => void;
  onClose: () => void;
}

type BranchTab = 'lodge' | 'armory';

// -------------------------------------------------------------------
// Mobile branch tab bar
// -------------------------------------------------------------------

function BranchTabs({ active, onSelect }: { active: BranchTab; onSelect: (t: BranchTab) => void }) {
  const tabs: { id: BranchTab; label: string }[] = [
    { id: 'lodge', label: 'Lodge / Nature' },
    { id: 'armory', label: 'Armory' },
  ];
  return (
    <div class="flex gap-1 w-full max-w-md mx-auto px-4 mb-3">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            class="hud-btn rounded px-3 py-1.5 font-heading font-bold text-[10px] tracking-wider flex-1"
            style={{
              minHeight: '44px',
              background: isActive ? 'rgba(64, 200, 208, 0.15)' : undefined,
              borderColor: isActive ? 'var(--pw-accent)' : undefined,
              color: isActive ? 'var(--pw-accent-bright)' : 'var(--pw-text-muted)',
              boxShadow: isActive ? '0 0 8px rgba(64, 200, 208, 0.15)' : undefined,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(t.id);
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------------
// Main component
// -------------------------------------------------------------------

export function TechTreePanel({
  techState,
  clams,
  twigs,
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

        {/* Mobile: branch tabs + card grid (visible <768px) */}
        <div class="md:hidden w-full flex-1 flex flex-col">
          <BranchTabs active={branch} onSelect={setBranch} />
          <div class="px-4 pb-8">
            {branch === 'lodge' && (
              <BranchGrid
                nodes={LODGE_NODES}
                techState={techState}
                clams={clams}
                twigs={twigs}
                onResearch={onResearch}
              />
            )}
            {branch === 'armory' && (
              <BranchGrid
                nodes={ARMORY_NODES}
                techState={techState}
                clams={clams}
                twigs={twigs}
                onResearch={onResearch}
              />
            )}
          </div>
        </div>

        {/* Desktop: side-by-side graphs (visible ≥768px) */}
        <div class="hidden md:flex gap-16 px-4 pb-8 items-start justify-center">
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
    </div>
  );
}
