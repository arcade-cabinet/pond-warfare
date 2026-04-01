/**
 * Selection Info Panel
 *
 * Single unit: portrait canvas, name, HP bar (color-coded green/yellow/red),
 * stats (HP, Dmg, Kills, Range), status text.
 * Multi-unit: squad count, composition breakdown, mini sprite grid (max 12 shown).
 * Resource: amount remaining, description.
 * No selection: compact overview with idle workers, army count, population.
 */

import { screenClass } from '@/platform';
import { CommandCenterOverview } from './command-center-overview';
import {
  attackMoveActive,
  hasPlayerUnits,
  hpBarColor,
  hpPercent,
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

export interface SelectionPanelProps {
  onDeselect?: () => void;
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
}

export function SelectionPanel({
  onDeselect,
  onIdleWorkerClick,
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
      style={{
        background: 'linear-gradient(180deg, var(--pw-bg-surface) 0%, var(--pw-bg-deep) 100%)',
        borderColor: 'var(--pw-border)',
      }}
    >
      {/* Deselect button */}
      {count > 0 && onDeselect && (
        <button
          type="button"
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

      {/* No selection: compact overview */}
      {count === 0 && (
        <CommandCenterOverview onIdleClick={onIdleWorkerClick} onArmyClick={onArmyClick} />
      )}

      {/* Mobile command buttons (A-Move / Stop) */}
      {mobile && count > 0 && hasPlayerUnits.value && (
        <div class="flex gap-1">
          {!attackMoveActive.value && (
            <button
              type="button"
              class="px-2 py-1 rounded text-[10px] font-bold cursor-pointer min-h-[44px]"
              style={{ border: '1px solid var(--pw-twig)', color: 'var(--pw-otter)' }}
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
            class="px-2 py-1 rounded text-[10px] font-bold cursor-pointer min-h-[44px]"
            style={{ border: '1px solid var(--pw-border)', color: 'var(--pw-text-secondary)' }}
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
                style={{
                  background: 'var(--pw-bg-surface)',
                  border: '2px solid var(--pw-border)',
                  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.5), 0 0 4px rgba(64, 200, 208, 0.1)',
                }}
                title="Click to track unit"
              />
              {selectionKills.value > 0 && (
                <span
                  class="absolute -top-1 -right-1 text-white text-[9px] md:text-[10px] font-numbers font-bold rounded-full px-1 leading-tight"
                  style={{
                    background: 'linear-gradient(135deg, var(--pw-enemy), #801818)',
                    border: '1px solid var(--pw-enemy-light)',
                  }}
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
              style={{ color: 'var(--pw-text-secondary)' }}
            >
              {selectionStatsHtml}
            </div>
            <p
              class="font-game text-[10px] md:text-xs leading-tight"
              style={{ color: 'var(--pw-text-muted)' }}
            >
              {selectionDesc}
            </p>
            {selectionIsMulti.value && (
              <p
                class="font-game text-[10px] md:text-xs leading-tight mt-0.5"
                style={{ color: 'var(--pw-text-muted)' }}
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
