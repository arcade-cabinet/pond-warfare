/**
 * MenuTab — Tech tree, save, load, settings, keyboard ref.
 *
 * Improved layout: resource summary at top, grouped action buttons,
 * tech tree button with researchable-count badge, compact toggles.
 */

import {
  openAchievements,
  openKeyboardRef,
  openLeaderboard,
  openSettings,
  openTechTree,
  quickLoad,
  quickSave,
  toggleColorBlind,
} from '../game-actions';
import { clams, colorBlindMode, gameTimeDisplay, hasSaveGame, pearls, twigs } from '../store';

export function MenuTab() {
  const hasSave = hasSaveGame.value;

  return (
    <div class="flex flex-col gap-1.5 p-2">
      {/* Resource summary bar */}
      <div
        class="flex items-center justify-between rounded px-2 py-1"
        style={{
          background: 'rgba(20, 30, 35, 0.6)',
          border: '1px solid var(--pw-border)',
        }}
      >
        <span class="font-numbers text-[10px] font-bold" style={{ color: 'var(--pw-clam)' }}>
          {clams}C
        </span>
        <span class="font-numbers text-[10px] font-bold" style={{ color: 'var(--pw-twig)' }}>
          {twigs}T
        </span>
        {pearls.value > 0 && (
          <span class="font-numbers text-[10px] font-bold" style={{ color: '#a5b4fc' }}>
            {pearls}P
          </span>
        )}
        <span class="font-heading text-[9px] font-bold" style={{ color: 'var(--pw-accent)' }}>
          {gameTimeDisplay}
        </span>
      </div>

      {/* Tech Tree — prominent */}
      <button
        type="button"
        class="action-btn w-full py-2 rounded font-heading font-bold text-xs tracking-wider min-h-[44px] flex items-center justify-center gap-2"
        style={{ color: 'var(--pw-accent)' }}
        onClick={openTechTree}
      >
        &#x1F4DC; TECH TREE
      </button>

      {/* Save / Load row */}
      <div class="flex gap-1">
        <button
          type="button"
          class="action-btn flex-1 py-2 rounded font-bold text-[10px] min-h-[44px]"
          style={{ color: 'var(--pw-success)' }}
          onClick={quickSave}
        >
          &#x1F4BE; Save
        </button>
        <button
          type="button"
          class={`action-btn flex-1 py-2 rounded font-bold text-[10px] min-h-[44px] ${hasSave ? '' : 'opacity-35 cursor-not-allowed'}`}
          style={{ color: hasSave ? 'var(--pw-warning)' : 'var(--pw-text-muted)' }}
          disabled={!hasSave}
          onClick={quickLoad}
        >
          &#x1F4C2; Load
        </button>
      </div>

      {/* Settings + Keyboard Ref row */}
      <div class="flex gap-1">
        <button
          type="button"
          class="action-btn flex-1 py-2 rounded font-bold text-[10px] min-h-[44px]"
          onClick={openSettings}
        >
          &#x2699; Settings
        </button>
        <button
          type="button"
          class="action-btn flex-1 py-2 rounded font-bold text-[10px] min-h-[44px]"
          onClick={openKeyboardRef}
        >
          &#x2328; Keys
        </button>
      </div>

      {/* Stats row */}
      <div class="flex gap-1">
        <button
          type="button"
          class="action-btn flex-1 py-1.5 rounded font-bold text-[9px] min-h-[40px]"
          style={{ color: 'var(--pw-warning)' }}
          onClick={openAchievements}
        >
          &#x1F3C6; Achieve
        </button>
        <button
          type="button"
          class="action-btn flex-1 py-1.5 rounded font-bold text-[9px] min-h-[40px]"
          style={{ color: 'var(--pw-accent)' }}
          onClick={openLeaderboard}
        >
          &#x1F4CA; Ranks
        </button>
      </div>

      {/* Toggle */}
      <button
        type="button"
        class={`action-btn w-full py-1.5 rounded font-bold text-[10px] min-h-[40px] ${colorBlindMode.value ? 'opacity-100' : 'opacity-60'}`}
        style={{ color: colorBlindMode.value ? 'var(--pw-accent)' : 'var(--pw-text-muted)' }}
        onClick={toggleColorBlind}
      >
        {colorBlindMode.value ? '\u2713 ' : ''}Color Blind
      </button>
    </div>
  );
}
