/**
 * MenuTab — Tech tree, save, load, settings, keyboard ref.
 *
 * Improved layout: resource summary at top, grouped action buttons,
 * tech tree button with researchable-count badge, compact toggles.
 */

import { GameButton } from '../components/GameButton';
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
          <span class="font-numbers text-[10px] font-bold" style={{ color: 'var(--pw-pearl)' }}>
            {pearls}P
          </span>
        )}
        <span class="font-heading text-[9px] font-bold" style={{ color: 'var(--pw-accent)' }}>
          {gameTimeDisplay}
        </span>
      </div>

      {/* Tech Tree — prominent */}
      <GameButton
        label="TECH TREE"
        onClick={openTechTree}
        variant="secondary"
        class="w-full"
        testId="menu-tech-tree-btn"
      />

      {/* Save / Load row */}
      <div class="flex gap-1">
        <GameButton
          label="Save"
          onClick={quickSave}
          variant="secondary"
          size="sm"
          class="flex-1"
          testId="menu-save-btn"
        />
        <GameButton
          label="Load"
          onClick={quickLoad}
          variant="secondary"
          size="sm"
          disabled={!hasSave}
          class="flex-1"
          testId="menu-load-btn"
        />
      </div>

      {/* Settings + Keyboard Ref row */}
      <div class="flex gap-1">
        <GameButton
          label="Settings"
          onClick={openSettings}
          variant="ghost"
          size="sm"
          class="flex-1"
          testId="menu-settings-btn"
        />
        <GameButton
          label="Keys"
          onClick={openKeyboardRef}
          variant="ghost"
          size="sm"
          class="flex-1"
          testId="menu-keys-btn"
        />
      </div>

      {/* Stats row */}
      <div class="flex gap-1">
        <GameButton
          label="Achieve"
          onClick={openAchievements}
          variant="ghost"
          size="sm"
          class="flex-1"
          testId="menu-achieve-btn"
        />
        <GameButton
          label="Ranks"
          onClick={openLeaderboard}
          variant="ghost"
          size="sm"
          class="flex-1"
          testId="menu-ranks-btn"
        />
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
