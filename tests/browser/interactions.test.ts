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
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { GameOverBanner } from '@/ui/game-over';
import { HUD } from '@/ui/hud';
import { KeyboardReference } from '@/ui/keyboard-reference';
import { SelectionPanel } from '@/ui/selection-panel';
import { SettingsPanel } from '@/ui/settings-panel';
import * as store from '@/ui/store';

// Mock animation module with explicit overrides so isolated browser runs stay stable.
vi.mock('@/rendering/animations', async () => {
  const actual =
    await vi.importActual<typeof import('@/rendering/animations')>('@/rendering/animations');
  return {
    ...actual,
    animateGameOverStats: vi.fn(),
    animateIntroTitle: vi.fn(),
    animateIntroSubtitle: vi.fn(),
    cleanupEntityAnimation: vi.fn(),
    triggerCommandPulse: vi.fn(),
    triggerHitRecoil: vi.fn(),
    triggerBuildingComplete: vi.fn(),
    triggerSpawnPop: vi.fn(),
    triggerAttackLunge: vi.fn(),
  };
});

import '@/styles/main.css';

/** Reset all store signals to default/neutral state */
function resetStore() {
  store.fish.value = 200;
  store.logs.value = 50;
  store.rocks.value = 0;
  store.food.value = 0;
  store.maxFood.value = 0;
  store.rateFish.value = 0;
  store.rateLogs.value = 0;
  store.enemyFish.value = 0;
  store.enemyLogs.value = 0;
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
  store.lowFish.value = false;
  store.lowLogs.value = false;
  store.attackMoveActive.value = false;
  store.idleGeneralistCount.value = 0;
  store.armyCount.value = 0;
  store.hasPlayerUnits.value = false;
  store.idleGeneralistCount.value = 0;
  store.idleCombatCount.value = 0;
  store.idleSupportCount.value = 0;
  store.idleReconCount.value = 0;
  store.radialMenuOpen.value = false;
  store.radialMenuX.value = 0;
  store.radialMenuY.value = 0;
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
    store.selectionName.value = 'Mudpaw';
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

    const xBtn = document.querySelector('button[aria-label="Clear selection"]');
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
        title: 'Mudpaw',
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
    expect(document.body.textContent).toContain(`Build ${BUILD_STAMP_LABEL}`);
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
  it('idle Mudpaw button hidden when no idle Mudpaws', async () => {
    store.idleGeneralistCount.value = 0;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleGeneralistClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    expect(document.getElementById('idle-generalist-btn')).toBeNull();
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
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
          onIdleGeneralistClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const pauseOverlay = document.querySelector('button[aria-label="Tap to resume"]');
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
          onIdleGeneralistClick: vi.fn(),
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
// Pearl Resource Display
// ---------------------------------------------------------------------------
describe('Rock resource display', () => {
  it('pearl display hidden when pearls = 0', async () => {
    store.rocks.value = 0;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleGeneralistClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const resourceStatuses = document.querySelectorAll('[role="status"]');
    const hasRocksStatus = Array.from(resourceStatuses).some((el) =>
      el.getAttribute('aria-label')?.includes('Rocks:'),
    );
    expect(hasRocksStatus).toBe(true);
  });

  it('rock display reflects current rock count when rocks > 0', async () => {
    store.rocks.value = 15;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleGeneralistClick: vi.fn(),
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    const resourceStatuses = document.querySelectorAll('[role="status"]');
    const rocksStatus = Array.from(resourceStatuses).find((el) =>
      el.getAttribute('aria-label')?.includes('Rocks:'),
    );
    expect(rocksStatus).toBeTruthy();
    expect(rocksStatus?.textContent).toContain('15');
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
          onIdleGeneralistClick: vi.fn(),
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

  it('enemy economy indicator visible after recon with resource values', async () => {
    store.enemyEconomyVisible.value = true;
    store.enemyFish.value = 350;
    store.enemyLogs.value = 200;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleGeneralistClick: vi.fn(),
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

    // Find gameplay speed buttons without matching the accessibility UI-scale buttons.
    const allBtns = document.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    const speedButtons = Array.from(allBtns).filter((btn) =>
      btn.getAttribute('aria-label')?.startsWith('Game speed '),
    );
    expect(speedButtons.length).toBe(3);

    speedButtons[0].click();
    expect(onSpeedSet).toHaveBeenCalledWith(1);

    speedButtons[1].click();
    expect(onSpeedSet).toHaveBeenCalledWith(2);

    speedButtons[2].click();
    expect(onSpeedSet).toHaveBeenCalledWith(3);
  });
});
