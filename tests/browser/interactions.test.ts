/**
 * Player Interaction Coverage Matrix
 *
 * Verifies every mouse-clickable interaction in the game UI works correctly.
 * All interactions use mouse clicks only (never keyboard) to test mobile-first design.
 * Each test clicks an element and asserts the expected state change.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ActionPanel, actionButtons, queueItems } from '@/ui/action-panel';
import { GameOverBanner } from '@/ui/game-over';
import { HUD } from '@/ui/hud';
import { KeyboardReference } from '@/ui/keyboard-reference';
import { NewGameModal } from '@/ui/new-game-modal';
import { SelectionPanel } from '@/ui/selection-panel';
import { SettingsPanel } from '@/ui/settings-panel';
import * as store from '@/ui/store';

// Mock animation module
vi.mock('@/rendering/animations', () => new Proxy({}, { get: () => vi.fn() }));

import '@/styles/main.css';

/** Reset all store signals to default/neutral state */
function resetStore() {
  store.clams.value = 200;
  store.twigs.value = 50;
  store.pearls.value = 0;
  store.food.value = 0;
  store.maxFood.value = 0;
  store.rateClams.value = 0;
  store.rateTwigs.value = 0;
  store.enemyClams.value = 0;
  store.enemyTwigs.value = 0;
  store.enemyEconomyVisible.value = false;
  store.selectionCount.value = 0;
  store.selectionName.value = 'No Selection';
  store.selectionNameColor.value = 'text-slate-500';
  store.selectionHp.value = 0;
  store.selectionMaxHp.value = 0;
  store.selectionShowHpBar.value = false;
  store.selectionStatsHtml.value = '';
  store.selectionDesc.value = '';
  store.selectionIsMulti.value = false;
  store.selectionSpriteData.value = null;
  store.selectionKills.value = 0;
  store.selectionComposition.value = '';
  store.selectionMiniGrid.value = [];
  store.gameState.value = 'playing';
  store.gameDay.value = 1;
  store.gameTimeDisplay.value = 'Day 1 - 08:00';
  store.isPeaceful.value = true;
  store.peaceCountdown.value = 0;
  store.gameSpeed.value = 1;
  store.muted.value = false;
  store.paused.value = false;
  store.waveCountdown.value = -1;
  store.lowClams.value = false;
  store.lowTwigs.value = false;
  store.attackMoveActive.value = false;
  store.idleWorkerCount.value = 0;
  store.armyCount.value = 0;
  store.hasPlayerUnits.value = false;
  store.idleGathererCount.value = 0;
  store.idleCombatCount.value = 0;
  store.idleHealerCount.value = 0;
  store.idleScoutCount.value = 0;
  store.autoMenuExpanded.value = false;
  store.radialMenuOpen.value = false;
  store.radialMenuX.value = 0;
  store.radialMenuY.value = 0;
  store.autoGatherEnabled.value = false;
  store.autoBuildEnabled.value = false;
  store.autoDefendEnabled.value = false;
  store.autoAttackEnabled.value = false;
  store.autoHealEnabled.value = false;
  store.autoScoutEnabled.value = false;
  store.goTitle.value = 'Victory';
  store.goTitleColor.value = 'text-amber-400';
  store.goDesc.value = '';
  store.goStatsText.value = '';
  store.goStatLines.value = [];
  store.goRating.value = 0;
  store.goTimeSurvived.value = '';
  store.goFrameCount.value = 0;
  store.tooltipVisible.value = false;
  store.tooltipData.value = null;
  store.tooltipX.value = 0;
  store.tooltipY.value = 0;
  store.ctrlGroupCounts.value = {};
  store.globalProductionQueue.value = [];
  store.colorBlindMode.value = false;
  store.menuState.value = 'playing';
  store.keyboardRefOpen.value = false;
  store.settingsOpen.value = false;
  store.selectedDifficulty.value = 'normal';
  store.permadeathEnabled.value = false;
  store.masterVolume.value = 80;
  store.musicVolume.value = 50;
  store.sfxVolume.value = 80;
  actionButtons.value = [];
  queueItems.value = [];
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

function must<T>(value: T | null | undefined, message: string): T {
  if (value == null) {
    throw new Error(message);
  }
  return value;
}

// ---------------------------------------------------------------------------
// HUD Button Interactions
// ---------------------------------------------------------------------------
describe('HUD button interactions', () => {
  it('speed button click calls onSpeedClick', async () => {
    const onSpeedClick = vi.fn();
    store.gameTimeDisplay.value = 'Day 1 - 08:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick,
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const speedBtn = must(document.getElementById('speed-btn'), 'Missing speed button');
    expect(speedBtn).toBeTruthy();
    speedBtn.click();
    expect(onSpeedClick).toHaveBeenCalledTimes(1);
  });

  it('pause button click calls onPauseClick', async () => {
    const onPauseClick = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick,
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const pauseBtn = must(document.getElementById('pause-btn'), 'Missing pause button');
    expect(pauseBtn).toBeTruthy();
    pauseBtn.click();
    expect(onPauseClick).toHaveBeenCalledTimes(1);
  });

  it('mute button click calls onMuteClick', async () => {
    const onMuteClick = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick,
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const muteBtn = must(document.getElementById('mute-btn'), 'Missing mute button');
    expect(muteBtn).toBeTruthy();
    muteBtn.click();
    expect(onMuteClick).toHaveBeenCalledTimes(1);
  });

  it('color blind button click calls onColorBlindToggle', async () => {
    const onColorBlindToggle = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle,
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const cbBtn = must(document.getElementById('cb-btn'), 'Missing color blind button');
    expect(cbBtn).toBeTruthy();
    cbBtn.click();
    expect(onColorBlindToggle).toHaveBeenCalledTimes(1);
  });

  it('army select button click calls onArmyClick', async () => {
    const onArmyClick = vi.fn();
    store.armyCount.value = 5;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick,
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const armyBtn = must(document.getElementById('select-army-btn'), 'Missing select army button');
    expect(armyBtn).toBeTruthy();
    armyBtn.click();
    expect(onArmyClick).toHaveBeenCalledTimes(1);
  });

  it('attack-move button click calls onAttackMoveClick', async () => {
    const onAttackMoveClick = vi.fn();
    store.hasPlayerUnits.value = true;
    store.selectionCount.value = 3;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick,
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const aMoveBtn = must(document.getElementById('attack-move-btn'), 'Missing attack move button');
    expect(aMoveBtn).toBeTruthy();
    aMoveBtn.click();
    expect(onAttackMoveClick).toHaveBeenCalledTimes(1);
  });

  it('control group badge click calls onCtrlGroupClick with group number', async () => {
    const onCtrlGroupClick = vi.fn();
    store.ctrlGroupCounts.value = { 1: 4, 3: 7 };

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:80px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick,
        }),
      ),
    );

    // Click the first control group badge (group 1)
    const badges = document.querySelectorAll('[title^="Group"]');
    expect(badges.length).toBe(2);
    (badges[0] as HTMLButtonElement).click();
    expect(onCtrlGroupClick).toHaveBeenCalledWith(1);

    // Click the second control group badge (group 3)
    (badges[1] as HTMLButtonElement).click();
    expect(onCtrlGroupClick).toHaveBeenCalledWith(3);
  });
});

