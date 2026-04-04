/**
 * Keyboard Reference Overlay
 *
 * Modal overlay showing all keyboard shortcuts in a 3-column grid.
 * Accessible via the "?" button in the HUD top bar.
 * Styled with Frame9Slice and font-game classes.
 */

import { screenClass } from '@/platform';
import { Frame9Slice } from './components/frame';
import { useScrollDrag } from './hooks/useScrollDrag';

interface ShortcutEntry {
  keys: string;
  label: string;
}

interface ShortcutGroup {
  title: string;
  entries: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Camera',
    entries: [
      { keys: 'WASD', label: 'Pan camera' },
      { keys: 'Space', label: 'Center on selection' },
    ],
  },
  {
    title: 'Selection',
    entries: [
      { keys: 'Click', label: 'Select unit' },
      { keys: 'Drag', label: 'Box select' },
      { keys: 'Dbl-click', label: 'Select all of type' },
    ],
  },
  {
    title: 'Commands',
    entries: [
      { keys: 'A', label: 'Attack-move' },
      { keys: 'H', label: 'Halt / Stop' },
      { keys: 'V', label: 'Cycle stance' },
      { keys: 'Esc', label: 'Cancel action' },
    ],
  },
  {
    title: 'Groups',
    entries: [
      { keys: 'Ctrl+1-9', label: 'Save group' },
      { keys: '1-9', label: 'Recall group' },
      { keys: '.', label: 'Select idle workers' },
      { keys: ',', label: 'Select army' },
      { keys: 'Tab', label: 'Cycle buildings' },
    ],
  },
  {
    title: 'Game',
    entries: [
      { keys: 'F', label: 'Cycle speed' },
      { keys: 'M', label: 'Mute audio' },
      { keys: 'P', label: 'Pause' },
      { keys: 'F12', label: 'FPS counter' },
    ],
  },
  {
    title: 'Actions',
    entries: [
      { keys: 'Q', label: 'Slot 1 / Commander' },
      { keys: 'W', label: 'Slot 2' },
      { keys: 'E', label: 'Slot 3' },
      { keys: 'R', label: 'Slot 4' },
      { keys: 'T', label: 'Slot 5' },
      { keys: 'Y', label: 'Slot 6' },
    ],
  },
  {
    title: 'Abilities',
    entries: [
      { keys: 'B', label: 'Shadow Sprint' },
      { keys: 'G', label: 'Pond Blessing' },
      { keys: 'N', label: 'Tidal Surge' },
    ],
  },
];

function ShortcutColumn({ group }: { group: ShortcutGroup }) {
  return (
    <div class="flex flex-col gap-1">
      <div class="section-header text-[10px] mb-1">{group.title}</div>
      {group.entries.map((entry) => (
        <div key={entry.keys} class="flex items-center gap-2 text-xs">
          <kbd
            class="font-numbers font-bold text-[10px] px-1.5 py-0.5 rounded min-w-[48px] text-center"
            style={{
              background: 'var(--pw-wood-dark)',
              border: '1px solid var(--pw-border)',
              color: 'var(--pw-accent)',
            }}
          >
            {entry.keys}
          </kbd>
          <span class="font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            {entry.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface KeyboardReferenceProps {
  onClose: () => void;
}

export function KeyboardReference({ onClose }: KeyboardReferenceProps) {
  const scrollRef = useScrollDrag<HTMLDivElement>();
  return (
    <div class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay">
      {/* Backdrop */}
      <div
        class="absolute inset-0"
        style={{ background: 'var(--pw-overlay-medium)' }}
        onClick={onClose}
        role="presentation"
      />

      {/* Panel card */}
      <div
        ref={scrollRef}
        class="relative w-[520px] max-w-[95vw] modal-scroll font-game text-sm z-10"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <Frame9Slice title="KEYBOARD REFERENCE">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={onClose}
              title="Close"
            >
              {'\u2715'}
            </button>

            {/* 3-column grid of shortcut groups */}
            <div
              class={`grid gap-4 ${screenClass.value === 'compact' ? 'grid-cols-2' : 'grid-cols-3'}`}
            >
              {SHORTCUT_GROUPS.map((group) => (
                <ShortcutColumn key={group.title} group={group} />
              ))}
            </div>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
