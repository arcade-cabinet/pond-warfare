/**
 * Selection Info Panel
 *
 * Single unit: portrait canvas, name, HP bar (color-coded green/yellow/red),
 * stats (HP, Dmg, Kills, Range), status text.
 * Multi-unit: squad count, composition breakdown, mini sprite grid (max 12 shown).
 * Resource: amount remaining, description.
 */

import {
  selectionCount,
  selectionName,
  selectionNameColor,
  selectionShowHpBar,
  selectionIsMulti,
  selectionDesc,
  selectionStatsHtml,
  selectionComposition,
  hpPercent,
  hpBarColor,
  selectionSpriteData,
  selectionKills,
} from './store';

export function SelectionPanel() {
  const count = selectionCount.value;
  const showHp = selectionShowHpBar.value;

  return (
    <div
      id="selection-info"
      class="w-1/3 md:w-full flex-1 p-2 md:p-4 border-r-2 md:border-r-0 md:border-b-4 border-slate-700 flex flex-col gap-1 md:gap-2 overflow-y-auto bg-slate-900"
    >
      <div class="flex flex-col sm:flex-row gap-2 md:gap-3 items-start">
        {/* Portrait (single selection only) */}
        {!selectionIsMulti.value && count > 0 && selectionSpriteData.value && (
          <img
            src={selectionSpriteData.value}
            alt="portrait"
            class="bg-slate-800 border-2 border-slate-600 rounded-sm shadow-inner w-12 h-12 md:w-16 md:h-16 render-pixelated flex-shrink-0 cursor-pointer hover:border-sky-400 transition-colors"
            title="Click to track unit"
          />
        )}

        <div class="flex-1 w-full">
          <h2 class={`text-base md:text-xl font-bold leading-tight ${selectionNameColor.value}`}>
            {selectionName}
          </h2>

          {/* HP bar */}
          {showHp && (
            <div class="w-full h-3 md:h-4 bg-red-900 border border-slate-900 mt-1">
              <div
                class="h-full transition-all duration-200"
                style={{
                  width: `${hpPercent.value}%`,
                  background: hpBarColor.value,
                }}
              />
            </div>
          )}

          {/* Stats */}
          <div
            id="sel-stats"
            class="text-slate-300 text-xs md:text-sm mt-1"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: game UI
            dangerouslySetInnerHTML={{ __html: selectionStatsHtml.value }}
          />

          {/* Description / status */}
          <p class="text-[10px] md:text-xs text-slate-400 leading-tight">
            {selectionDesc}
          </p>

          {/* Multi-select composition */}
          {selectionIsMulti.value && (
            <p class="text-[10px] md:text-xs text-slate-400 leading-tight mt-1">
              {selectionComposition}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