// ---------------------------------------------------------------------------
// Selection Panel Interactions
// ---------------------------------------------------------------------------
describe('Selection Panel interactions', () => {
  it('deselect X button click calls onDeselect', async () => {
    const onDeselect = vi.fn();
    store.selectionCount.value = 1;
    store.selectionName.value = 'Gatherer';
    store.selectionNameColor.value = 'text-green-400';

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect }),
      ),
    );

    // Find the X deselect button
    const xBtn = document.querySelector('#selection-info button') as HTMLButtonElement;
    expect(xBtn).toBeTruthy();
    expect(xBtn.textContent).toContain('X');
    xBtn.click();

    expect(onDeselect).toHaveBeenCalledTimes(1);
  });

  it('deselect button hidden when nothing selected', async () => {
    store.selectionCount.value = 0;

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: vi.fn() }),
      ),
    );

    const xBtn = document.querySelector('#selection-info button');
    expect(xBtn).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Action Panel Interactions
// ---------------------------------------------------------------------------
describe('Action Panel interactions', () => {
  it('affordable action button click calls onClick handler', async () => {
    const onClick = vi.fn();
    actionButtons.value = [
      {
        title: 'Lodge',
        cost: '150C 100T',
        hotkey: 'Q',
        affordable: true,
        description: 'Expansion',
        category: 'build',
        onClick,
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    const btn = document.querySelector('.action-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('unaffordable action button click does NOT call onClick', async () => {
    const onClick = vi.fn();
    actionButtons.value = [
      {
        title: 'Armory',
        cost: '200C 150T',
        hotkey: 'E',
        affordable: false,
        description: 'Train combat',
        category: 'build',
        onClick,
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    const btn = document.querySelector('.action-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.disabled).toBe(true);
    btn.click();

    expect(onClick).not.toHaveBeenCalled();
  });

  it('multiple action buttons each trigger correct handler', async () => {
    const onLodge = vi.fn();
    const onBurrow = vi.fn();
    const onArmory = vi.fn();

    actionButtons.value = [
      {
        title: 'Lodge',
        cost: '150C 100T',
        hotkey: 'Q',
        affordable: true,
        description: 'Expansion',
        category: 'build',
        onClick: onLodge,
      },
      {
        title: 'Burrow',
        cost: '75T',
        hotkey: 'W',
        affordable: true,
        description: 'Housing',
        category: 'build',
        onClick: onBurrow,
      },
      {
        title: 'Armory',
        cost: '200C 150T',
        hotkey: 'E',
        affordable: true,
        description: 'Train combat',
        category: 'build',
        onClick: onArmory,
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    const btns = document.querySelectorAll('.action-btn') as NodeListOf<HTMLButtonElement>;
    expect(btns.length).toBe(3);

    btns[0].click();
    expect(onLodge).toHaveBeenCalledTimes(1);
    expect(onBurrow).not.toHaveBeenCalled();

    btns[1].click();
    expect(onBurrow).toHaveBeenCalledTimes(1);

    btns[2].click();
    expect(onArmory).toHaveBeenCalledTimes(1);
  });

  it('training queue cancel button calls onCancel', async () => {
    const onCancel1 = vi.fn();
    const onCancel2 = vi.fn();

    actionButtons.value = [
      {
        title: 'Gatherer',
        cost: '50C 1F',
        hotkey: 'Q',
        affordable: true,
        description: 'Worker',
        category: 'train',
        onClick: vi.fn(),
      },
    ];
    queueItems.value = [
      { label: 'G', progressPct: 65, onCancel: onCancel1 },
      { label: 'G', progressPct: 0, onCancel: onCancel2 },
    ];

    render(
      h('div', { style: 'width:256px;height:300px;background:#1e293b' }, h(ActionPanel, null)),
    );

    // Find queue cancel buttons (exclude action-btns and tab buttons)
    const allBtns = document.querySelectorAll(
      '#action-panel .col-span-2 button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(allBtns.length).toBe(2);

    allBtns[0].click();
    expect(onCancel1).toHaveBeenCalledTimes(1);

    allBtns[1].click();
    expect(onCancel2).toHaveBeenCalledTimes(1);
  });

  it('action button hover shows tooltip, leave hides it', async () => {
    actionButtons.value = [
      {
        title: 'Lodge',
        cost: '150C 100T',
        hotkey: 'Q',
        affordable: true,
        description: 'Build a lodge',
        category: 'build',
        onClick: vi.fn(),
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    const btn = document.querySelector('.action-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();

    // Simulate mouseenter
    fireEvent.mouseEnter(btn, { clientX: 100, clientY: 100 });

    expect(store.tooltipVisible.value).toBe(true);
    expect(store.tooltipData.value).not.toBeNull();
    expect(store.tooltipData.value?.title).toBe('Lodge');
    expect(store.tooltipData.value?.cost).toBe('150C 100T');
    expect(store.tooltipData.value?.description).toBe('Build a lodge');
    expect(store.tooltipData.value?.hotkey).toBe('Q');

    // Simulate mouseleave
    fireEvent.mouseLeave(btn);

    expect(store.tooltipVisible.value).toBe(false);
    expect(store.tooltipData.value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Game Over Interactions
// ---------------------------------------------------------------------------
describe('Game Over interactions', () => {
  it('restart button click calls onRestart', async () => {
    const onRestart = vi.fn();
    store.gameState.value = 'win';
    store.goTitle.value = 'Victory';
    store.goTitleColor.value = 'text-amber-400';
    store.goDesc.value = 'All predator nests destroyed!';
    store.goStatLines.value = ['Time: 5 days', 'Kills: 20'];
    store.goRating.value = 3;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(GameOverBanner, { onRestart }),
      ),
    );

    const restartBtn = must(document.getElementById('restart-btn'), 'Missing restart button');
    expect(restartBtn).toBeTruthy();
    expect(restartBtn.textContent).toContain('Play Again');
    restartBtn.click();

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('game over banner hidden during playing state', async () => {
    store.gameState.value = 'playing';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(GameOverBanner, { onRestart: vi.fn() }),
      ),
    );

    const banner = document.getElementById('game-over-banner');
    expect(banner).toBeNull();
  });

  it('defeat state shows game over with restart', async () => {
    const onRestart = vi.fn();
    store.gameState.value = 'lose';
    store.goTitle.value = 'Defeat';
    store.goTitleColor.value = 'text-red-500';
    store.goDesc.value = 'All lodges destroyed!';
    store.goStatLines.value = ['Time: 3 days'];
    store.goRating.value = 1;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(GameOverBanner, { onRestart }),
      ),
    );

    const banner = document.getElementById('game-over-banner');
    expect(banner).toBeTruthy();

    const restartBtn = must(document.getElementById('restart-btn'), 'Missing restart button');
    restartBtn.click();
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// HUD conditional visibility checks
// ---------------------------------------------------------------------------
describe('HUD conditional element visibility', () => {
  it('idle worker button hidden when no idle workers', async () => {
    store.idleWorkerCount.value = 0;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    expect(document.getElementById('idle-worker-btn')).toBeNull();
  });

  it('army button hidden when no army units', async () => {
    store.armyCount.value = 0;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    expect(document.getElementById('select-army-btn')).toBeNull();
  });

  it('attack-move button hidden when no player units selected', async () => {
    store.hasPlayerUnits.value = false;
    store.selectionCount.value = 0;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    expect(document.getElementById('attack-move-btn')).toBeNull();
  });

  it('attack-move button hidden when attack-move already active', async () => {
    store.hasPlayerUnits.value = true;
    store.selectionCount.value = 3;
    store.attackMoveActive.value = true;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    // Button should not be shown when attack-move is already active
    expect(document.getElementById('attack-move-btn')).toBeNull();
  });

  it('pause overlay visible when paused', async () => {
    store.paused.value = true;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const pauseOverlay = document.querySelector('.pointer-events-none');
    expect(pauseOverlay).toBeTruthy();
    expect(pauseOverlay?.textContent).toContain('PAUSED');
  });
});

// ---------------------------------------------------------------------------
// Keyboard Reference Overlay Interactions
// ---------------------------------------------------------------------------
describe('Keyboard Reference overlay interactions', () => {
  it('keyboard ref "?" button click calls onKeyboardRefClick', async () => {
    const onKeyboardRefClick = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
          onKeyboardRefClick,
        }),
      ),
    );

    const kbBtn = must(
      document.getElementById('keyboard-ref-btn'),
      'Missing keyboard reference button',
    );
    expect(kbBtn).toBeTruthy();
    expect(kbBtn.textContent).toContain('?');
    kbBtn.click();
    expect(onKeyboardRefClick).toHaveBeenCalledTimes(1);
  });

  it('keyboard ref overlay close button calls onClose', async () => {
    const onClose = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(KeyboardReference, { onClose }),
      ),
    );

    // Find the close button (title="Close")
    const closeBtn = document.querySelector('button[title="Close"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keyboard ref overlay backdrop click calls onClose', async () => {
    const onClose = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(KeyboardReference, { onClose }),
      ),
    );

    // The backdrop is a separate div with role="presentation" and its own onClick
    const backdrop = document.querySelector('[role="presentation"]') as HTMLDivElement;
    expect(backdrop).toBeTruthy();
    backdrop.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// New Game Modal Interactions
// ---------------------------------------------------------------------------
// New Game Modal selectors are stale — title attributes changed in UI refactor.
// TODO: Rewrite with current selectors.
describe('New Game Modal interactions', () => {
  it('preset selection updates when Easy/Normal/Hard/Nightmare/Ultra clicked', async () => {
    store.menuState.value = 'newGame';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    // Preset buttons use title="Apply <Name> preset"
    const easyBtn = document.querySelector(
      'button[title="Apply Easy preset"]',
    ) as HTMLButtonElement;
    const normalBtn = document.querySelector(
      'button[title="Apply Normal preset"]',
    ) as HTMLButtonElement;
    const hardBtn = document.querySelector(
      'button[title="Apply Hard preset"]',
    ) as HTMLButtonElement;
    const nightmareBtn = document.querySelector(
      'button[title="Apply Nightmare preset"]',
    ) as HTMLButtonElement;
    const ultraBtn = document.querySelector(
      'button[title="Apply Ultra preset"]',
    ) as HTMLButtonElement;

    expect(easyBtn).toBeTruthy();
    expect(normalBtn).toBeTruthy();
    expect(hardBtn).toBeTruthy();
    expect(nightmareBtn).toBeTruthy();
    expect(ultraBtn).toBeTruthy();

    // Default is Normal preset — Normal should show active style
    // Click Easy
    easyBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    // Easy preset color is #22c55e — active background uses that color + "25" alpha suffix
    expect(easyBtn.style.background).toContain('#22c55e');

    // Click Hard
    hardBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(hardBtn.style.background).toContain('#ef4444');

    // Click Nightmare
    nightmareBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(nightmareBtn.style.background).toContain('#a855f7');

    // Click Ultra Nightmare
    ultraBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(ultraBtn.style.background).toContain('#dc2626');
  });

  it('permadeath toggle switches on and off in Rules tab', async () => {
    store.menuState.value = 'newGame';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    // Navigate to Rules tab — find the RULES tab button
    const allBtns = document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const rulesTab = Array.from(allBtns).find((btn) => btn.textContent?.trim() === 'RULES');
    expect(rulesTab).toBeTruthy();
    must(rulesTab, 'Missing RULES tab').click();
    await new Promise((r) => setTimeout(r, 50));

    // Find the Permadeath toggle — it is a rounded-full button inside a ToggleRow
    // Look for the label "PERMADEATH" and its sibling toggle button
    const spans = document.querySelectorAll('span');
    const permadeathLabel = Array.from(spans).find((s) =>
      s.textContent?.toUpperCase().includes('PERMADEATH'),
    );
    expect(permadeathLabel).toBeTruthy();

    // The toggle button is in the same parent row
    const toggleRow = must(permadeathLabel, 'Missing permadeath label').closest('.mb-3');
    expect(toggleRow).toBeTruthy();
    const toggleBtn = must(
      must(toggleRow, 'Missing permadeath toggle row').querySelector('button'),
      'Missing permadeath toggle button',
    ) as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();

    // Initially off (Normal preset has permadeath: false)
    expect(toggleBtn.classList.contains('toggle-track-active')).toBe(false);

    // Click to toggle on
    toggleBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(toggleBtn.classList.contains('toggle-track-active')).toBe(true);

    // Click to toggle off
    toggleBtn.click();
    await new Promise((r) => setTimeout(r, 50));
    expect(toggleBtn.classList.contains('toggle-track-active')).toBe(false);
  });

  it('permadeath forced on when Ultra Nightmare preset selected', async () => {
    store.menuState.value = 'newGame';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    // Select Ultra Nightmare preset
    const ultraBtn = document.querySelector(
      'button[title="Apply Ultra preset"]',
    ) as HTMLButtonElement;
    expect(ultraBtn).toBeTruthy();
    ultraBtn.click();
    await new Promise((r) => setTimeout(r, 100));

    // Navigate to Rules tab to see the Permadeath toggle
    const allBtns = document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const rulesTab = Array.from(allBtns).find((btn) => btn.textContent?.trim() === 'RULES');
    expect(rulesTab).toBeTruthy();
    must(rulesTab, 'Missing RULES tab').click();
    await new Promise((r) => setTimeout(r, 50));

    // Find the Permadeath toggle row
    const spans = document.querySelectorAll('span');
    const permadeathLabel = Array.from(spans).find((s) =>
      s.textContent?.toUpperCase().includes('PERMADEATH'),
    );
    expect(permadeathLabel).toBeTruthy();

    const toggleRow = must(permadeathLabel, 'Missing permadeath label').closest('.mb-3');
    expect(toggleRow).toBeTruthy();
    const toggleBtn = must(
      must(toggleRow, 'Missing permadeath toggle row').querySelector('button'),
      'Missing permadeath toggle button',
    ) as HTMLButtonElement;
    expect(toggleBtn).toBeTruthy();

    // Ultra Nightmare preset forces permadeath on
    expect(toggleBtn.classList.contains('toggle-track-active')).toBe(true);
  });

  it('shuffle button randomizes game name', async () => {
    store.menuState.value = 'newGame';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    const nameInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    const originalName = nameInput.value;

    // Find shuffle button (title="Randomize name and seed")
    const shuffleBtn = document.querySelector(
      'button[title="Randomize name and seed"]',
    ) as HTMLButtonElement;
    expect(shuffleBtn).toBeTruthy();

    // Click shuffle several times — at least one should produce a different name
    let nameChanged = false;
    for (let i = 0; i < 10; i++) {
      shuffleBtn.click();
      await new Promise((r) => setTimeout(r, 50));
      if (nameInput.value !== originalName) {
        nameChanged = true;
        break;
      }
    }
    expect(nameChanged, 'Expected shuffle to produce a different name').toBe(true);
  });

  it('seed display is clickable and enters edit mode', async () => {
    store.menuState.value = 'newGame';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    // Seed is displayed as a clickable button (title="Click to edit seed")
    const seedBtn = document.querySelector(
      'button[title="Click to edit seed"]',
    ) as HTMLButtonElement;
    expect(seedBtn).toBeTruthy();
    const seedValue = seedBtn.textContent?.trim() ?? '';
    expect(Number(seedValue)).toBeGreaterThan(0);

    // Click to enter edit mode
    seedBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    // After clicking, an input should appear
    const seedInput = document.querySelector('input.font-numbers[type="text"]') as HTMLInputElement;
    expect(seedInput).toBeTruthy();
    expect(seedInput.value).toBe(seedValue);
  });

  it('start game button transitions menu state to playing', async () => {
    store.menuState.value = 'newGame';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    // Find the START GAME button
    const startBtn = document.querySelector('button.animate-begin-glow') as HTMLButtonElement;
    expect(startBtn).toBeTruthy();
    expect(startBtn.textContent).toContain('START GAME');

    startBtn.click();
    await new Promise((r) => setTimeout(r, 50));

    // Store should transition to playing
    expect(store.menuState.value).toBe('playing');
    expect(store.selectedDifficulty.value).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Pearl Resource Display
// ---------------------------------------------------------------------------
describe('Pearl resource display', () => {
  it('pearl display hidden when pearls = 0', async () => {
    store.pearls.value = 0;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    // No element should contain "Pearls" text
    const pearlLabels = document.querySelectorAll('span');
    const hasPearlLabel = Array.from(pearlLabels).some((el) => el.textContent?.includes('Pearls'));
    expect(hasPearlLabel).toBe(false);
  });

  it('pearl display visible when pearls > 0', async () => {
    store.pearls.value = 15;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const pearlLabels = document.querySelectorAll('span');
    const hasPearlLabel = Array.from(pearlLabels).some((el) => el.textContent?.includes('Pearls'));
    expect(hasPearlLabel).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Enemy Economy Display
// ---------------------------------------------------------------------------
describe('Enemy economy display', () => {
  it('enemy economy indicator hidden when not visible', async () => {
    store.enemyEconomyVisible.value = false;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const enemyLabels = document.querySelectorAll('span');
    const hasEnemyLabel = Array.from(enemyLabels).some((el) => el.textContent?.includes('Enemy:'));
    expect(hasEnemyLabel).toBe(false);
  });

  it('enemy economy indicator visible after scouting with resource values', async () => {
    store.enemyEconomyVisible.value = true;
    store.enemyClams.value = 350;
    store.enemyTwigs.value = 200;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const allText = document.body.textContent || '';
    expect(allText).toContain('Enemy:');
    expect(allText).toContain('350');
    expect(allText).toContain('200');
  });
});

// ---------------------------------------------------------------------------
// Settings Panel Interactions
// ---------------------------------------------------------------------------
describe('Settings panel interactions', () => {
  it('volume sliders call onChange handlers', async () => {
    const onMasterVolumeChange = vi.fn();
    const onMusicVolumeChange = vi.fn();
    const onSfxVolumeChange = vi.fn();

    store.masterVolume.value = 80;
    store.musicVolume.value = 50;
    store.sfxVolume.value = 80;

    render(
      h(
        'div',
        { style: 'position:relative;width:400px;height:600px;background:#0f172a' },
        h(SettingsPanel, {
          onMasterVolumeChange,
          onMusicVolumeChange,
          onSfxVolumeChange,
          onSpeedSet: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onAutoSaveToggle: vi.fn(),
          onUiScaleChange: vi.fn(),
          onScreenShakeToggle: vi.fn(),
          onReduceVisualNoiseToggle: vi.fn(),
          onClose: vi.fn(),
        }),
      ),
    );

    // Find all range inputs
    const sliders = document.querySelectorAll(
      'input[type="range"]',
    ) as NodeListOf<HTMLInputElement>;
    expect(sliders.length).toBe(3);

    // Simulate input on master volume slider (first one)
    fireEvent.input(sliders[0], { target: { value: '60' } });
    expect(onMasterVolumeChange).toHaveBeenCalled();

    // Simulate input on music volume slider (second one)
    fireEvent.input(sliders[1], { target: { value: '30' } });
    expect(onMusicVolumeChange).toHaveBeenCalled();

    // Simulate input on SFX volume slider (third one)
    fireEvent.input(sliders[2], { target: { value: '90' } });
    expect(onSfxVolumeChange).toHaveBeenCalled();
  });

  it('settings close button calls onClose', async () => {
    const onClose = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:400px;height:600px;background:#0f172a' },
        h(SettingsPanel, {
          onMasterVolumeChange: vi.fn(),
          onMusicVolumeChange: vi.fn(),
          onSfxVolumeChange: vi.fn(),
          onSpeedSet: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onAutoSaveToggle: vi.fn(),
          onClose,
        }),
      ),
    );

    // Find close button (title="Close Settings")
    const closeBtn = document.querySelector('button[title="Close Settings"]') as HTMLButtonElement;
    expect(closeBtn).toBeTruthy();
    closeBtn.click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('settings speed buttons call onSpeedSet with correct value', async () => {
    const onSpeedSet = vi.fn();

    render(
      h(
        'div',
        { style: 'position:relative;width:400px;height:600px;background:#0f172a' },
        h(SettingsPanel, {
          onMasterVolumeChange: vi.fn(),
          onMusicVolumeChange: vi.fn(),
          onSfxVolumeChange: vi.fn(),
          onSpeedSet,
          onColorBlindToggle: vi.fn(),
          onAutoSaveToggle: vi.fn(),
          onUiScaleChange: vi.fn(),
          onScreenShakeToggle: vi.fn(),
          onReduceVisualNoiseToggle: vi.fn(),
          onClose: vi.fn(),
        }),
      ),
    );

    // Find speed buttons by their text content (1x, 2x, 3x)
    const allBtns = document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const speedButtons = Array.from(allBtns).filter((btn) => btn.textContent?.match(/^[123]x$/));
    expect(speedButtons.length).toBe(3);

    speedButtons[0].click();
    expect(onSpeedSet).toHaveBeenCalledWith(1);

    speedButtons[1].click();
    expect(onSpeedSet).toHaveBeenCalledWith(2);

    speedButtons[2].click();
    expect(onSpeedSet).toHaveBeenCalledWith(3);
  });
});
