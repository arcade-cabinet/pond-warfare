/**
 * UnitCommands - Idle worker button with contextual auto-behavior toggles,
 * army select button, attack-move button, halt button, save-group UI.
 */

import { useState } from 'preact/hooks';
import {
  armyCount,
  attackMoveActive,
  autoAttackEnabled,
  autoBuildEnabled,
  autoDefendEnabled,
  autoGatherEnabled,
  autoHealEnabled,
  autoMenuExpanded,
  autoScoutEnabled,
  hasPlayerUnits,
  idleCombatCount,
  idleGathererCount,
  idleHealerCount,
  idleScoutCount,
  idleWorkerCount,
  selectionCount,
} from '../store';

export interface UnitCommandsProps {
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
  onSaveCtrlGroup?: (group: number) => void;
}

/** A single auto-behavior toggle button. */
function AutoToggleButton({
  label,
  enabled,
  onToggle,
  color,
  activeBackground,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  color: string;
  activeBackground: string;
}) {
  return (
    <button
      type="button"
      class="cmd-btn border px-2 py-1 min-h-[44px] min-w-[44px] rounded-full font-bold text-xs md:text-sm flex items-center gap-1.5 transition-colors shadow cursor-pointer"
      style={{
        borderColor: color,
        color,
        background: enabled ? activeBackground : undefined,
      }}
      title={`Auto-${label}: ${enabled ? 'ON' : 'OFF'}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <span
        class="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{
          border: `1px solid ${color}`,
          background: enabled ? color : 'transparent',
        }}
      />
      <span class="font-heading">{label}</span>
    </button>
  );
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

  return (
    <>
      {/* Idle units button + contextual auto-behavior row */}
      {totalIdle > 0 && (
        <div class="absolute bottom-20 right-2 md:bottom-auto md:top-14 md:right-6 z-20 flex flex-wrap items-center gap-1.5">
          {/* Main idle button */}
          <button
            type="button"
            id="idle-worker-btn"
            class="cmd-btn border-2 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
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
              {/* Gatherer behaviors: Gather + Build */}
              {hasIdleGatherers && (
                <>
                  <AutoToggleButton
                    label="Gather"
                    enabled={autoGatherEnabled.value}
                    onToggle={() => {
                      autoGatherEnabled.value = !autoGatherEnabled.value;
                    }}
                    color="var(--pw-warning)"
                    activeBackground="rgba(232, 160, 48, 0.3)"
                  />
                  <AutoToggleButton
                    label="Build"
                    enabled={autoBuildEnabled.value}
                    onToggle={() => {
                      autoBuildEnabled.value = !autoBuildEnabled.value;
                    }}
                    color="var(--pw-twig)"
                    activeBackground="rgba(160, 120, 60, 0.3)"
                  />
                </>
              )}

              {/* Combat unit behaviors: Attack + Defend */}
              {hasIdleCombat && (
                <>
                  <AutoToggleButton
                    label="Attack"
                    enabled={autoAttackEnabled.value}
                    onToggle={() => {
                      autoAttackEnabled.value = !autoAttackEnabled.value;
                    }}
                    color="var(--pw-enemy-light)"
                    activeBackground="rgba(224, 96, 96, 0.3)"
                  />
                  <AutoToggleButton
                    label="Defend"
                    enabled={autoDefendEnabled.value}
                    onToggle={() => {
                      autoDefendEnabled.value = !autoDefendEnabled.value;
                    }}
                    color="var(--pw-accent)"
                    activeBackground="rgba(64, 200, 208, 0.3)"
                  />
                </>
              )}

              {/* Healer behavior: Heal */}
              {hasIdleHealers && (
                <AutoToggleButton
                  label="Heal"
                  enabled={autoHealEnabled.value}
                  onToggle={() => {
                    autoHealEnabled.value = !autoHealEnabled.value;
                  }}
                  color="var(--pw-success)"
                  activeBackground="rgba(64, 184, 104, 0.3)"
                />
              )}

              {/* Scout behavior: Scout */}
              {hasIdleScouts && (
                <AutoToggleButton
                  label="Scout"
                  enabled={autoScoutEnabled.value}
                  onToggle={() => {
                    autoScoutEnabled.value = !autoScoutEnabled.value;
                  }}
                  color="#b090d8"
                  activeBackground="rgba(138, 106, 184, 0.3)"
                />
              )}

              {/* Select All idle units */}
              <button
                type="button"
                class="cmd-btn border px-2 py-1 min-h-[44px] min-w-[44px] rounded-full font-bold text-xs md:text-sm flex items-center gap-1.5 transition-colors shadow cursor-pointer"
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

      {/* Army select button */}
      {armyCount.value > 0 && (
        <button
          type="button"
          id="select-army-btn"
          class="absolute top-24 md:top-28 right-2 md:right-6 cmd-btn border-2 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          style={{ borderColor: 'var(--pw-enemy)', color: 'var(--pw-enemy-light)' }}
          title="Select all army (,)"
          onClick={props.onArmyClick}
        >
          <span class="font-heading text-xs md:text-sm">Army ({armyCount})</span>
        </button>
      )}

      {/* Attack-move button (visible when player units are selected) */}
      {hasPlayerUnits.value && selectionCount.value > 0 && !attackMoveActive.value && (
        <button
          type="button"
          id="attack-move-btn"
          class="absolute top-36 md:top-40 right-2 md:right-6 cmd-btn border-2 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          style={{ borderColor: 'var(--pw-twig)', color: 'var(--pw-otter)' }}
          title="Attack-Move (A)"
          onClick={props.onAttackMoveClick}
        >
          <span class="font-heading text-xs md:text-sm">A-Move</span>
        </button>
      )}

      {/* Halt/Stop button (visible when player units are selected) */}
      {hasPlayerUnits.value && selectionCount.value > 0 && (
        <button
          type="button"
          id="halt-btn"
          class="absolute top-48 md:top-52 right-2 md:right-6 cmd-btn border-2 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          style={{ borderColor: 'var(--pw-border)', color: 'var(--pw-text-secondary)' }}
          title="Stop/Halt (H)"
          onClick={props.onHaltClick}
        >
          <span class="font-heading text-xs md:text-sm">Stop</span>
        </button>
      )}

      {/* Save ctrl-group button (visible when units are selected) */}
      {selectionCount.value > 0 && hasPlayerUnits.value && (
        <div class="absolute top-[232px] md:top-64 right-2 md:right-6 z-20">
          {!saveGroupOpen ? (
            <button
              type="button"
              class="cmd-btn border-2 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
              style={{ borderColor: '#8a6ab8', color: '#b090d8' }}
              title="Save selection to a control group"
              onClick={(e) => {
                e.stopPropagation();
                setSaveGroupOpen(true);
              }}
            >
              <span class="font-heading text-xs md:text-sm">Save Group</span>
            </button>
          ) : (
            <div
              class="flex gap-1 items-center rounded-full px-2 py-1 shadow-lg"
              style={{
                background: 'rgba(12, 26, 31, 0.9)',
                border: '1px solid #8a6ab8',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  type="button"
                  key={`sg-${n}`}
                  class="w-7 h-7 min-w-[44px] min-h-[44px] rounded font-numbers font-bold text-xs cursor-pointer flex items-center justify-center transition-colors"
                  style={{
                    background: 'var(--pw-bg-surface)',
                    border: '1px solid #8a6ab8',
                    color: '#b090d8',
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
                class="w-7 h-7 min-w-[44px] min-h-[44px] rounded font-bold text-xs cursor-pointer flex items-center justify-center transition-colors"
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
