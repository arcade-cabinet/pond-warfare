/**
 * HUD - Top Bar Component
 *
 * Resource display with rate indicators, clock display (Day X - HH:MM),
 * status (Peaceful/Hunting), speed button, mute button.
 * Reads from store signals.
 */

import {
  armyCount,
  clams,
  foodAtCap,
  foodDisplay,
  gameTimeDisplay,
  idleWorkerCount,
  muteLabel,
  peaceStatusColor,
  peaceStatusText,
  rateClams,
  rateTwigs,
  speedLabel,
  twigs,
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
          <div class={peaceStatusColor.value}>{peaceStatusText}</div>
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
          </div>
        </div>
      </div>

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
    </>
  );
}
