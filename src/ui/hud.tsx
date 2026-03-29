/**
 * HUD - Top Bar Component
 *
 * Resource display with rate indicators, clock display (Day X - HH:MM),
 * status (Peaceful/Hunting), speed button, mute button.
 * Reads from store signals.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { RadialMenu } from './radial-menu';
import {
  armyCount,
  attackMoveActive,
  clams,
  colorBlindMode,
  ctrlGroupCounts,
  enemyClams,
  enemyEconomyVisible,
  enemyTwigs,
  foodAtCap,
  foodDisplay,
  gameTimeDisplay,
  globalProductionQueue,
  hasPlayerUnits,
  idleWorkerCount,
  isPeaceful,
  lowClams,
  lowTwigs,
  muteLabel,
  paused,
  peaceStatusColor,
  peaceStatusText,
  radialMenuOpen,
  radialMenuX,
  radialMenuY,
  rateClams,
  rateTwigs,
  selectionCount,
  speedLabel,
  twigs,
  waveCountdown,
} from './store';

/** Format time-of-day (in minutes) to HH:MM string. */
export function formatTime(timeOfDay: number): string {
  const hrs = Math.floor(timeOfDay / 60);
  const mins = Math.floor(timeOfDay % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/** Calculate day number from frame count. */
export function frameToDay(frameCount: number, dayFrames: number): number {
  return Math.floor(frameCount / dayFrames) + 1;
}

/** Format resource rate as +N or -N. */
export function formatRate(r: number): string {
  return r >= 0 ? `+${r}` : `${r}`;
}

export interface HUDProps {
  onSpeedClick?: () => void;
  onMuteClick?: () => void;
  onColorBlindToggle?: () => void;
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onPauseClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
  onCtrlGroupClick?: (group: number) => void;
  onSaveCtrlGroup?: (group: number) => void;
  onSaveClick?: () => void;
  onLoadClick?: () => void;
  onSettingsClick?: () => void;
}

export function HUD(props: HUDProps) {
  const clamsRate = rateClams.value;
  const twigsRate = rateTwigs.value;

  // Save-group picker state
  const [saveGroupOpen, setSaveGroupOpen] = useState(false);

  // Resource flash: track previous values and set flash class on significant change
  const prevClams = useRef(clams.value);
  const prevTwigs = useRef(twigs.value);
  const [clamsFlash, setClamsFlash] = useState(false);
  const [twigsFlash, setTwigsFlash] = useState(false);

  const currentClams = clams.value;
  const currentTwigs = twigs.value;

  useEffect(() => {
    if (Math.abs(currentClams - prevClams.current) >= 20) {
      setClamsFlash(true);
      const timer = setTimeout(() => setClamsFlash(false), 400);
      prevClams.current = currentClams;
      return () => clearTimeout(timer);
    }
    prevClams.current = currentClams;
  }, [currentClams]);

  useEffect(() => {
    if (Math.abs(currentTwigs - prevTwigs.current) >= 20) {
      setTwigsFlash(true);
      const timer = setTimeout(() => setTwigsFlash(false), 400);
      prevTwigs.current = currentTwigs;
      return () => clearTimeout(timer);
    }
    prevTwigs.current = currentTwigs;
  }, [currentTwigs]);

  return (
    <>
      {/* Top bar */}
      <div class="absolute top-0 left-0 w-full h-11 md:h-12 ui-panel border-0 border-b-2 md:border-b-4 flex items-center justify-between px-2 md:px-6 z-20 bg-opacity-95 text-xs md:text-sm">
        <div class="flex space-x-3 md:space-x-6">
          {/* Clams */}
          <div class="flex items-center space-x-1 md:space-x-2">
            <div class="w-3 h-3 md:w-4 md:h-4 bg-slate-300 border border-slate-100 shadow-sm rounded-full" />
            <span class="hidden md:inline">Clams: </span>
            <span class={`text-slate-200 font-bold ${clamsFlash ? 'animate-resource-flash' : ''}`}>
              {clams}
            </span>
            {lowClams.value && (
              <span class="text-amber-400 font-bold animate-pulse" title="Low clams!">
                !
              </span>
            )}
            {clamsRate !== 0 && (
              <span
                class={`text-[10px] hidden md:inline ${clamsRate >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {clamsRate >= 0 ? `+${clamsRate}` : clamsRate}
              </span>
            )}
          </div>

          {/* Twigs */}
          <div class="flex items-center space-x-1 md:space-x-2">
            <div class="w-3 h-3 md:w-4 md:h-4 bg-amber-700 border border-amber-500 shadow-sm" />
            <span class="hidden md:inline">Twigs: </span>
            <span class={`text-amber-600 font-bold ${twigsFlash ? 'animate-resource-flash' : ''}`}>
              {twigs}
            </span>
            {lowTwigs.value && (
              <span class="text-amber-400 font-bold animate-pulse" title="Low twigs!">
                !
              </span>
            )}
            {twigsRate !== 0 && (
              <span
                class={`text-[10px] hidden md:inline ${twigsRate >= 0 ? 'text-green-400' : 'text-red-400'}`}
              >
                {twigsRate >= 0 ? `+${twigsRate}` : twigsRate}
              </span>
            )}
          </div>

          {/* Food */}
          <div class="flex items-center space-x-1 md:space-x-2">
            <div class="w-3 h-3 md:w-4 md:h-4 bg-red-600 border border-red-400 shadow-sm rounded-sm" />
            <span class="hidden md:inline">Food: </span>
            <span class={foodAtCap.value ? 'text-red-500 font-bold' : 'text-red-400 font-bold'}>
              {foodDisplay}
            </span>
          </div>
        </div>

        <div class="flex items-center space-x-2 md:space-x-4">
          <div class={peaceStatusColor.value}>
            {peaceStatusText}
            {!isPeaceful.value && waveCountdown.value > 0 && (
              <span class={`ml-2 ${waveCountdown.value < 10 ? 'text-red-400' : 'text-amber-400'}`}>
                Wave in {waveCountdown.value}s
              </span>
            )}
          </div>
          <div class="text-sky-200 font-bold">{gameTimeDisplay}</div>
          <div class="flex items-center gap-1">
            <button
              type="button"
              id="pause-btn"
              class={`text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 border rounded cursor-pointer hover:bg-slate-600 font-bold flex items-center justify-center ${paused.value ? 'bg-amber-700 border-amber-500 text-amber-200' : 'bg-slate-700 border-slate-500 text-slate-300'}`}
              title="Pause (P)"
              onClick={props.onPauseClick}
            >
              {paused.value ? '\u25B6' : '\u23F8'}
            </button>
            <button
              type="button"
              id="speed-btn"
              class="text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 bg-slate-700 border border-slate-500 rounded cursor-pointer hover:bg-slate-600 text-sky-300 font-bold flex items-center justify-center"
              title="Game Speed (F)"
              onClick={props.onSpeedClick}
            >
              {speedLabel}
            </button>
            <button
              type="button"
              id="mute-btn"
              class="text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 bg-slate-700 border border-slate-500 rounded cursor-pointer hover:bg-slate-600 flex items-center justify-center"
              title="Toggle Sound (M)"
              onClick={props.onMuteClick}
            >
              {muteLabel}
            </button>
            <button
              type="button"
              id="cb-btn"
              class={`text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 border rounded cursor-pointer hover:bg-slate-600 font-bold flex items-center justify-center ${colorBlindMode.value ? 'bg-amber-700 border-amber-500 text-amber-200' : 'bg-slate-700 border-slate-500 text-slate-400'}`}
              title="Color Blind Mode"
              onClick={props.onColorBlindToggle}
            >
              CB
            </button>
            <button
              type="button"
              id="save-btn"
              class="text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 bg-slate-700 border border-slate-500 rounded cursor-pointer hover:bg-slate-600 text-green-400 font-bold flex items-center justify-center"
              title="Save Game"
              onClick={props.onSaveClick}
            >
              Save
            </button>
            <button
              type="button"
              id="load-btn"
              class={`text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 border rounded font-bold flex items-center justify-center ${
                localStorage.getItem('pond-warfare-save')
                  ? 'bg-slate-700 border-slate-500 cursor-pointer hover:bg-slate-600 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed'
              }`}
              title="Load Game"
              disabled={!localStorage.getItem('pond-warfare-save')}
              onClick={props.onLoadClick}
            >
              Load
            </button>
            <button
              type="button"
              id="settings-btn"
              class="text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 bg-slate-700 border border-slate-500 rounded cursor-pointer hover:bg-slate-600 text-slate-300 flex items-center justify-center"
              title="Settings"
              onClick={props.onSettingsClick}
            >
              {'\u2699'}
            </button>
          </div>
        </div>
      </div>

      {/* Production queue */}
      {globalProductionQueue.value.length > 0 && (
        <div class="absolute top-10 md:top-12 left-2 md:left-6 z-20 flex gap-1">
          {globalProductionQueue.value.map((item, i) => (
            <div
              key={
                item.entityId !== undefined
                  ? `prod-${item.entityId}`
                  : `prod-${item.unitLabel}-${i}`
              }
              class="relative w-10 h-6 bg-slate-800 border border-slate-600 rounded overflow-hidden flex items-center justify-center"
            >
              <div
                class="absolute bottom-0 left-0 h-full bg-green-700 opacity-60 transition-all duration-75"
                style={{ width: `${item.progress}%` }}
              />
              <span class="relative text-[8px] font-bold text-slate-200 z-10 truncate px-0.5">
                {item.unitLabel}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Enemy economy indicator (visible after scouting a nest) */}
      {enemyEconomyVisible.value && (
        <div class="absolute top-10 md:top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900 bg-opacity-80 border border-red-800 rounded px-2 py-0.5 text-[10px] md:text-xs">
          <span class="text-red-400 font-bold">Enemy:</span>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-slate-300 border border-slate-100 rounded-full" />
            <span class="text-slate-400">{enemyClams}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2 h-2 bg-amber-700 border border-amber-500" />
            <span class="text-slate-400">{enemyTwigs}</span>
          </div>
        </div>
      )}

      {/* Control group badges */}
      {Object.keys(ctrlGroupCounts.value).length > 0 && (
        <div class="absolute top-10 md:top-12 right-2 md:right-6 z-20 flex gap-1">
          {Object.entries(ctrlGroupCounts.value)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([gnum, count]) => (
              <button
                type="button"
                key={`cg-${gnum}`}
                class="w-7 h-7 min-w-[44px] min-h-[44px] bg-slate-800 border border-sky-600 rounded text-sky-300 font-bold text-xs hover:bg-slate-700 hover:border-sky-400 cursor-pointer flex items-center justify-center transition-colors"
                title={`Group ${gnum} (${count} units) - press ${gnum} to recall`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (props.onCtrlGroupClick) props.onCtrlGroupClick(Number(gnum));
                }}
              >
                {gnum}
              </button>
            ))}
        </div>
      )}

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

      {/* Attack-move mode banner */}
      {attackMoveActive.value && (
        <div class="absolute top-12 md:top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-1 bg-red-900 bg-opacity-80 border border-red-500 rounded text-red-300 font-bold text-xs md:text-sm whitespace-nowrap">
          ATTACK MOVE - Click target or Esc to cancel
        </div>
      )}

      {/* Pause overlay */}
      {paused.value && (
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 pointer-events-none">
          <span class="text-white text-6xl font-bold tracking-widest">PAUSED</span>
        </div>
      )}
    </>
  );
}
