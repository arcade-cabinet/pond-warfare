/**
 * Radial Menu Component
 *
 * A circular context menu that appears when clicking the idle units button.
 * Provides auto-behavior toggles (Gather, Defend, Attack) and a Select All action.
 * Each option is arranged radially around a central hub showing the idle unit count.
 */

import { useEffect, useRef } from 'preact/hooks';
import {
  autoAttackEnabled,
  autoDefendEnabled,
  autoGatherEnabled,
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
  toggleSignal?: typeof autoGatherEnabled;
  action?: () => void;
}

const RADIUS = 72;

const OPTIONS: RadialOption[] = [
  {
    label: 'Gather',
    angle: 288,
    color: 'var(--pw-warning)',
    borderColor: 'var(--pw-warning)',
    activeBackground: 'rgba(232, 160, 48, 0.3)',
    toggleSignal: autoGatherEnabled,
  },
  {
    label: 'Defend',
    angle: 0,
    color: 'var(--pw-accent)',
    borderColor: 'var(--pw-accent)',
    activeBackground: 'rgba(64, 200, 208, 0.3)',
    toggleSignal: autoDefendEnabled,
  },
  {
    label: 'Attack',
    angle: 72,
    color: 'var(--pw-enemy-light)',
    borderColor: 'var(--pw-enemy-light)',
    activeBackground: 'rgba(224, 96, 96, 0.3)',
    toggleSignal: autoAttackEnabled,
  },
  {
    label: 'Scout',
    angle: 144,
    color: '#b090d8',
    borderColor: '#8a6ab8',
    activeBackground: 'rgba(138, 106, 184, 0.3)',
    toggleSignal: autoScoutEnabled,
  },
  {
    label: 'Select',
    angle: 216,
    color: 'var(--pw-success)',
    borderColor: 'var(--pw-success)',
    activeBackground: 'rgba(64, 184, 104, 0.3)',
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
    if (opt.toggleSignal) {
      opt.toggleSignal.value = !opt.toggleSignal.value;
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
      style={{ background: 'rgba(12, 26, 31, 0.5)' }}
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
          class="absolute w-12 h-12 rounded-full flex items-center justify-center z-50 shadow-lg"
          style={{
            left: '-24px',
            top: '-24px',
            background: 'var(--pw-bg-surface)',
            border: '2px solid var(--pw-border)',
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
              class="absolute w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 shadow-lg z-50"
              style={{
                left: `${x - 28}px`,
                top: `${y - 28}px`,
                animation: 'radial-sprout 150ms ease-out both',
                animationDelay: `${optIndex * 30}ms`,
                borderColor: opt.borderColor,
                background: isActive ? opt.activeBackground : 'var(--pw-bg-elevated)',
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
