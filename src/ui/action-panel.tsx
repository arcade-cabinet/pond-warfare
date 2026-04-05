/**
 * Action Panel — Context-sensitive Train/Build/Tech tabs with action buttons,
 * training queue, hotkey badges, and cost tooltips.
 */

import { signal } from '@preact/signals';
import { audio } from '@/audio/audio-system';
import { screenClass } from '@/platform';
import * as store from './store';

/** Action button category for tab filtering. */
export type ActionCategory = 'train' | 'build' | 'tech';

/**
 * An action button definition pushed by the game orchestrator.
 */
export interface ActionButtonDef {
  title: string;
  cost: string;
  hotkey: string;
  affordable: boolean;
  description?: string;
  category: ActionCategory;
  onClick: () => void;
  /** Individual resource costs for detailed tooltip breakdown */
  costBreakdown?: { fish?: number; logs?: number; rocks?: number; food?: number };
  /** Tech requirement label, e.g. "Requires: Eagle Eye" */
  requires?: string;
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
      costBreakdown: def.costBreakdown,
      requires: def.requires,
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
      aria-label={`${def.title}, costs ${def.cost}${def.requires ? `, ${def.requires}` : ''}`}
      class={`action-btn relative flex flex-col items-center justify-center p-1 md:p-2 rounded text-[10px] md:text-xs font-bold shadow-md min-w-[44px] min-h-[44px] ${
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
      <span class="font-heading">{def.title}</span>
      <span
        class="font-numbers font-normal text-[8px] md:text-[10px] mt-1 whitespace-pre-line"
        style={{ color: 'var(--pw-clam)' }}
      >
        {def.cost}
      </span>
    </button>
  );
}

function QueueDisplay() {
  const items = queueItems.value;
  if (items.length === 0) return null;

  return (
    <div
      class="col-span-2 mt-1 flex flex-col gap-1 pt-1"
      style={{ borderTop: '1px solid var(--pw-border)' }}
    >
      <span
        class="font-heading text-[10px] uppercase tracking-wider"
        style={{ color: 'var(--pw-accent)' }}
      >
        Queue (Click to Cancel)
      </span>
      <div class="flex gap-2 flex-wrap">
        {items.map((item, i) => (
          <button
            type="button"
            key={`q-${i}`}
            aria-label={`Cancel ${item.label}, ${Math.round(item.progressPct)}% complete`}
            class="relative w-8 h-8 min-w-[44px] min-h-[44px] rounded cursor-pointer overflow-hidden transition-colors stone-node"
            onClick={(e) => {
              e.stopPropagation();
              item.onCancel();
            }}
          >
            <div
              class="absolute bottom-0 left-0 w-full transition-all duration-75"
              style={{
                height: `${item.progressPct}%`,
                background: 'var(--pw-success)',
                opacity: 0.6,
              }}
            />
            <span class="absolute inset-0 flex items-center justify-center text-xs font-numbers font-bold text-white z-10 shadow-sm">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const TAB_ICONS: Record<ActionCategory, string> = {
  train: '\u2694', // crossed swords
  build: '\u{1F3D7}', // building construction
  tech: '\u{1F4DC}', // scroll
};

const TAB_LABELS: Record<ActionCategory, string> = {
  train: 'Train',
  build: 'Build',
  tech: 'Tech',
};

function TabButton({
  tab,
  active,
  count,
  onClick,
}: {
  tab: ActionCategory;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-label={`${TAB_LABELS[tab]} tab, ${count} actions`}
      aria-selected={active}
      class={`flex-1 py-1 px-1 text-[10px] md:text-xs font-bold cursor-pointer transition-colors min-h-[44px] md:min-h-0 font-heading`}
      style={{
        background: active ? 'var(--pw-glow-accent-08)' : 'transparent',
        color: active
          ? 'var(--pw-accent)'
          : count > 0
            ? 'var(--pw-text-secondary)'
            : 'var(--pw-text-muted)',
        borderBottom: active ? '2px solid var(--pw-accent)' : '2px solid transparent',
        borderRadius: active ? '6px 6px 0 0' : '0',
      }}
      onClick={onClick}
      disabled={count === 0}
    >
      <span class="mr-0.5">{TAB_ICONS[tab]}</span>
      {screenClass.value !== 'compact' && <span>{TAB_LABELS[tab]}</span>}
      {count > 0 && (
        <span class="ml-0.5 text-[8px] md:text-[9px]" style={{ color: 'var(--pw-text-muted)' }}>
          ({count})
        </span>
      )}
    </button>
  );
}

export function ActionPanel() {
  const buttons = actionButtons.value;
  const tab = store.activeActionTab.value;

  // Filter buttons by category
  const trainButtons = buttons.filter((b) => b.category === 'train');
  const buildButtons = buttons.filter((b) => b.category === 'build');
  const techButtons = buttons.filter((b) => b.category === 'tech');

  const currentButtons =
    tab === 'train' ? trainButtons : tab === 'build' ? buildButtons : techButtons;

  // Auto-select a tab that has content if the current tab is empty
  const effectiveTab = (() => {
    if (currentButtons.length > 0) return tab;
    if (trainButtons.length > 0) return 'train' as const;
    if (buildButtons.length > 0) return 'build' as const;
    if (techButtons.length > 0) return 'tech' as const;
    return tab;
  })();

  const effectiveButtons =
    effectiveTab === 'train' ? trainButtons : effectiveTab === 'build' ? buildButtons : techButtons;

  // Sync the signal if we auto-switched
  if (effectiveTab !== tab) {
    store.activeActionTab.value = effectiveTab;
  }

  return (
    <div
      id="action-panel"
      class="w-full flex-1 flex flex-col overflow-hidden"
      style={{
        background: 'var(--pw-surface-panel-60)',
      }}
    >
      {/* Tab bar */}
      {buttons.length > 0 && (
        <div
          class="flex flex-shrink-0"
          role="tablist"
          aria-label="Action categories"
          style={{ borderBottom: `1px solid var(--pw-glow-accent-12)` }}
        >
          <TabButton
            tab="train"
            active={effectiveTab === 'train'}
            count={trainButtons.length}
            onClick={() => {
              store.activeActionTab.value = 'train';
              audio.tabSwitch();
            }}
          />
          <TabButton
            tab="build"
            active={effectiveTab === 'build'}
            count={buildButtons.length}
            onClick={() => {
              store.activeActionTab.value = 'build';
              audio.tabSwitch();
            }}
          />
          <TabButton
            tab="tech"
            active={effectiveTab === 'tech'}
            count={techButtons.length}
            onClick={() => {
              store.activeActionTab.value = 'tech';
              audio.tabSwitch();
            }}
          />
        </div>
      )}

      {/* Tab content */}
      <div class="flex-1 overflow-y-auto p-1 md:p-2">
        <div class="grid grid-cols-2 gap-1 md:gap-2 content-start">
          {effectiveButtons.map((def, i) => (
            <ActionButton key={`${def.title}-${i}`} def={def} index={i} />
          ))}
        </div>

        {/* Training queue - show under Train tab */}
        {effectiveTab === 'train' && <QueueDisplay />}
      </div>

      {/* Empty state */}
      {buttons.length === 0 && (
        <div class="flex-1 flex items-center justify-center p-2">
          <span class="font-game text-xs italic" style={{ color: 'var(--pw-text-muted)' }}>
            No actions available
          </span>
        </div>
      )}
    </div>
  );
}
