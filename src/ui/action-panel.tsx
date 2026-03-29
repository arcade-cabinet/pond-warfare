/**
 * Action Panel
 *
 * Context-sensitive action buttons. For gatherers: Burrow/Armory/Tower build
 * buttons with costs. For lodge: Gatherer train + Sturdy Mud + Swift Paws upgrades.
 * For armory: Brawler/Sniper train + Sharp Sticks + Eagle Eye. For military:
 * Attack Move, Halt. Training queue display with progress bars and cancel-on-click.
 * Each button has hotkey badge (Q/W/E/R or custom).
 */

import { signal } from '@preact/signals';
import * as store from './store';

/**
 * An action button definition pushed by the game orchestrator.
 */
export interface ActionButtonDef {
  title: string;
  cost: string;
  hotkey: string;
  affordable: boolean;
  description?: string;
  onClick: () => void;
}

/**
 * A training queue item.
 */
export interface QueueItemDef {
  label: string;
  progressPct: number;
  onCancel: () => void;
}

// Reactive state for action panel - set by the game orchestrator
export const actionButtons = signal<ActionButtonDef[]>([]);
export const queueItems = signal<QueueItemDef[]>([]);

function ActionButton({ def }: { def: ActionButtonDef; index: number }) {
  const showTooltip = (e: MouseEvent) => {
    store.tooltipData.value = {
      title: def.title,
      cost: def.cost,
      description: def.description ?? '',
      hotkey: def.hotkey,
    };
    // Clamp tooltip position to viewport with margins (estimate tooltip size ~200x100)
    const tooltipWidth = 200;
    const tooltipHeight = 100;
    const margin = 10;
    const rawX = e.clientX + 12;
    const rawY = e.clientY - 10;
    const maxX = window.innerWidth - tooltipWidth - margin;
    const maxY = window.innerHeight - tooltipHeight - margin;
    store.tooltipX.value = Math.min(Math.max(rawX, 0), maxX);
    store.tooltipY.value = Math.min(Math.max(rawY, 0), maxY);
    store.tooltipVisible.value = true;
  };

  const hideTooltip = () => {
    store.tooltipVisible.value = false;
    store.tooltipData.value = null;
  };

  return (
    <button
      type="button"
      class={`action-btn relative flex flex-col items-center justify-center p-1 md:p-2 rounded text-[10px] md:text-xs font-bold shadow-md ${
        !def.affordable ? 'opacity-50 grayscale cursor-not-allowed' : ''
      }`}
      disabled={!def.affordable}
      onClick={(e) => {
        e.stopPropagation();
        if (def.affordable) def.onClick();
      }}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      <span class="hotkey-badge">{def.hotkey}</span>
      <span>{def.title}</span>
      <span class="text-sky-200 font-normal text-[8px] md:text-[10px] mt-1 whitespace-pre-line">
        {def.cost}
      </span>
    </button>
  );
}

function QueueDisplay() {
  const items = queueItems.value;
  if (items.length === 0) return null;

  return (
    <div class="col-span-2 sm:col-span-3 mt-2 flex flex-col gap-1 border-t border-slate-600 pt-2">
      <span class="text-[10px] text-sky-200 uppercase tracking-wider">Queue (Click to Cancel)</span>
      <div class="flex gap-2 flex-wrap">
        {items.map((item, i) => (
          <button
            type="button"
            key={`q-${i}`}
            class="relative w-8 h-8 bg-slate-700 border border-slate-500 hover:border-red-500 rounded cursor-pointer overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              item.onCancel();
            }}
          >
            <div
              class="absolute bottom-0 left-0 w-full bg-green-600 transition-all duration-75"
              style={{ height: `${item.progressPct}%` }}
            />
            <span class="absolute inset-0 flex items-center justify-center text-xs font-bold text-white z-10 shadow-sm">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ActionPanel() {
  const buttons = actionButtons.value;

  return (
    <div
      id="action-panel"
      class="w-1/3 md:w-full h-full md:h-64 p-1 md:p-3 grid grid-cols-2 sm:grid-cols-3 gap-1 md:gap-2 bg-slate-800 overflow-y-auto content-start"
    >
      {buttons.map((def, i) => (
        <ActionButton key={`${def.title}-${i}`} def={def} index={i} />
      ))}
      <QueueDisplay />
    </div>
  );
}