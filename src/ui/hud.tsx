/**
 * HUD - Top Bar Component
 *
 * Resource display with rate indicators, clock display (Day X - HH:MM),
 * status (Peaceful/Hunting), speed button, mute button.
 * Reads from store signals.
 */

import {
  armyCount,
  attackMoveActive,
  clams,
  colorBlindMode,
  foodAtCap,
  foodDisplay,
  gameTimeDisplay,
  globalProductionQueue,
  idleWorkerCount,
  isPeaceful,
  lowClams,
  lowTwigs,
  muteLabel,
  paused,
  peaceStatusColor,
  peaceStatusText,
  rateClams,
  rateTwigs,
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
}

export function HUD(props: HUDProps) {
  const clamsRate = rateClams.value;
  const twigsRate = rateTwigs.value;

  return (
    <>
      {/* Top bar */}
      <div class="absolute top-0 left-0 w-full h-10 md:h-12 ui-panel border-0 border-b-2 md:border-b-4 flex items-center justify-between px-2 md:px-6 z-20 bg-opacity-95 text-xs md:text-sm">
        <div class="flex space-x-3 md:space-x-6">
          {/* Clams */}
          <div class="flex items-center space-x-1 md:space-x-2">
            <div class="w-3 h-3 md:w-4 md:h-4 bg-slate-300 border border-slate-100 shadow-sm rounded-full" />
            <span class="hidden md:inline">Clams: </span>
            <span class="text-slate-200 font-bold">{clams}</span>
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
            <span class="text-amber-600 font-bold">{twigs}</span>
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
              id="speed-btn"
              class="text-[10px] md:text-xs px-1 md:px-2 py-0.5 bg-slate-700 border border-slate-500 rounded cursor-pointer hover:bg-slate-600 text-sky-300 font-bold"
              title="Game Speed (F)"
              onClick={props.onSpeedClick}
            >
              {speedLabel}
            </button>
            <button
              type="button"
              id="mute-btn"
              class="text-[10px] md:text-xs px-1 md:px-2 py-0.5 bg-slate-700 border border-slate-500 rounded cursor-pointer hover:bg-slate-600"
              title="Toggle Sound (M)"
              onClick={props.onMuteClick}
            >
              {muteLabel}
            </button>
            <button
              type="button"
              id="cb-btn"
              class={`text-[10px] md:text-xs px-1 md:px-2 py-0.5 border rounded cursor-pointer hover:bg-slate-600 font-bold ${colorBlindMode.value ? 'bg-amber-700 border-amber-500 text-amber-200' : 'bg-slate-700 border-slate-500 text-slate-400'}`}
              title="Color Blind Mode"
              onClick={props.onColorBlindToggle}
            >
              CB
            </button>
          </div>
        </div>
      </div>

      {/* Production queue */}
      {globalProductionQueue.value.length > 0 && (
        <div class="absolute top-10 md:top-12 left-2 md:left-6 z-20 flex gap-1">
          {globalProductionQueue.value.map((item, i) => (
            <div
              key={item.entityId !== undefined ? `prod-${item.entityId}` : `prod-${item.unitLabel}-${i}`}
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

      {/* Idle worker button */}
      {idleWorkerCount.value > 0 && (
        <button
          type="button"
          id="idle-worker-btn"
          class="absolute top-14 right-2 md:right-6 ui-panel border-2 border-amber-600 px-3 py-1 md:px-4 md:py-2 rounded-full text-amber-400 font-bold z-20 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
          title="Select idle worker (.)"
          onClick={props.onIdleWorkerClick}
        >
          <span class="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
          <span class="text-xs md:text-sm">{idleWorkerCount} Idle</span>
        </button>
      )}

      {/* Army select button */}
      {armyCount.value > 0 && (
        <button
          type="button"
          id="select-army-btn"
          class="absolute top-24 md:top-28 right-2 md:right-6 ui-panel border-2 border-red-600 px-3 py-1 md:px-4 md:py-2 rounded-full text-red-400 font-bold z-20 flex items-center gap-2 hover:bg-slate-700 transition-colors shadow-lg cursor-pointer"
          title="Select all army (,)"
          onClick={props.onArmyClick}
        >
          <span class="text-xs md:text-sm">Army ({armyCount})</span>
        </button>
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