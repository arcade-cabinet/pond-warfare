/**
 * Overlays - Pause overlay, attack-move banner, enemy economy display.
 */

import { attackMoveActive, enemyClams, enemyEconomyVisible, enemyTwigs, paused } from '../store';

export function Overlays() {
  return (
    <>
      {/* Enemy economy indicator (visible after scouting a nest) */}
      {enemyEconomyVisible.value && (
        <div class="absolute top-11 md:top-12 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-slate-900 bg-opacity-80 border border-red-800 rounded px-2 py-0.5 text-[10px] md:text-xs">
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
