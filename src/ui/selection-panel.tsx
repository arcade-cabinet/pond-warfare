/**
 * Selection Info Panel
 *
 * Single unit: portrait canvas, name, HP bar (color-coded green/yellow/red),
 * stats (HP, Dmg, Kills, Range), status text.
 * Multi-unit: squad count, composition breakdown, mini sprite grid (max 12 shown).
 * Resource: amount remaining, description.
 * No selection: compact overview with idle workers, army count, population.
 */

import { isMobile } from '@/platform';
import {
  armyCount,
  attackMoveActive,
  autoAttackEnabled,
  autoBuildEnabled,
  autoDefendEnabled,
  autoGatherEnabled,
  autoHealEnabled,
  autoScoutEnabled,
  food,
  hasPlayerUnits,
  hpBarColor,
  hpPercent,
  idleCombatCount,
  idleGathererCount,
  idleHealerCount,
  idleScoutCount,
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
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
}

/** Compact auto-behavior toggle. */
function AutoToggle({
  label,
  enabled,
  color,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      class="px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer transition-colors"
      style={{
        border: `1px solid ${color}`,
        color,
        background: enabled ? `${color}20` : 'transparent',
      }}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {enabled ? '\u2713 ' : ''}{label}
    </button>
  );
}

/** Compact overview when nothing is selected — includes idle/army buttons + auto-behaviors. */
function CommandCenterOverview({
  onIdleClick,
  onArmyClick,
}: {
  onIdleClick?: () => void;
  onArmyClick?: () => void;
}) {
  const hasGatherers = idleGathererCount.value > 0;
  const hasCombat = idleCombatCount.value > 0;
  const hasHealers = idleHealerCount.value > 0;
  const hasScouts = idleScoutCount.value > 0;
  const totalIdle = idleWorkerCount.value;

  return (
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2
          class="font-heading text-sm md:text-base leading-tight"
          style={{ color: 'var(--pw-accent-dim)' }}
        >
          Command Center
        </h2>
        <div
          class="flex gap-1 text-[10px] md:text-xs font-numbers"
          style={{ color: 'var(--pw-text-secondary)' }}
        >
          <span style={{ color: 'var(--pw-food)' }}>{food.value}/{maxFood.value}</span>
        </div>
      </div>

      {/* Idle + Army quick-select buttons */}
      <div class="flex gap-1 flex-wrap">
        {totalIdle > 0 && (
          <button
            type="button"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer"
            style={{ border: '1px solid var(--pw-warning)', color: 'var(--pw-warning)' }}
            onClick={(e) => { e.stopPropagation(); onIdleClick?.(); }}
          >
            {totalIdle} Idle
          </button>
        )}
        {armyCount.value > 0 && (
          <button
            type="button"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer"
            style={{ border: '1px solid var(--pw-enemy)', color: 'var(--pw-enemy-light)' }}
            onClick={(e) => { e.stopPropagation(); onArmyClick?.(); }}
          >
            Army ({armyCount.value})
          </button>
        )}
      </div>

      {/* Auto-behavior toggles (contextual per idle unit type) */}
      {totalIdle > 0 && (
        <div class="flex gap-1 flex-wrap">
          {hasGatherers && (
            <>
              <AutoToggle label="Gather" enabled={autoGatherEnabled.value} color="var(--pw-warning)" onToggle={() => { autoGatherEnabled.value = !autoGatherEnabled.value; }} />
              <AutoToggle label="Build" enabled={autoBuildEnabled.value} color="var(--pw-twig)" onToggle={() => { autoBuildEnabled.value = !autoBuildEnabled.value; }} />
            </>
          )}
          {hasCombat && (
            <>
              <AutoToggle label="Attack" enabled={autoAttackEnabled.value} color="var(--pw-enemy-light)" onToggle={() => { autoAttackEnabled.value = !autoAttackEnabled.value; }} />
              <AutoToggle label="Defend" enabled={autoDefendEnabled.value} color="var(--pw-accent)" onToggle={() => { autoDefendEnabled.value = !autoDefendEnabled.value; }} />
            </>
          )}
          {hasHealers && (
            <AutoToggle label="Heal" enabled={autoHealEnabled.value} color="var(--pw-success)" onToggle={() => { autoHealEnabled.value = !autoHealEnabled.value; }} />
          )}
          {hasScouts && (
            <AutoToggle label="Scout" enabled={autoScoutEnabled.value} color="#b090d8" onToggle={() => { autoScoutEnabled.value = !autoScoutEnabled.value; }} />
          )}
        </div>
      )}
    </div>
  );
}

export function SelectionPanel({ onDeselect, onIdleWorkerClick, onArmyClick, onAttackMoveClick, onHaltClick }: SelectionPanelProps) {
  const count = selectionCount.value;
  const showHp = selectionShowHpBar.value;
  const mobile = isMobile.value;

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
          class="absolute top-1 right-1 rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-xs font-bold z-10 transition-colors hud-btn"
          title="Clear selection (Esc)"
          onClick={(e) => {
            e.stopPropagation();
            onDeselect();
          }}
        >
          X
        </button>
      )}

      {/* No selection: compact overview with idle/army/auto-behaviors */}
      {count === 0 && <CommandCenterOverview onIdleClick={onIdleWorkerClick} onArmyClick={onArmyClick} />}

      {/* Mobile command buttons (A-Move / Stop) inline when units selected */}
      {mobile && count > 0 && hasPlayerUnits.value && (
        <div class="flex gap-1">
          {!attackMoveActive.value && (
            <button
              type="button"
              class="px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
              style={{ border: '1px solid var(--pw-twig)', color: 'var(--pw-otter)' }}
              onClick={(e) => { e.stopPropagation(); onAttackMoveClick?.(); }}
            >
              A-Move
            </button>
          )}
          <button
            type="button"
            class="px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer"
            style={{ border: '1px solid var(--pw-border)', color: 'var(--pw-text-secondary)' }}
            onClick={(e) => { e.stopPropagation(); onHaltClick?.(); }}
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
