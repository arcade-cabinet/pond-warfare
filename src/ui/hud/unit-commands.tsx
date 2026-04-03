/**
 * UnitCommands - Idle worker button with contextual auto-behavior toggles,
 * army select button, attack-move button, halt button, save-group UI.
 */

import { useState } from 'preact/hooks';
import { screenClass } from '@/platform';
import { cycleStance } from '../game-actions';
import {
  armyCount,
  attackMoveActive,
  patrolModeActive,
  autoCombatEnabled,
  autoGathererEnabled,
  autoHealerEnabled,
  autoMenuExpanded,
  autoScoutEnabled,
  hasPlayerUnits,
  idleCombatCount,
  idleGathererCount,
  idleHealerCount,
  idleScoutCount,
  idleWorkerCount,
  selectionCount,
  selectionStance,
} from '../store';
import { AutoToggleButton } from './auto-toggle-button';

const _STANCE_LABELS = ['A', 'D', 'H'] as const;
const STANCE_TITLES = ['Aggressive', 'Defensive', 'Hold'] as const;

export interface UnitCommandsProps {
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
  onSaveCtrlGroup?: (group: number) => void;
}

export function UnitCommands(props: UnitCommandsProps) {
  // Save-group picker state
  const [saveGroupOpen, setSaveGroupOpen] = useState(false);

  const expanded = autoMenuExpanded.value;
  const totalIdle = idleWorkerCount.value;
  const hasIdleGatherers = idleGathererCount.value > 0;
  const hasIdleCombat = idleCombatCount.value > 0;
  const hasIdleHealers = idleHealerCount.value > 0;
  const hasIdleScouts = idleScoutCount.value > 0;

  const mobile = screenClass.value === 'compact';

  return (
    <>
      {/* Idle units button + contextual auto-behavior row (desktop only — mobile uses slide-out panel) */}
      {!mobile && totalIdle > 0 && (
        <div class="absolute top-14 right-2 md:right-6 z-20 flex flex-wrap items-center gap-1">
          {/* Main idle button */}
          <button
            type="button"
            id="idle-worker-btn"
            class="cmd-btn border-2 px-2 py-0.5 md:px-4 md:py-2 min-h-[32px] md:min-h-[36px] rounded-full font-bold flex items-center gap-1.5 md:gap-2 transition-colors shadow-lg cursor-pointer"
            style={{ borderColor: 'var(--pw-warning)', color: 'var(--pw-warning)' }}
            title={expanded ? 'Collapse auto menu (.)' : 'Expand auto menu (.)'}
            onClick={() => {
              autoMenuExpanded.value = !autoMenuExpanded.value;
            }}
          >
            <span
              class="w-3 h-3 rounded-full animate-pulse"
              style={{ background: 'var(--pw-warning)' }}
            />
            <span class="font-heading text-xs md:text-sm">
              {totalIdle} Idle {expanded ? '\u25B2' : '\u25BC'}
            </span>
          </button>

          {/* Contextual auto-behavior toggle buttons */}
          {expanded && (
            <>
              {/* Gatherer role: gather + build */}
              {hasIdleGatherers && (
                <AutoToggleButton
                  label="Gatherer"
                  enabled={autoGathererEnabled.value}
                  onToggle={() => {
                    autoGathererEnabled.value = !autoGathererEnabled.value;
                  }}
                  color="var(--pw-warning)"
                  activeBackground="var(--pw-auto-warning-bg)"
                />
              )}

              {/* Combat role: attack + defend */}
              {hasIdleCombat && (
                <AutoToggleButton
                  label="Combat"
                  enabled={autoCombatEnabled.value}
                  onToggle={() => {
                    autoCombatEnabled.value = !autoCombatEnabled.value;
                  }}
                  color="var(--pw-enemy-light)"
                  activeBackground="var(--pw-auto-enemy-bg)"
                />
              )}

              {/* Healer role */}
              {hasIdleHealers && (
                <AutoToggleButton
                  label="Healer"
                  enabled={autoHealerEnabled.value}
                  onToggle={() => {
                    autoHealerEnabled.value = !autoHealerEnabled.value;
                  }}
                  color="var(--pw-success)"
                  activeBackground="var(--pw-auto-success-bg)"
                />
              )}

              {/* Scout role */}
              {hasIdleScouts && (
                <AutoToggleButton
                  label="Scout"
                  enabled={autoScoutEnabled.value}
                  onToggle={() => {
                    autoScoutEnabled.value = !autoScoutEnabled.value;
                  }}
                  color="var(--pw-scout)"
                  activeBackground="var(--pw-auto-scout-bg)"
                />
              )}

              {/* Select All idle units */}
              <button
                type="button"
                class="cmd-btn border px-2 py-0.5 min-h-[32px] min-w-[32px] md:min-h-[36px] md:min-w-[36px] rounded-full font-bold text-[10px] md:text-sm flex items-center gap-1 md:gap-1.5 transition-colors shadow cursor-pointer"
                style={{
                  borderColor: 'var(--pw-success)',
                  color: 'var(--pw-success)',
                }}
                title="Select all idle units"
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.onIdleWorkerClick) props.onIdleWorkerClick();
                  autoMenuExpanded.value = false;
                }}
              >
                <span class="font-heading">Select</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Army select button (desktop only — mobile has it in sidebar) */}
      {!mobile && armyCount.value > 0 && (
        <button
          type="button"
          id="select-army-btn"
          class="absolute top-24 md:top-28 right-2 md:right-6 cmd-btn border-2 px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          style={{ borderColor: 'var(--pw-enemy)', color: 'var(--pw-enemy-light)' }}
          title="Select all army (,)"
          onClick={props.onArmyClick}
        >
          <span class="font-heading text-xs md:text-sm">Army ({armyCount}) (,)</span>
        </button>
      )}

      {/* Attack-move button — all devices */}
      {hasPlayerUnits.value && selectionCount.value > 0 && !attackMoveActive.value && (
        <button
          type="button"
          id="attack-move-btn"
          class="absolute top-36 md:top-40 right-2 md:right-6 cmd-btn border-2 px-3 md:px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer min-h-[44px] min-w-[44px]"
          style={{ borderColor: 'var(--pw-twig)', color: 'var(--pw-otter)' }}
          title="Attack-Move (A)"
          onClick={props.onAttackMoveClick}
        >
          <span class="font-heading text-xs md:text-sm">A-Move{!mobile && ' (A)'}</span>
        </button>
      )}

      {/* Halt/Stop button — all devices */}
      {hasPlayerUnits.value && selectionCount.value > 0 && (
        <button
          type="button"
          id="halt-btn"
          class="absolute top-48 md:top-52 right-2 md:right-6 cmd-btn border-2 px-3 md:px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer min-h-[44px] min-w-[44px]"
          style={{ borderColor: 'var(--pw-border)', color: 'var(--pw-text-secondary)' }}
          title="Stop/Halt (H)"
          onClick={props.onHaltClick}
        >
          <span class="font-heading text-xs md:text-sm">Stop{!mobile && ' (H)'}</span>
        </button>
      )}

      {/* Stance cycle button — all devices */}
      {hasPlayerUnits.value && selectionCount.value > 0 && selectionStance.value >= 0 && (
        <button
          type="button"
          id="stance-btn"
          class="absolute top-[232px] md:top-64 right-2 md:right-6 cmd-btn border-2 px-3 md:px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer min-h-[44px] min-w-[44px]"
          style={{ borderColor: 'var(--pw-moss-bright)', color: 'var(--pw-moss-bright)' }}
          title={`Stance: ${STANCE_TITLES[selectionStance.value] ?? 'Aggressive'} (V)`}
          onClick={() => cycleStance()}
        >
          <span class="font-heading text-xs md:text-sm">
            {STANCE_TITLES[selectionStance.value] ?? 'Aggressive'}
            {!mobile && ' (V)'}
          </span>
        </button>
      )}

      {/* Patrol mode button — all devices (mobile tap-to-patrol, desktop shift+click) */}
      {hasPlayerUnits.value && selectionCount.value > 0 && (
        <button
          type="button"
          id="patrol-btn"
          class={`absolute top-[280px] md:top-[296px] right-2 md:right-6 cmd-btn border-2 px-3 md:px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer min-h-[44px] min-w-[44px] ${patrolModeActive.value ? 'ring-2 ring-offset-1' : ''}`}
          style={{
            borderColor: patrolModeActive.value ? 'var(--pw-vine-highlight)' : 'var(--pw-vine-base)',
            color: patrolModeActive.value ? 'var(--pw-vine-highlight)' : 'var(--pw-vine-base)',
          }}
          title="Patrol: tap terrain to set waypoints"
          onClick={() => {
            patrolModeActive.value = !patrolModeActive.value;
          }}
        >
          <span class="font-heading text-xs md:text-sm">
            {patrolModeActive.value ? 'Patrolling...' : 'Patrol'}
          </span>
        </button>
      )}

      {/* Save ctrl-group button — desktop only */}
      {!mobile && selectionCount.value > 0 && hasPlayerUnits.value && (
        <div class="absolute top-[280px] md:top-[296px] right-2 md:right-6 z-20">
          {!saveGroupOpen ? (
            <button
              type="button"
              class="cmd-btn border-2 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
              style={{ borderColor: 'var(--pw-scout-dark)', color: 'var(--pw-scout)' }}
              title="Save selection to a control group"
              onClick={(e) => {
                e.stopPropagation();
                setSaveGroupOpen(true);
              }}
            >
              <span class="font-heading text-sm">Save Group</span>
            </button>
          ) : (
            <div
              class="flex gap-1 items-center rounded-full px-2 py-1 shadow-lg"
              style={{
                background: 'var(--pw-overlay-heavy)',
                border: '1px solid var(--pw-scout-dark)',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  type="button"
                  key={`sg-${n}`}
                  class="w-7 h-7 rounded font-numbers font-bold text-xs cursor-pointer flex items-center justify-center transition-colors"
                  style={{
                    background: 'var(--pw-bg-surface)',
                    border: '1px solid var(--pw-scout-dark)',
                    color: 'var(--pw-scout)',
                  }}
                  title={`Save to group ${n}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (props.onSaveCtrlGroup) props.onSaveCtrlGroup(n);
                    setSaveGroupOpen(false);
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                class="w-7 h-7 rounded font-bold text-xs cursor-pointer flex items-center justify-center transition-colors"
                style={{
                  background: 'var(--pw-bg-surface)',
                  border: '1px solid var(--pw-border)',
                  color: 'var(--pw-text-muted)',
                }}
                title="Cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  setSaveGroupOpen(false);
                }}
              >
                X
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
