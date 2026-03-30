/**
 * CommandPanel — Slide-out panel with four tabs: Map, Actions, Commands, Menu.
 *
 * Slides in from the right edge. Contains all game UI — no top bar or
 * floating DOM elements exist outside this panel (except the hamburger button).
 */

import type { PanelTab } from '../store';
import * as store from '../store';
import { ActionsTab } from './ActionsTab';
import { CommandsTab } from './CommandsTab';
import { MapTab } from './MapTab';
import { MenuTab } from './MenuTab';

const TABS: { id: PanelTab; icon: string; label: string }[] = [
  { id: 'map', icon: '\uD83D\uDDFA', label: 'Map' },
  { id: 'actions', icon: '\u2694', label: 'Act' },
  { id: 'commands', icon: '\uD83D\uDEE1', label: 'Cmd' },
  { id: 'menu', icon: '\u2699', label: 'Menu' },
];

export interface CommandPanelProps {
  minimapCanvasRef: preact.RefObject<HTMLCanvasElement>;
  minimapCamRef: preact.RefObject<HTMLDivElement>;
}

export function CommandPanel({ minimapCanvasRef, minimapCamRef }: CommandPanelProps) {
  const open = store.mobilePanelOpen.value;
  const tab = store.activePanelTab.value;

  return (
    <>
      {/* Panel */}
      <div
        class={`absolute top-0 right-0 h-full z-40 flex flex-col transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: 'min(280px, 50vw)',
          background: 'linear-gradient(180deg, var(--pw-wood-mid), var(--pw-wood-dark))',
          borderLeft: '3px solid var(--pw-border)',
          boxShadow: open ? '-4px 0 20px rgba(0,0,0,0.5)' : 'none',
        }}
      >
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
          {tab === 'actions' && <ActionsTab />}
          {tab === 'commands' && <CommandsTab />}
          {tab === 'menu' && <MenuTab />}
        </div>
      </div>

      {/* Dim overlay */}
      {open && (
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
