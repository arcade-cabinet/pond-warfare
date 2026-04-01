/**
 * TopBar Controls — Status display, speed/pause/mute buttons, and secondary controls.
 */

import {
  colorBlindMode,
  gameTimeDisplay,
  hasSaveGame,
  isPeaceful,
  muteLabel,
  paused,
  peaceStatusColor,
  peaceStatusStyle,
  peaceStatusText,
  speedLabel,
  waveCountdown,
} from '../store';
import type { TopBarProps } from './top-bar';

export function TopBarControls({ props, compact }: { props: TopBarProps; compact: boolean }) {
  const hasSave = hasSaveGame.value;

  return (
    <div class="flex items-center space-x-2 md:space-x-4">
      <div class={peaceStatusColor.value} style={peaceStatusStyle.value}>
        <span class="font-heading text-xs md:text-sm">{peaceStatusText}</span>
        {!isPeaceful.value && waveCountdown.value > 0 && (
          <span
            class="ml-2 font-numbers text-[10px] md:text-xs"
            style={{
              color: waveCountdown.value < 10 ? 'var(--pw-enemy-light)' : 'var(--pw-warning)',
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
          class="hud-btn text-[10px] md:text-xs px-2 py-0.5 min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-0 rounded font-bold flex items-center justify-center"
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
          class="hud-btn text-[10px] md:text-xs px-2 py-0.5 min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-0 rounded font-bold flex items-center justify-center font-numbers"
          style={{ color: 'var(--pw-accent)' }}
          title="Game Speed (F)"
          onClick={props.onSpeedClick}
        >
          {speedLabel}
        </button>
        <button
          type="button"
          id="mute-btn"
          class="hud-btn text-[10px] md:text-xs px-2 py-0.5 min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-0 rounded flex items-center justify-center"
          title="Toggle Sound (M)"
          onClick={props.onMuteClick}
        >
          {muteLabel}
        </button>
        <button
          type="button"
          class="hud-btn text-sm px-2 py-0.5 min-w-[36px] min-h-[36px] md:min-w-[32px] md:min-h-0 rounded font-bold flex items-center justify-center"
          style={{ color: 'var(--pw-accent)' }}
          title="Command Panel"
          onClick={props.onPanelToggle}
        >
          {'\u2630'}
        </button>

        {!compact && (
          <>
            <button
              type="button"
              id="cb-btn"
              class="hud-btn text-[10px] md:text-xs px-2 py-0.5 rounded font-bold flex items-center justify-center"
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
              class="hud-btn text-[10px] md:text-xs px-2 py-0.5 rounded font-bold flex items-center justify-center"
              style={{ color: 'var(--pw-success)' }}
              title="Save Game"
              onClick={props.onSaveClick}
            >
              Save
            </button>
            <button
              type="button"
              id="load-btn"
              class={`hud-btn text-[10px] md:text-xs px-2 py-0.5 rounded font-bold flex items-center justify-center ${hasSave ? '' : 'opacity-35 cursor-not-allowed'}`}
              style={{ color: hasSave ? 'var(--pw-warning)' : 'var(--pw-text-muted)' }}
              title="Load Game"
              disabled={!hasSave}
              onClick={props.onLoadClick}
            >
              Load
            </button>
            <button
              type="button"
              id="settings-btn"
              class="hud-btn text-[10px] md:text-xs px-2 py-0.5 rounded flex items-center justify-center"
              title="Settings"
              onClick={props.onSettingsClick}
            >
              {'\u2699'}
            </button>
            <button
              type="button"
              id="keyboard-ref-btn"
              class="hud-btn text-[10px] md:text-xs px-2 py-0.5 rounded font-bold flex items-center justify-center"
              style={{ color: 'var(--pw-text-muted)' }}
              title="Keyboard Shortcuts"
              onClick={props.onKeyboardRefClick}
            >
              ?
            </button>
          </>
        )}
      </div>
    </div>
  );
}
