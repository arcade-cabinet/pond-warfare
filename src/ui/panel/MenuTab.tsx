/**
 * MenuTab — Tech tree, save, load, settings, keyboard ref.
 */

import {
  openSettings,
  openTechTree,
  quickLoad,
  quickSave,
  toggleColorBlind,
} from '../game-actions';
import { colorBlindMode, hasSaveGame } from '../store';

export function MenuTab() {
  const hasSave = hasSaveGame.value;

  return (
    <div class="flex flex-col gap-2 p-2">
      <button
        type="button"
        class="action-btn w-full py-2 rounded font-heading font-bold text-xs tracking-wider min-h-[44px]"
        style={{ color: 'var(--pw-accent)' }}
        onClick={openTechTree}
      >
        &#x1F4DC; TECH TREE
      </button>

      <div class="flex gap-1">
        <button
          type="button"
          class="action-btn flex-1 py-2 rounded font-bold text-[10px] min-h-[44px]"
          style={{ color: 'var(--pw-success)' }}
          onClick={quickSave}
        >
          Save
        </button>
        <button
          type="button"
          class={`action-btn flex-1 py-2 rounded font-bold text-[10px] min-h-[44px] ${hasSave ? '' : 'opacity-35 cursor-not-allowed'}`}
          style={{ color: hasSave ? 'var(--pw-warning)' : 'var(--pw-text-muted)' }}
          disabled={!hasSave}
          onClick={quickLoad}
        >
          Load
        </button>
      </div>

      <button
        type="button"
        class="action-btn w-full py-2 rounded font-bold text-[10px] min-h-[44px]"
        onClick={openSettings}
      >
        &#x2699; Settings
      </button>

      <button
        type="button"
        class={`action-btn w-full py-2 rounded font-bold text-[10px] min-h-[44px] ${colorBlindMode.value ? 'opacity-100' : 'opacity-60'}`}
        style={{ color: colorBlindMode.value ? 'var(--pw-accent)' : 'var(--pw-text-muted)' }}
        onClick={toggleColorBlind}
      >
        {colorBlindMode.value ? '\u2713 ' : ''}Color Blind
      </button>
    </div>
  );
}
