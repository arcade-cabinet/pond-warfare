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
  colorClass: string;
  borderColor: string;
  hoverColor: string;
  activeColor: string;
  toggleSignal?: typeof autoGatherEnabled;
  action?: () => void;
}

const RADIUS = 72;

const OPTIONS: RadialOption[] = [
  {
    label: 'Gather',
    angle: 270,
    colorClass: 'text-amber-300',
    borderColor: 'border-amber-500',
    hoverColor: 'hover:bg-amber-900',
    activeColor: 'bg-amber-800',
    toggleSignal: autoGatherEnabled,
  },
  {
    label: 'Defend',
    angle: 0,
    colorClass: 'text-sky-300',
    borderColor: 'border-sky-500',
    hoverColor: 'hover:bg-sky-900',
    activeColor: 'bg-sky-800',
    toggleSignal: autoDefendEnabled,
  },
  {
    label: 'Attack',
    angle: 90,
    colorClass: 'text-red-300',
    borderColor: 'border-red-500',
    hoverColor: 'hover:bg-red-900',
    activeColor: 'bg-red-800',
    toggleSignal: autoAttackEnabled,
  },
  {
    label: 'Select',
    angle: 180,
    colorClass: 'text-green-300',
    borderColor: 'border-green-500',
    hoverColor: 'hover:bg-green-900',
    activeColor: 'bg-green-800',
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

  const cx = radialMenuX.value;
  const cy = radialMenuY.value;

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
      class="fixed inset-0 z-40 bg-black/40"
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
        <div class="absolute w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-500 flex items-center justify-center z-50 shadow-lg" style={{ left: '-24px', top: '-24px' }}>
          <span class="text-amber-400 font-bold text-sm">{idleWorkerCount.value}</span>
        </div>

        {/* Radial options */}
        {OPTIONS.map((opt) => {
          const rad = ((opt.angle - 90) * Math.PI) / 180;
          const x = Math.cos(rad) * RADIUS;
          const y = Math.sin(rad) * RADIUS;
          const isToggle = !!opt.toggleSignal;
          const isActive = isToggle && opt.toggleSignal!.value;

          return (
            <button
              key={opt.label}
              type="button"
              class={[
                'absolute w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 shadow-lg z-50',
                opt.borderColor,
                isActive ? opt.activeColor : 'bg-slate-700',
                opt.hoverColor,
                opt.colorClass,
              ].join(' ')}
              style={{
                left: `${x - 28}px`,
                top: `${y - 28}px`,
                animation: 'radial-sprout 150ms ease-out both',
                animationDelay: `${OPTIONS.indexOf(opt) * 30}ms`,
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
                  class={[
                    'w-2.5 h-2.5 rounded-full border mb-0.5',
                    isActive
                      ? `${opt.borderColor} bg-current`
                      : `${opt.borderColor} bg-transparent`,
                  ].join(' ')}
                />
              )}
              <span class="text-[10px] font-bold leading-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Keyframe animation injected via style tag */}
      <style>{`
        @keyframes radial-sprout {
          from {
            opacity: 0;
            transform: scale(0.3);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
