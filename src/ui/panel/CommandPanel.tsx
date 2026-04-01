/**
 * CommandPanel -- Slide-out (mobile) or docked (desktop) panel with
 * four tabs: Map, Forces, Buildings, Menu.
 *
 * When `canDockPanels` is true the panel is always visible as a fixed
 * sidebar on the right edge with a collapse/expand toggle. Otherwise it
 * uses the hamburger-driven slide-out with a dim overlay.
 */

import { useSignal } from '@preact/signals';
import { canDockPanels } from '@/platform';
import type { PanelTab } from '../store';
import * as store from '../store';
import { BuildingsTab } from './BuildingsTab';
import { ForcesTab } from './ForcesTab';
import { MapTab } from './MapTab';
import { MenuTab } from './MenuTab';

const TABS: { id: PanelTab; icon: string; label: string }[] = [
  { id: 'map', icon: '\uD83D\uDDFA', label: 'Map' },
  { id: 'forces', icon: '\u2694', label: 'Forces' },
  { id: 'buildings', icon: '\uD83C\uDFD7', label: 'Build' },
  { id: 'menu', icon: '\u2699', label: 'Menu' },
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
        <div class="flex flex-shrink-0" style={{ borderBottom: '2px solid var(--pw-border)' }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              class="flex-1 py-1.5 text-center text-[10px] font-heading font-bold cursor-pointer transition-colors min-h-[44px]"
              style={{
                background:
                  tab === t.id
                    ? 'linear-gradient(180deg, var(--pw-wood-light), var(--pw-wood-mid))'
                    : 'var(--pw-wood-dark)',
                color: tab === t.id ? 'var(--pw-accent)' : 'var(--pw-text-secondary)',
                borderBottom: tab === t.id ? '2px solid var(--pw-accent)' : '2px solid transparent',
              }}
              onClick={() => {
                store.activePanelTab.value = t.id;
              }}
            >
              <span class="block text-sm">{t.icon}</span>
              <span class="block">{t.label}</span>
            </button>
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
