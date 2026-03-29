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
          class="absolute top-14 right-2 md:right-6 ui-panel border-2 border-amber-600 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full text-amber-400 font-bold z-20 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
          title="Idle units menu (.)"
          onClick={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            const rect = btn.getBoundingClientRect();
            radialMenuX.value = rect.left + rect.width / 2;
            radialMenuY.value = rect.top + rect.height / 2;
            radialMenuOpen.value = !radialMenuOpen.value;
          }}
        >
          <span class="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          <span class="text-xs md:text-sm">{idleWorkerCount} Idle</span>
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
          class="absolute top-24 md:top-28 right-2 md:right-6 ui-panel border-2 border-red-600 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full text-red-400 font-bold z-20 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
          title="Select all army (,)"
          onClick={props.onArmyClick}
        >
          <span class="text-xs md:text-sm">Army ({armyCount})</span>
        </button>
      )}

      {/* Attack-move button (visible when player units are selected) */}
      {hasPlayerUnits.value && selectionCount.value > 0 && !attackMoveActive.value && (
        <button
          type="button"
          id="attack-move-btn"
          class="absolute top-36 md:top-40 right-2 md:right-6 ui-panel border-2 border-orange-600 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full text-orange-400 font-bold z-20 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
          title="Attack-Move (A)"
          onClick={props.onAttackMoveClick}
        >
          <span class="text-xs md:text-sm">A-Move</span>
        </button>
      )}

      {/* Halt/Stop button (visible when player units are selected) */}
      {hasPlayerUnits.value && selectionCount.value > 0 && (
        <button
          type="button"
          id="halt-btn"
          class="absolute top-48 md:top-52 right-2 md:right-6 ui-panel border-2 border-slate-500 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full text-slate-300 font-bold z-20 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
          title="Stop/Halt (H)"
          onClick={props.onHaltClick}
        >
          <span class="text-xs md:text-sm">Stop</span>
        </button>
      )}

      {/* Save ctrl-group button (visible when units are selected) */}
      {selectionCount.value > 0 && hasPlayerUnits.value && (
        <div class="absolute top-[232px] md:top-64 right-2 md:right-6 z-20">
          {!saveGroupOpen ? (
            <button
              type="button"
              class="ui-panel border-2 border-purple-600 px-3 py-1 md:px-4 md:py-2 min-h-[44px] rounded-full text-purple-400 font-bold flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
              title="Save selection to a control group"
              onClick={(e) => {
                e.stopPropagation();
                setSaveGroupOpen(true);
              }}
            >
              <span class="text-xs md:text-sm">Save Group</span>
            </button>
          ) : (
            <div class="flex gap-1 items-center bg-slate-900 bg-opacity-90 border border-purple-600 rounded-full px-2 py-1 shadow-lg">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  type="button"
                  key={`sg-${n}`}
                  class="w-7 h-7 min-w-[44px] min-h-[44px] bg-slate-800 border border-purple-500 rounded text-purple-300 font-bold text-xs hover:bg-purple-900 hover:border-purple-400 cursor-pointer flex items-center justify-center transition-colors"
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
                class="w-7 h-7 min-w-[44px] min-h-[44px] bg-slate-800 border border-slate-600 rounded text-slate-400 font-bold text-xs hover:bg-slate-700 cursor-pointer flex items-center justify-center transition-colors"
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
