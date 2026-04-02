/**
 * CommandPanel -- Slide-out (mobile) or docked (desktop) panel with
 * four accordion sections: Minimap, Forces, Buildings, Game Menu.
 *
 * Uses PondAccordion for collapsible navigation with dynamic summaries.
 * Collapse toggle and dim overlay are handled outside the accordion view.
 */

import { useSignal } from '@preact/signals';
import { useMemo } from 'preact/hooks';
import { entityKindName } from '@/config/entity-defs';
import { canDockPanels, screenClass } from '@/platform';
import { type AccordionSection, PondAccordion } from '../components/PondAccordion';
import * as store from '../store';
import { buildingRoster, idleWorkerCount, unitRoster } from '../store';
import { BuildingsTab } from './BuildingsTab';
import { ForcesTab } from './ForcesTab';
import { MapTab } from './MapTab';
import { MenuTab } from './MenuTab';

export interface CommandPanelProps {
  minimapCanvasRef: preact.RefObject<HTMLCanvasElement>;
  minimapCamRef: preact.RefObject<HTMLDivElement>;
}

function useForcesSummary(): string {
  const roster = unitRoster.value;
  const idle = idleWorkerCount.value;
  const total = roster.reduce((sum, g) => sum + g.units.length, 0);
  if (total === 0) return 'No units';
  return `${idle} idle, ${total} total`;
}

function useBuildingsSummary(): string {
  const roster = buildingRoster.value;
  if (roster.length === 0) return 'No buildings';
  const names = roster.map((b) => entityKindName(b.kind));
  const unique = [...new Set(names)];
  if (unique.length <= 3) return unique.join(', ');
  return `${unique.slice(0, 2).join(', ')} +${unique.length - 2} more`;
}

export function CommandPanel({ minimapCanvasRef, minimapCamRef }: CommandPanelProps) {
  const docked = canDockPanels.value;
  const open = docked || store.mobilePanelOpen.value;
  const collapsed = useSignal(false);
  const sc = screenClass.value;

  // Responsive panel width: compact=50vw slide-out, medium=250px docked, large=300px docked
  const panelWidth = !docked ? 'min(280px, 50vw)' : sc === 'large' ? '300px' : '250px';
  const showOverlay = !docked && store.mobilePanelOpen.value;

  const forcesSummary = useForcesSummary();
  const buildingsSummary = useBuildingsSummary();

  const sections: AccordionSection[] = useMemo(
    () => [
      { key: 'map', title: 'Minimap', defaultOpen: true },
      { key: 'forces', title: 'Forces', summary: forcesSummary },
      { key: 'buildings', title: 'Buildings', summary: buildingsSummary },
      { key: 'menu', title: 'Game Menu' },
    ],
    [forcesSummary, buildingsSummary],
  );

  return (
    <>
      {/* Panel */}
      <div
        class={`absolute top-0 right-0 h-full z-40 flex flex-col pond-panel-bg ${docked ? '' : 'transition-transform duration-200 ease-out'} ${open && !collapsed.value ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: panelWidth,
          background: `linear-gradient(180deg, var(--pw-surface-panel), var(--pw-surface-panel-dark))`,
          borderLeft: `1px solid var(--pw-glow-accent-12)`,
          boxShadow: open && !docked ? `-4px 0 20px var(--pw-shadow-soft)` : 'none',
          backdropFilter: 'blur(8px)',
        }}
      >
        {/* Collapse toggle (docked only) */}
        {docked && (
          <button
            type="button"
            class="absolute -left-6 top-2 z-50 w-6 h-10 flex items-center justify-center rounded-l text-xs font-bold cursor-pointer"
            style={{
              background: 'var(--pw-wood-dark)',
              color: 'var(--pw-accent)',
              border: '1px solid var(--pw-border)',
              borderRight: 'none',
            }}
            title={collapsed.value ? 'Expand panel' : 'Collapse panel'}
            onClick={() => {
              collapsed.value = !collapsed.value;
            }}
          >
            {collapsed.value ? '\u25C0' : '\u25B6'}
          </button>
        )}

        {/* Accordion content */}
        <div class="flex-1 overflow-y-auto min-h-0">
          <PondAccordion sections={sections} allowMultiple={true}>
            <MapTab minimapCanvasRef={minimapCanvasRef} minimapCamRef={minimapCamRef} />
            <ForcesTab />
            <BuildingsTab />
            <MenuTab />
          </PondAccordion>
        </div>
      </div>

      {/* Dim overlay (mobile slide-out only) */}
      {showOverlay && (
        <div
          class="absolute inset-0"
          style={{ background: 'var(--pw-shadow-soft)', zIndex: 35 }}
          onClick={() => {
            store.mobilePanelOpen.value = false;
          }}
        />
      )}
    </>
  );
}
