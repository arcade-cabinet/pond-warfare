/**
 * Selection Info Panel
 *
 * Single unit: portrait canvas, name, HP bar (color-coded green/yellow/red),
 * stats (HP, Dmg, Kills, Range), status text.
 * Multi-unit: squad count, composition breakdown, mini sprite grid (max 12 shown).
 * Resource: amount remaining, description.
 * No selection: compact overview with idle workers, army count, population.
 */

import {
  armyCount,
  food,
  hpBarColor,
  hpPercent,
  idleWorkerCount,
  maxFood,
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
}

/** Compact overview when nothing is selected. */
function CommandCenterOverview() {
  return (
    <div class="flex flex-col gap-1">
      <h2
        class="font-heading text-sm md:text-base leading-tight"
        style={{ color: 'var(--pw-accent-dim)' }}
      >
        Command Center
      </h2>
      <div
        class="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] md:text-xs font-numbers"
        style={{ color: 'var(--pw-text-secondary)' }}
      >
        <span>
          <span class="font-bold" style={{ color: 'var(--pw-clam)' }}>
            {idleWorkerCount.value}
          </span>{' '}
          Idle
        </span>
        <span>
          Army:{' '}
          <span class="font-bold" style={{ color: 'var(--pw-enemy)' }}>
            {armyCount.value}
          </span>
        </span>
        <span>
          Pop:{' '}
          <span class="font-bold" style={{ color: 'var(--pw-food)' }}>
            {food.value}/{maxFood.value}
          </span>
        </span>
      </div>
    </div>
  );
}

export function SelectionPanel({ onDeselect }: SelectionPanelProps) {
  const count = selectionCount.value;
  const showHp = selectionShowHpBar.value;

  return (
    <div
      id="selection-info"
      class="w-1/3 md:w-full flex-shrink-0 p-2 md:p-3 border-r-2 md:border-r-0 md:border-b-2 flex flex-col gap-1 md:gap-1.5 overflow-y-auto relative"
      style={{
        background: 'linear-gradient(180deg, var(--pw-bg-surface) 0%, var(--pw-bg-deep) 100%)',
        borderColor: 'var(--pw-border)',
      }}
    >
      {/* Deselect button */}
      {count > 0 && onDeselect && (
        <button
          type="button"
          class="absolute top-1 right-1 rounded-full w-6 h-6 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer text-xs font-bold z-10 transition-colors hud-btn"
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
      {count === 0 && <CommandCenterOverview />}

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

            {/* HP bar with themed track */}
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

            {/* Stats */}
            <div
              id="sel-stats"
              class="font-numbers text-[10px] md:text-xs mt-0.5"
              style={{ color: 'var(--pw-text-secondary)' }}
            >
              {selectionStatsHtml}
            </div>

            {/* Description / status */}
            <p
              class="font-game text-[10px] md:text-xs leading-tight"
              style={{ color: 'var(--pw-text-muted)' }}
            >
              {selectionDesc}
            </p>

            {/* Multi-select composition */}
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
