/**
 * Overlays - Pause overlay, attack-move banner, enemy economy display, objective bar.
 */

import {
  attackMoveActive,
  destroyedEnemyNests,
  enemyClams,
  enemyEconomyVisible,
  enemyTwigs,
  fpsCounterVisible,
  fpsDisplay,
  nestJustDestroyed,
  paused,
  peaceWarningCountdown,
  totalEnemyNests,
} from '../store';

export function Overlays() {
  const total = totalEnemyNests.value;
  const destroyed = destroyedEnemyNests.value;
  const justDestroyed = nestJustDestroyed.value;

  return (
    <>
      {/* Objective bar - persistent display at top-center */}
      {total > 0 && (
        <div
          class={`absolute top-10 md:top-11 left-1/2 -translate-x-1/2 z-15 flex items-center gap-2 rounded px-3 py-1 text-[10px] md:text-xs whitespace-nowrap${justDestroyed ? ' animate-pulse' : ''}`}
          style={{
            background: 'rgba(12, 26, 31, 0.75)',
            border: justDestroyed ? '2px solid var(--pw-accent)' : '1px solid var(--pw-border)',
          }}
        >
          <span
            class="font-heading font-bold tracking-wide"
            style={{ color: justDestroyed ? 'var(--pw-accent)' : 'var(--pw-text-secondary)' }}
          >
            {justDestroyed
              ? `${destroyed}/${total} Nests Destroyed!`
              : `Destroy Enemy Nests: ${destroyed}/${total}`}
          </span>
        </div>
      )}

      {/* Enemy economy indicator (visible after scouting a nest) */}
      {enemyEconomyVisible.value && (
        <div
          class="absolute top-14 md:top-16 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded px-2 py-0.5 text-[10px] md:text-xs"
          style={{
            background: 'rgba(12, 26, 31, 0.85)',
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
              {enemyClams}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <div
              class="w-2 h-2"
              style={{ background: 'var(--pw-twig)', border: '1px solid var(--pw-otter)' }}
            />
            <span class="font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
              {enemyTwigs}
            </span>
          </div>
        </div>
      )}

      {/* Enemy wave incoming warning banner */}
      {peaceWarningCountdown.value > 0 && (
        <div
          class="absolute top-20 md:top-22 left-1/2 -translate-x-1/2 z-25 px-4 py-1 rounded font-heading font-bold text-xs md:text-sm whitespace-nowrap animate-pulse"
          style={{
            background: 'rgba(180, 120, 20, 0.85)',
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
            background: 'rgba(192, 48, 48, 0.8)',
            border: '1px solid var(--pw-enemy-light)',
            color: 'var(--pw-enemy-light)',
          }}
        >
          ATTACK MOVE - Click target or Esc to cancel
        </div>
      )}

      {/* Pause overlay */}
      {paused.value && (
        <div
          class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: 'rgba(12, 26, 31, 0.6)' }}
        >
          <span
            class="font-title text-6xl font-bold tracking-widest"
            style={{ color: 'var(--pw-text-primary)' }}
          >
            PAUSED
          </span>
        </div>
      )}

      {/* FPS counter (toggle with F12) */}
      {fpsCounterVisible.value && (
        <div
          class="absolute bottom-2 right-2 z-40 px-2 py-1 rounded font-numbers text-xs"
          style={{
            background: 'rgba(0, 0, 0, 0.6)',
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
