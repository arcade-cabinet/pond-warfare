/**
 * CommandPanel -- Slide-out (mobile) or docked (desktop) panel with
 * four tabs: Map, Forces, Buildings, Menu.
 *
 * Uses PondTabButton for styled tab navigation with the painted
 * Button.png asset. Collapse toggle and dim overlay are handled
 * outside the tab view.
 */

import { useSignal } from '@preact/signals';
import { canDockPanels } from '@/platform';
import { PondTabButton } from '../components/PondTabButton';
import type { PanelTab } from '../store';
import * as store from '../store';
import { BuildingsTab } from './BuildingsTab';
import { ForcesTab } from './ForcesTab';
import { MapTab } from './MapTab';
import { MenuTab } from './MenuTab';

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'forces', label: 'Forces' },
  { id: 'buildings', label: 'Build' },
  { id: 'menu', label: 'Menu' },
];

export interface CommandPanelProps {
  minimapCanvasRef: preact.RefObject<HTMLCanvasElement>;
  minimapCamRef: preact.RefObject<HTMLDivElement>;
}

export function CommandPanel({ minimapCanvasRef, minimapCamRef }: CommandPanelProps) {
  const docked = canDockPanels.value;
  const open = docked || store.mobilePanelOpen.value;
  const tab = store.activePanelTab.value;
  const collapsed = useSignal(false);

  const panelWidth = docked ? '300px' : 'min(280px, 50vw)';
  const showOverlay = !docked && store.mobilePanelOpen.value;

  return (
    <>
      {/* Panel */}
      <div
        class={`absolute top-0 right-0 h-full z-40 flex flex-col ${docked ? '' : 'transition-transform duration-200 ease-out'} ${open && !collapsed.value ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: panelWidth,
          background: 'linear-gradient(180deg, var(--pw-wood-mid), var(--pw-wood-dark))',
          borderLeft: '3px solid var(--pw-border)',
          boxShadow: open && !docked ? '-4px 0 20px rgba(0,0,0,0.5)' : 'none',
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

        {/* Tab bar */}
        <div
          class="flex flex-shrink-0 gap-1 px-1 py-1 justify-center"
          style={{ borderBottom: '2px solid var(--pw-border)' }}
        >
          {TABS.map((t) => (
            <PondTabButton
              key={t.id}
              label={t.label}
              active={tab === t.id}
              onClick={() => {
                store.activePanelTab.value = t.id;
              }}
            />
          ))}
        </div>

        {/* Tab content */}
        <div class="flex-1 overflow-y-auto min-h-0">
          {tab === 'map' && (
            <MapTab minimapCanvasRef={minimapCanvasRef} minimapCamRef={minimapCamRef} />
          )}
          {tab === 'forces' && <ForcesTab />}
          {tab === 'buildings' && <BuildingsTab />}
          {tab === 'menu' && <MenuTab />}
        </div>
      </div>

      {/* Dim overlay (mobile slide-out only) */}
      {showOverlay && (
        <div
          class="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.3)', zIndex: 35 }}
          onClick={() => {
            store.mobilePanelOpen.value = false;
          }}
        />
      )}
    </>
  );
}
