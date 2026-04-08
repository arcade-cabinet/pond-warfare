/**
 * Overlays - Pause overlay, attack-move banner, enemy economy display,
 * objective bar (nest destruction or wave survival).
 */

import {
  attackMoveActive,
  destroyedEnemyNests,
  enemyEconomyVisible,
  enemyFish,
  enemyLogs,
  fpsCounterVisible,
  fpsDisplay,
  nestJustDestroyed,
  paused,
  peaceWarningCountdown,
  totalEnemyNests,
} from '../store';
import { currentWaveNumber, waveSurvivalMode, waveSurvivalTarget } from '../store-v3';

export function Overlays() {
  const total = totalEnemyNests.value;
  const destroyed = destroyedEnemyNests.value;
  const justDestroyed = nestJustDestroyed.value;
  const isSurvival = waveSurvivalMode.value;
  const waveNum = currentWaveNumber.value;
  const waveTarget = waveSurvivalTarget.value;

  // Show objective bar in either mode
  const showObjective = isSurvival || total > 0;

  return (
    <>
      {/* Objective bar - persistent display at top-center */}
      {showObjective && (
        <div
          class={`absolute top-10 md:top-11 left-1/2 -translate-x-1/2 z-15 flex items-center gap-2 rounded px-3 py-1 text-[10px] md:text-xs whitespace-nowrap${justDestroyed ? ' animate-pulse' : ''}`}
          style={{
            background: 'var(--pw-overlay-75)',
            border: justDestroyed ? '2px solid var(--pw-accent)' : '1px solid var(--pw-border)',
          }}
        >
          <span
            class="font-heading font-bold tracking-wide"
            style={{ color: justDestroyed ? 'var(--pw-accent)' : 'var(--pw-text-secondary)' }}
          >
            {isSurvival
              ? `Survive Waves: ${waveNum}/${waveTarget}`
              : justDestroyed
                ? `${destroyed}/${total} Nests Destroyed!`
                : `Destroy Enemy Nests: ${destroyed}/${total}`}
          </span>
        </div>
      )}

      {/* Enemy economy indicator (visible after recon reveals a nest) */}
      {enemyEconomyVisible.value && (
        <div
          class="absolute top-14 md:top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded px-2 py-0.5 text-[10px] md:text-xs"
          style={{
            background: 'var(--pw-overlay-dark)',
            border: '1px solid var(--pw-enemy)',
          }}
        >
          <span class="font-heading font-bold" style={{ color: 'var(--pw-enemy-light)' }}>
            Enemy:
          </span>
          <div class="flex items-center gap-1">
            <div
              class="w-2 h-2 rounded-full"
              style={{ background: 'var(--pw-clam)', border: '1px solid var(--pw-otter-light)' }}
            />
            <span class="font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
              {enemyFish}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <div
              class="w-2 h-2"
              style={{ background: 'var(--pw-twig)', border: '1px solid var(--pw-otter)' }}
            />
            <span class="font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
              {enemyLogs}
            </span>
          </div>
        </div>
      )}

      {/* Enemy wave incoming warning banner */}
      {peaceWarningCountdown.value > 0 && (
        <div
          aria-live="assertive"
          class="absolute top-20 md:top-22 left-1/2 -translate-x-1/2 z-25 px-4 py-1 rounded font-heading font-bold text-xs md:text-sm whitespace-nowrap animate-pulse"
          style={{
            background: 'var(--pw-wave-warning-bg)',
            border: '2px solid var(--pw-warning)',
            color: 'var(--pw-warning)',
          }}
        >
          ENEMIES APPROACHING <span class="font-numbers ml-1">{peaceWarningCountdown.value}s</span>
        </div>
      )}

      {/* Attack-move mode banner */}
      {attackMoveActive.value && (
        <div
          class="absolute top-12 md:top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-1 rounded font-heading font-bold text-xs md:text-sm whitespace-nowrap"
          style={{
            background: 'var(--pw-defeat-glow-80)',
            border: '1px solid var(--pw-enemy-light)',
            color: 'var(--pw-enemy-light)',
          }}
        >
          ATTACK MOVE - Click target or Esc to cancel
        </div>
      )}

      {/* Pause overlay */}
      {paused.value && (
        <button
          type="button"
          class="absolute inset-0 z-50 flex flex-col items-center justify-center cursor-pointer border-none"
          style={{ background: 'var(--pw-overlay-60)' }}
          onClick={() => {
            paused.value = false;
          }}
          aria-label="Tap to resume"
        >
          <span
            class="font-title text-6xl font-bold tracking-widest"
            style={{ color: 'var(--pw-text-primary)' }}
          >
            PAUSED
          </span>
          <span class="font-game text-sm mt-4" style={{ color: 'var(--pw-text-muted)' }}>
            Tap to resume
          </span>
        </button>
      )}

      {/* FPS counter (toggle with F12) */}
      {fpsCounterVisible.value && (
        <div
          class="absolute bottom-2 right-2 z-40 px-2 py-1 rounded font-numbers text-xs"
          style={{
            background: 'var(--pw-shadow-heavy)',
            color:
              fpsDisplay.value >= 50
                ? 'var(--pw-fps-good)'
                : fpsDisplay.value >= 30
                  ? 'var(--pw-hp-mid)'
                  : 'var(--pw-hp-low)',
          }}
        >
          {fpsDisplay.value} FPS
        </div>
      )}
    </>
  );
}
