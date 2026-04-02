/**
 * Radial Menu Component
 *
 * A circular context menu that appears when clicking the idle units button.
 * Provides auto-behavior toggles (Gather, Defend, Attack) and a Select All action.
 * Each option is arranged radially around a central hub showing the idle unit count.
 */

import { useEffect, useRef } from 'preact/hooks';
import { toggleAutoBehavior } from './game-actions';
import {
  autoCombatEnabled,
  autoGathererEnabled,
  autoScoutEnabled,
  idleWorkerCount,
  radialMenuOpen,
  radialMenuX,
  radialMenuY,
} from './store';

export interface RadialMenuProps {
  onSelectAll: () => void;
}

interface RadialOption {
  label: string;
  /** Angle in degrees: 0=top, 90=right, 180=bottom, 270=left */
  angle: number;
  color: string;
  borderColor: string;
  activeBackground: string;
  /** Role key for auto-behavior toggle (updates both store + world). */
  behaviorRole?: 'gatherer' | 'combat' | 'healer' | 'scout';
  /** Signal used to read the current toggle state for display only. */
  toggleSignal?: typeof autoGathererEnabled;
  action?: () => void;
}

const RADIUS = 72;

const OPTIONS: RadialOption[] = [
  {
    label: 'Gather',
    angle: 288,
    color: 'var(--pw-warning)',
    borderColor: 'var(--pw-warning)',
    activeBackground: 'var(--pw-auto-warning-bg)',
    behaviorRole: 'gatherer',
    toggleSignal: autoGathererEnabled,
  },
  {
    label: 'Combat',
    angle: 36,
    color: 'var(--pw-enemy-light)',
    borderColor: 'var(--pw-enemy-light)',
    activeBackground: 'var(--pw-auto-enemy-bg)',
    behaviorRole: 'combat',
    toggleSignal: autoCombatEnabled,
  },
  {
    label: 'Scout',
    angle: 108,
    color: 'var(--pw-scout)',
    borderColor: 'var(--pw-scout-dark)',
    activeBackground: 'var(--pw-auto-scout-bg)',
    behaviorRole: 'scout',
    toggleSignal: autoScoutEnabled,
  },
  {
    label: 'Select',
    angle: 180,
    color: 'var(--pw-success)',
    borderColor: 'var(--pw-success)',
    activeBackground: 'var(--pw-auto-success-bg)',
  },
];

function closeMenu() {
  radialMenuOpen.value = false;
}

export function RadialMenu({ onSelectAll }: RadialMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMenu();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!radialMenuOpen.value) return null;

  // Clamp menu center to viewport bounds so options don't overflow off-screen
  const margin = RADIUS + 28; // RADIUS + half button size
  const cx = Math.max(margin, Math.min(window.innerWidth - margin, radialMenuX.value));
  const cy = Math.max(margin, Math.min(window.innerHeight - margin, radialMenuY.value));

  function handleOverlayClick(e: MouseEvent | TouchEvent) {
    // Close if the click target is the overlay itself (not a menu button)
    if (e.target === overlayRef.current) {
      closeMenu();
    }
  }

  function handleOptionClick(opt: RadialOption) {
    if (opt.behaviorRole) {
      toggleAutoBehavior(opt.behaviorRole);
    } else if (opt.label === 'Select') {
      onSelectAll();
      closeMenu();
    }
    if (opt.action) {
      opt.action();
    }
  }

  return (
    <div
      ref={overlayRef}
      class="fixed inset-0 z-40"
      style={{ background: 'var(--pw-overlay-light)' }}
      onClick={handleOverlayClick}
      onTouchEnd={handleOverlayClick}
    >
      {/* Menu container positioned at the button */}
      <div
        ref={menuRef}
        class="absolute"
        style={{
          left: `${cx}px`,
          top: `${cy}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Center hub */}
        <div
          class="absolute w-12 h-12 rounded-full flex items-center justify-center z-50 shadow-lg stone-node"
          style={{
            left: '-24px',
            top: '-24px',
          }}
        >
          <span class="font-numbers font-bold text-sm" style={{ color: 'var(--pw-warning)' }}>
            {idleWorkerCount.value}
          </span>
        </div>

        {/* Radial options */}
        {OPTIONS.map((opt, optIndex) => {
          const rad = ((opt.angle - 90) * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          const isToggle = !!opt.toggleSignal;
          const isActive = isToggle && opt.toggleSignal?.value;

          return (
            <button
              key={opt.label}
              type="button"
              class="absolute w-14 h-14 rounded-full stone-node flex flex-col items-center justify-center cursor-pointer transition-all duration-150 shadow-lg z-50"
              style={{
                left: `${x - 28}px`,
                top: `${y - 28}px`,
                animation: 'radial-sprout 150ms ease-out both',
                animationDelay: `${optIndex * 30}ms`,
                borderColor: opt.borderColor,
                background: isActive ? opt.activeBackground : undefined,
                color: opt.color,
              }}
              title={opt.label}
              onClick={(e) => {
                e.stopPropagation();
                handleOptionClick(opt);
              }}
            >
              {/* Toggle indicator for auto-behavior options */}
              {isToggle && (
                <span
                  class="w-2.5 h-2.5 rounded-full mb-0.5"
                  style={{
                    border: `1px solid ${opt.borderColor}`,
                    background: isActive ? opt.color : 'transparent',
                  }}
                />
              )}
              <span class="font-heading text-[10px] font-bold leading-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
