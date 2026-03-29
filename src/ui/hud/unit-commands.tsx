/**
 * UnitCommands - Idle worker button, army select button, attack-move button,
 * halt button, save-group UI.
 */

import { useState } from 'preact/hooks';
import { RadialMenu } from '../radial-menu';
import {
  armyCount,
  attackMoveActive,
  hasPlayerUnits,
  idleWorkerCount,
  radialMenuOpen,
  radialMenuX,
  radialMenuY,
  selectionCount,
} from '../store';

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

  return (
    <>
      {/* Idle worker button - opens radial menu */}
      {idleWorkerCount.value > 0 && (
        <button
          type="button"
          id="idle-worker-btn"
          class="absolute top-14 right-2 md:right-6 cmd-btn border-2 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          style={{ borderColor: 'var(--pw-warning)', color: 'var(--pw-warning)' }}
          title="Idle units menu (.)"
          onClick={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            const rect = btn.getBoundingClientRect();
            radialMenuX.value = rect.left + rect.width / 2;
            radialMenuY.value = rect.top + rect.height / 2;
            radialMenuOpen.value = !radialMenuOpen.value;
          }}
        >
          <span class="w-3 h-3 rounded-full animate-pulse" style={{ background: 'var(--pw-warning)' }} />
          <span class="font-heading text-xs md:text-sm">{idleWorkerCount} Idle</span>
        </button>
      )}

      {/* Radial menu for idle units */}
      {radialMenuOpen.value && (
        <RadialMenu
          onSelectAll={() => {
            if (props.onIdleWorkerClick) props.onIdleWorkerClick();
          }}
        />
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
