/**
 * Selection Info Panel
 *
 * Single unit: portrait canvas, name, HP bar (color-coded green/yellow/red),
 * stats (HP, Dmg, Kills, Range), status text.
 * Multi-unit: squad count, composition breakdown, mini sprite grid (max 12 shown).
 * Resource: amount remaining, description.
 * No selection: compact overview with idle Mudpaws, army count, population.
 */

import { screenClass } from '@/platform';
import {
  armyCount,
  attackMoveActive,
  hasPlayerUnits,
  hpBarColor,
  hpPercent,
  idleGeneralistCount,
  selectionComposition,
  selectionCount,
  selectionDesc,
  selectionIsMulti,
  selectionKills,
  selectionName,
  selectionNameColor,
  selectionShowHpBar,
  selectionSpriteData,
  selectionStatsHtml,
} from './store';

const PANEL_BG_STYLE = {
  background: 'linear-gradient(180deg, var(--pw-bg-surface) 0%, var(--pw-bg-deep) 100%)',
  borderColor: 'var(--pw-border)',
} as const;

const STATS_TEXT_STYLE = { color: 'var(--pw-text-secondary)' } as const;
const MUTED_TEXT_STYLE = { color: 'var(--pw-text-muted)' } as const;

const PORTRAIT_STYLE = {
  background: 'var(--pw-bg-surface)',
  border: '2px solid var(--pw-border)',
  boxShadow: `inset 0 0 8px var(--pw-shadow-medium), 0 0 4px var(--pw-glow-accent-10)`,
} as const;

const KILL_BADGE_STYLE = {
  background: 'linear-gradient(135deg, var(--pw-enemy), #801818)',
  border: '1px solid var(--pw-enemy-light)',
} as const;

const AMOVE_BTN_STYLE = { border: '1px solid var(--pw-twig)', color: 'var(--pw-otter)' } as const;
const STOP_BTN_STYLE = {
  border: '1px solid var(--pw-border)',
  color: 'var(--pw-text-secondary)',
} as const;

export interface SelectionPanelProps {
  onDeselect?: () => void;
  onIdleGeneralistClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
}

export function SelectionPanel({
  onDeselect,
  onIdleGeneralistClick,
  onArmyClick,
  onAttackMoveClick,
  onHaltClick,
}: SelectionPanelProps) {
  const count = selectionCount.value;
  const showHp = selectionShowHpBar.value;
  const mobile = screenClass.value === 'compact';

  return (
    <div
      id="selection-info"
      class="w-full flex-shrink-0 p-2 border-b-2 flex flex-col gap-1 overflow-y-auto relative"
      style={PANEL_BG_STYLE}
    >
      {/* Deselect button */}
      {count > 0 && onDeselect && (
        <button
          type="button"
          aria-label="Clear selection"
          class="absolute top-1 right-1 rounded-full w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer text-xs font-bold z-10 transition-colors hud-btn"
          title="Clear selection (Esc)"
          onClick={(e) => {
            e.stopPropagation();
            onDeselect();
          }}
        >
          X
        </button>
      )}

      {/* No selection: basic counts */}
      {count === 0 && (
        <div class="flex gap-3 items-center font-game text-xs" style={MUTED_TEXT_STYLE}>
          <button
            type="button"
            aria-label={`Select idle Mudpaw, ${idleGeneralistCount.value} idle`}
            class="cursor-pointer min-h-[44px] px-2"
            onClick={() => onIdleGeneralistClick?.()}
          >
            Idle Mudpaws: {idleGeneralistCount.value}
          </button>
          <button
            type="button"
            aria-label={`Select army, ${armyCount.value} units`}
            class="cursor-pointer min-h-[44px] px-2"
            onClick={() => onArmyClick?.()}
          >
            Army: {armyCount.value}
          </button>
        </div>
      )}

      {/* Mobile command buttons (A-Move / Stop) */}
      {mobile && count > 0 && hasPlayerUnits.value && (
        <div class="flex gap-1">
          {!attackMoveActive.value && (
            <button
              type="button"
              aria-label="Attack-move selected units"
              class="px-2 py-1 rounded text-[10px] font-bold cursor-pointer min-h-[44px]"
              style={AMOVE_BTN_STYLE}
              onClick={(e) => {
                e.stopPropagation();
                onAttackMoveClick?.();
              }}
            >
              A-Move
            </button>
          )}
          <button
            type="button"
            aria-label="Stop selected units"
            class="px-2 py-1 rounded text-[10px] font-bold cursor-pointer min-h-[44px]"
            style={STOP_BTN_STYLE}
            onClick={(e) => {
              e.stopPropagation();
              onHaltClick?.();
            }}
          >
            Stop
          </button>
        </div>
      )}

      {/* Has selection */}
      {count > 0 && (
        <div class="flex flex-col sm:flex-row gap-2 md:gap-2 items-start">
          {/* Portrait (single selection only) */}
          {!selectionIsMulti.value && selectionSpriteData.value && (
            <div class="relative flex-shrink-0">
              <img
                src={selectionSpriteData.value}
                alt="portrait"
                class="rounded-sm shadow-inner w-12 h-12 md:w-14 md:h-14 render-pixelated cursor-pointer transition-colors"
                style={PORTRAIT_STYLE}
                title="Click to track unit"
              />
              {selectionKills.value > 0 && (
                <span
                  class="absolute -top-1 -right-1 text-white text-[9px] md:text-[10px] font-numbers font-bold rounded-full px-1 leading-tight"
                  style={KILL_BADGE_STYLE}
                >
                  {selectionKills.value}
                </span>
              )}
            </div>
          )}

          <div class="flex-1 w-full">
            <h2 class={`font-heading text-sm md:text-lg leading-tight ${selectionNameColor.value}`}>
              {selectionName}
            </h2>
            {showHp && (
              <div class="w-full h-2.5 md:h-3 mt-1 hp-bar-track rounded-sm overflow-hidden">
                <div
                  class="h-full transition-all duration-200 rounded-sm"
                  style={{
                    width: `${hpPercent.value}%`,
                    background: hpBarColor.value,
                    boxShadow: `0 0 4px ${hpBarColor.value}40`,
                  }}
                />
              </div>
            )}
            <div
              id="sel-stats"
              class="font-numbers text-[10px] md:text-xs mt-0.5"
              style={STATS_TEXT_STYLE}
            >
              {selectionStatsHtml}
            </div>
            <p class="font-game text-[10px] md:text-xs leading-tight" style={MUTED_TEXT_STYLE}>
              {selectionDesc}
            </p>
            {selectionIsMulti.value && (
              <p
                class="font-game text-[10px] md:text-xs leading-tight mt-0.5"
                style={MUTED_TEXT_STYLE}
              >
                {selectionComposition}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
