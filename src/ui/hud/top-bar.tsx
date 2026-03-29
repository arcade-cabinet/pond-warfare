/**
 * TopBar - Resource display (clams, twigs, food), status text (peaceful/hunting),
 * speed/pause/mute/CB/save/load/settings buttons.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  clams,
  colorBlindMode,
  foodAtCap,
  foodDisplay,
  gameTimeDisplay,
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
} from '../store';

export interface TopBarProps {
  onSpeedClick?: () => void;
  onMuteClick?: () => void;
  onColorBlindToggle?: () => void;
  onPauseClick?: () => void;
  onSaveClick?: () => void;
  onLoadClick?: () => void;
  onSettingsClick?: () => void;
}

export function TopBar(props: TopBarProps) {
  const clamsRate = rateClams.value;
  const twigsRate = rateTwigs.value;

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
    <div class="absolute top-0 left-0 w-full h-10 md:h-12 ui-panel border-0 border-b-2 md:border-b-4 flex items-center justify-between px-2 md:px-6 z-20 bg-opacity-95 text-xs md:text-sm">
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
  );
}
