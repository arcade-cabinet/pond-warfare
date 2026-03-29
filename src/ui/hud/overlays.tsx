/**
 * Overlays - Pause overlay, attack-move banner, enemy economy display.
 */

import { attackMoveActive, enemyClams, enemyEconomyVisible, enemyTwigs, paused } from '../store';

export function Overlays() {
  return (
    <>
      {/* Enemy economy indicator (visible after scouting a nest) */}
      {enemyEconomyVisible.value && (
        <div
          class="absolute top-11 md:top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded px-2 py-0.5 text-[10px] md:text-xs"
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
    </>
  );
}
