/**
 * Radial Action Menu (v3.0 -- US9)
 *
 * Contextual circular menu that appears on tap:
 * - Tap Lodge -> Train Gatherer, Train Fighter, Train Medic, Train Scout, Fortify, Repair
 * - Tap selected unit -> role-specific actions (Gather, Attack, Heal, Scout, Hold, Patrol)
 *
 * Design bible: vine-frame popup, gritty gold icons, wood plank button backgrounds,
 * design token colors from design-tokens.ts.
 * Auto-dismisses after 8 seconds if no selection.
 */

import { useEffect, useRef } from 'preact/hooks';
import { COLORS } from '@/ui/design-tokens';
import type { RadialGameState, RadialOption } from './radial-menu-options';
import { getRadialOptions } from './radial-menu-options';
import { clams, pearls, twigs } from './store';
import { progressionLevel } from './store-v3';
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
const AUTO_DISMISS_MS = 8000;
const ITEM_SIZE = 52; // 52px > 44px minimum touch target

function closeMenu() {
  radialMenuOpen.value = false;
}

/**
 * Inline SVG vine frame ring rendered behind the radial items.
 * Gives the popup the organic, overgrown feel from the design bible.
 */
function VineFrameRing({ r }: { r: number }) {
  const d = r * 2 + ITEM_SIZE;
  const c = d / 2;
  return (
    <svg
      class="absolute pointer-events-none"
      width={d}
      height={d}
      style={{ left: `${-d / 2}px`, top: `${-d / 2}px` }}
      aria-hidden="true"
    >
      {/* Thick vine stroke */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={COLORS.vineBase}
        strokeWidth="8"
        opacity="0.6"
      />
      {/* Thin highlight overlay */}
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={COLORS.vineHighlight}
        strokeWidth="3"
        opacity="0.4"
      />
      {/* Dark inner fill for the hub area */}
      <circle cx={c} cy={c} r={28} fill={COLORS.bgPanel} stroke={COLORS.woodDark} strokeWidth="2" />
    </svg>
  );
}

export function RadialMenu({ onAction }: RadialMenuProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(
    0 as unknown as ReturnType<typeof setTimeout>,
  );

  // Auto-dismiss safety timeout
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
  const gameState: RadialGameState = {
    fish: clams.value,
    rocks: pearls.value,
    logs: twigs.value,
    unlockStage: Math.min(6, Math.floor(progressionLevel.value / 10) + 1),
    lodgeDamaged: false, // TODO: read from Lodge HP signal
  };
  const options = getRadialOptions(mode, role, gameState);

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
      role="menu"
      aria-label={`${mode === 'lodge' ? 'Lodge' : 'Unit'} actions`}
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
        {/* Vine frame ring */}
        <VineFrameRing r={RADIUS} />

        {/* Center hub label */}
        <div
          class="absolute w-14 h-14 rounded-full flex items-center justify-center z-50"
          style={{
            left: '-28px',
            top: '-28px',
            background: COLORS.bgPanel,
            border: `2px solid ${COLORS.woodDark}`,
            boxShadow: `0 0 12px rgba(0,0,0,0.8), inset 0 1px 0 rgba(139,105,20,0.1)`,
          }}
        >
          <span
            class="font-heading font-bold text-[10px] text-center leading-tight"
            style={{ color: COLORS.grittyGold }}
          >
            {mode === 'lodge' ? 'Lodge' : (role ?? 'Unit')}
          </span>
        </div>

        {/* Radial options -- wood plank button backgrounds */}
        {options.map((opt, i) => {
          const angle = (i / options.length) * Math.PI * 2 - Math.PI / 2;
          const ox = Math.cos(angle) * RADIUS;
          const oy = Math.sin(angle) * RADIUS;

          return (
            <button
              type="button"
              key={opt.id}
              role="menuitem"
              aria-label={opt.tooltip ?? opt.label}
              class={`absolute rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-150 z-50 ${opt.disabled ? 'opacity-40' : ''}`}
              style={{
                width: `${ITEM_SIZE}px`,
                height: `${ITEM_SIZE}px`,
                left: `${ox - ITEM_SIZE / 2}px`,
                top: `${oy - ITEM_SIZE / 2}px`,
                animation: `radial-sprout ${100 + i * 50}ms ease-out both`,
                background: `linear-gradient(145deg, ${COLORS.woodBase}, ${COLORS.woodDark})`,
                border: `2px solid ${opt.disabled ? COLORS.weatheredSteel : COLORS.goldDim}`,
                boxShadow: opt.disabled
                  ? 'none'
                  : `0 2px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(139,105,20,0.15)`,
                color: opt.disabled ? COLORS.weatheredSteel : COLORS.grittyGold,
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
