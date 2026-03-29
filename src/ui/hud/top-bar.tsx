/**
 * TopBar - Resource display (clams, twigs, food), status text (peaceful/hunting),
 * speed/pause/mute/CB/save/load/settings buttons.
 *
 * Wood panel background with carved-stone buttons and JetBrains Mono resource numbers.
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

  const hasSave = localStorage.getItem('pond-warfare-save');

  return (
    <div
      class="absolute top-0 left-0 w-full h-11 md:h-12 wood-panel border-0 border-b-2 md:border-b-3 flex items-center justify-between px-2 md:px-6 z-20 text-xs md:text-sm"
      style={{ borderBottomColor: 'var(--pw-border)' }}
    >
      {/* Resources */}
      <div class="flex space-x-3 md:space-x-6">
        {/* Clams */}
        <div class="flex items-center space-x-1 md:space-x-2">
          <div
            class="w-3 h-3 md:w-4 md:h-4 rounded-full shadow-sm"
            style={{
              background: 'radial-gradient(circle at 35% 35%, var(--pw-clam), #b8a030)',
              border: '1px solid var(--pw-otter-light)',
              boxShadow: '0 0 4px rgba(240, 208, 96, 0.3)',
            }}
          />
          <span class="hidden md:inline font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Clams:{' '}
          </span>
          <span
            class={`font-numbers font-bold ${clamsFlash ? 'animate-resource-flash' : ''}`}
            style={{ color: 'var(--pw-clam)' }}
          >
            {clams}
          </span>
          {lowClams.value && (
            <span
              class="font-bold animate-pulse"
              style={{ color: 'var(--pw-warning)' }}
              title="Low clams!"
            >
              !
            </span>
          )}
          {clamsRate !== 0 && (
            <span
              class="text-[10px] hidden md:inline font-numbers"
              style={{
                color: clamsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)',
              }}
            >
              {clamsRate >= 0 ? `+${clamsRate}` : clamsRate}
            </span>
          )}
        </div>

        {/* Twigs */}
        <div class="flex items-center space-x-1 md:space-x-2">
          <div
            class="w-3 h-3 md:w-4 md:h-4 shadow-sm"
            style={{
              background:
                'linear-gradient(135deg, var(--pw-twig), #8a4820)',
              border: '1px solid var(--pw-otter)',
            }}
          />
          <span class="hidden md:inline font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Twigs:{' '}
          </span>
          <span
            class={`font-numbers font-bold ${twigsFlash ? 'animate-resource-flash' : ''}`}
            style={{ color: 'var(--pw-twig)' }}
          >
            {twigs}
          </span>
          {lowTwigs.value && (
            <span
              class="font-bold animate-pulse"
              style={{ color: 'var(--pw-warning)' }}
              title="Low twigs!"
            >
              !
            </span>
          )}
          {twigsRate !== 0 && (
            <span
              class="text-[10px] hidden md:inline font-numbers"
              style={{
                color: twigsRate >= 0 ? 'var(--pw-success)' : 'var(--pw-enemy-light)',
              }}
            >
              {twigsRate >= 0 ? `+${twigsRate}` : twigsRate}
            </span>
          )}
        </div>

        {/* Food */}
        <div class="flex items-center space-x-1 md:space-x-2">
          <div
            class="w-3 h-3 md:w-4 md:h-4 rounded-sm shadow-sm"
            style={{
              background: 'radial-gradient(circle at 35% 35%, var(--pw-food), #a03030)',
              border: '1px solid var(--pw-enemy-light)',
            }}
          />
          <span class="hidden md:inline font-game" style={{ color: 'var(--pw-text-secondary)' }}>
            Food:{' '}
          </span>
          <span
            class="font-numbers font-bold"
            style={{
              color: foodAtCap.value ? 'var(--pw-enemy)' : 'var(--pw-food)',
            }}
          >
            {foodDisplay}
          </span>
        </div>
      </div>

      {/* Status + Controls */}
      <div class="flex items-center space-x-2 md:space-x-4">
        <div class={peaceStatusColor.value}>
          <span class="font-heading text-xs md:text-sm">{peaceStatusText}</span>
          {!isPeaceful.value && waveCountdown.value > 0 && (
            <span
              class="ml-2 font-numbers text-[10px] md:text-xs"
              style={{
                color:
                  waveCountdown.value < 10
                    ? 'var(--pw-enemy-light)'
                    : 'var(--pw-warning)',
              }}
            >
              Wave in {waveCountdown.value}s
            </span>
          )}
        </div>
        <div class="font-heading text-xs md:text-sm font-bold" style={{ color: 'var(--pw-accent)' }}>
          {gameTimeDisplay}
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            id="pause-btn"
            class={`hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded font-bold flex items-center justify-center`}
            style={{
              background: paused.value
                ? 'linear-gradient(180deg, var(--pw-twig), #8a4820)'
                : undefined,
              borderColor: paused.value ? 'var(--pw-otter)' : undefined,
              color: paused.value ? 'var(--pw-otter-light)' : undefined,
            }}
            title="Pause (P)"
            onClick={props.onPauseClick}
          >
            {paused.value ? '\u25B6' : '\u23F8'}
          </button>
          <button
            type="button"
            id="speed-btn"
            class="hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded font-bold flex items-center justify-center font-numbers"
            style={{ color: 'var(--pw-accent)' }}
            title="Game Speed (F)"
            onClick={props.onSpeedClick}
          >
            {speedLabel}
          </button>
          <button
            type="button"
            id="mute-btn"
            class="hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded flex items-center justify-center"
            title="Toggle Sound (M)"
            onClick={props.onMuteClick}
          >
            {muteLabel}
          </button>
          <button
            type="button"
            id="cb-btn"
            class="hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded font-bold flex items-center justify-center"
            style={{
              background: colorBlindMode.value
                ? 'linear-gradient(180deg, var(--pw-twig), #8a4820)'
                : undefined,
              borderColor: colorBlindMode.value ? 'var(--pw-otter)' : undefined,
              color: colorBlindMode.value ? 'var(--pw-otter-light)' : 'var(--pw-text-muted)',
            }}
            title="Color Blind Mode"
            onClick={props.onColorBlindToggle}
          >
            CB
          </button>
          <button
            type="button"
            id="save-btn"
            class="hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded font-bold flex items-center justify-center"
            style={{ color: 'var(--pw-success)' }}
            title="Save Game"
            onClick={props.onSaveClick}
          >
            Save
          </button>
          <button
            type="button"
            id="load-btn"
            class={`hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded font-bold flex items-center justify-center ${
              hasSave ? '' : 'opacity-35 cursor-not-allowed'
            }`}
            style={{
              color: hasSave ? 'var(--pw-warning)' : 'var(--pw-text-muted)',
            }}
            title="Load Game"
            disabled={!hasSave}
            onClick={props.onLoadClick}
          >
            Load
          </button>
          <button
            type="button"
            id="settings-btn"
            class="hud-btn text-[10px] md:text-xs px-2 py-1 min-w-[44px] min-h-[44px] md:min-h-0 md:py-0.5 rounded flex items-center justify-center"
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
