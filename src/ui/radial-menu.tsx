/**
 * Radial Action Menu (v3.0 — US9)
 *
 * Contextual circular menu that appears on tap:
 * - Tap Lodge -> Train Gatherer, Train Fighter, Train Medic, Train Scout, Fortify, Repair
 * - Tap selected unit -> role-specific actions (Gather, Attack, Heal, Scout, Hold, Patrol)
 *
 * Design: vine frame, gritty gold icons, wood background, 44px min touch targets.
 * Auto-dismisses after 3 seconds if no selection.
 */

import { useEffect, useRef } from 'preact/hooks';
import type { RadialMenuMode, RadialOption } from './radial-menu-options';
import { getRadialOptions } from './radial-menu-options';
import {
  radialMenuMode,
  radialMenuOpen,
  radialMenuUnitRole,
  radialMenuX,
  radialMenuY,
} from './store-radial';

export interface RadialMenuProps {
  onAction: (actionId: string) => void;
}

const RADIUS = 80;
const AUTO_DISMISS_MS = 3000;
const ITEM_SIZE = 52; // 52px > 44px minimum touch target

function closeMenu() {
  radialMenuOpen.value = false;
}

export function RadialMenu({ onAction }: RadialMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(
    0 as unknown as ReturnType<typeof setTimeout>,
  );

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (radialMenuOpen.value) {
      timerRef.current = setTimeout(closeMenu, AUTO_DISMISS_MS);
      return () => clearTimeout(timerRef.current);
    }
  }, [radialMenuOpen.value]);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!radialMenuOpen.value) return null;

  const mode = radialMenuMode.value;
  const role = radialMenuUnitRole.value;
  const options = getRadialOptions(mode, role);

  // Clamp menu center to viewport bounds
  const margin = RADIUS + ITEM_SIZE;
  const cx = Math.max(margin, Math.min(window.innerWidth - margin, radialMenuX.value));
  const cy = Math.max(margin, Math.min(window.innerHeight - margin, radialMenuY.value));

  function handleOverlayClick(e: MouseEvent | TouchEvent) {
    if (e.target === overlayRef.current) closeMenu();
  }

  function handleOptionClick(opt: RadialOption, e: MouseEvent) {
    e.stopPropagation();
    if (opt.disabled) return;
    clearTimeout(timerRef.current);
    onAction(opt.id);
    closeMenu();
  }

  return (
    <div
      ref={overlayRef}
      class="fixed inset-0 z-40"
      style={{ background: 'var(--pw-overlay-light)' }}
      onClick={handleOverlayClick}
      onTouchEnd={handleOverlayClick}
    >
      <div
        class="absolute"
        style={{
          left: `${cx}px`,
          top: `${cy}px`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Center hub label */}
        <div
          class="absolute w-14 h-14 rounded-full flex items-center justify-center z-50 shadow-lg stone-node"
          style={{ left: '-28px', top: '-28px' }}
        >
          <span
            class="font-heading font-bold text-[10px] text-center leading-tight"
            style={{ color: 'var(--pw-warning)' }}
          >
            {mode === 'lodge' ? 'Lodge' : (role ?? 'Unit')}
          </span>
        </div>

        {/* Radial options */}
        {options.map((opt, i) => {
          const angle = (i / options.length) * Math.PI * 2 - Math.PI / 2;
          const ox = Math.cos(angle) * RADIUS;
          const oy = Math.sin(angle) * RADIUS;

          return (
            <button
              type="button"
              key={opt.id}
              class={`absolute rounded-full stone-node flex flex-col items-center justify-center cursor-pointer transition-all duration-150 shadow-lg z-50 ${opt.disabled ? 'opacity-40' : ''}`}
              style={{
                width: `${ITEM_SIZE}px`,
                height: `${ITEM_SIZE}px`,
                left: `${ox - ITEM_SIZE / 2}px`,
                top: `${oy - ITEM_SIZE / 2}px`,
                animation: `radial-sprout ${100 + i * 50}ms ease-out both`,
                borderColor: opt.disabled
                  ? 'var(--pw-border)'
                  : `var(--pw-${opt.color ?? 'success'})`,
                color: opt.disabled
                  ? 'var(--pw-text-muted)'
                  : `var(--pw-${opt.color ?? 'success'})`,
              }}
              title={opt.tooltip}
              disabled={opt.disabled}
              onClick={(e) => handleOptionClick(opt, e as unknown as MouseEvent)}
            >
              <span class="text-lg leading-none">{opt.icon}</span>
              <span class="font-heading text-[9px] font-bold leading-tight">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
