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
import { SelectionPanel } from '@/ui/selection-panel';
import * as store from '@/ui/store';

// Mock animation module
vi.mock('@/rendering/animations', () => ({
  animateGameOverStats: vi.fn(),
  animateIntroTitle: vi.fn(),
  animateIntroSubtitle: vi.fn(),
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

import '@/styles/main.css';

/** Reset all store signals to default/neutral state */
function resetStore() {
  store.clams.value = 200;
  store.twigs.value = 50;
  store.food.value = 0;
  store.maxFood.value = 0;
  store.rateClams.value = 0;
  store.rateTwigs.value = 0;
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
  store.radialMenuOpen.value = false;
  store.radialMenuX.value = 0;
  store.radialMenuY.value = 0;
  store.autoGatherEnabled.value = false;
  store.autoDefendEnabled.value = false;
  store.autoAttackEnabled.value = false;
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
  actionButtons.value = [];
  queueItems.value = [];
}

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

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

    const speedBtn = document.getElementById('speed-btn')!;
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

    const pauseBtn = document.getElementById('pause-btn')!;
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

    const muteBtn = document.getElementById('mute-btn')!;
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

    const cbBtn = document.getElementById('cb-btn')!;
    expect(cbBtn).toBeTruthy();
    cbBtn.click();
    expect(onColorBlindToggle).toHaveBeenCalledTimes(1);
  });

  it('idle worker button click opens radial menu', async () => {
    store.idleWorkerCount.value = 3;

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

    expect(store.radialMenuOpen.value).toBe(false);

    const idleBtn = document.getElementById('idle-worker-btn')!;
    expect(idleBtn).toBeTruthy();
    idleBtn.click();

    expect(store.radialMenuOpen.value).toBe(true);
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

    const armyBtn = document.getElementById('select-army-btn')!;
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

    const aMoveBtn = document.getElementById('attack-move-btn')!;
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
// Radial Menu Interactions
// ---------------------------------------------------------------------------
describe('Radial menu interactions', () => {
  function renderHUDWithRadialOpen() {
    store.radialMenuOpen.value = true;
    store.radialMenuX.value = 400;
    store.radialMenuY.value = 200;
    store.idleWorkerCount.value = 5;

    return render(
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
  }

  it('radial menu auto-gather toggle click toggles signal', async () => {
    renderHUDWithRadialOpen();
    await new Promise((r) => setTimeout(r, 200));

    expect(store.autoGatherEnabled.value).toBe(false);

    const gatherBtn = document.querySelector('button[title="Gather"]') as HTMLButtonElement;
    expect(gatherBtn).toBeTruthy();
    gatherBtn.click();

    expect(store.autoGatherEnabled.value).toBe(true);

    // Click again to toggle off
    gatherBtn.click();
    expect(store.autoGatherEnabled.value).toBe(false);
  });

  it('radial menu auto-defend toggle click toggles signal', async () => {
    renderHUDWithRadialOpen();
    await new Promise((r) => setTimeout(r, 200));

    expect(store.autoDefendEnabled.value).toBe(false);

    const defendBtn = document.querySelector('button[title="Defend"]') as HTMLButtonElement;
    expect(defendBtn).toBeTruthy();
    defendBtn.click();

    expect(store.autoDefendEnabled.value).toBe(true);
  });

  it('radial menu auto-attack toggle click toggles signal', async () => {
    renderHUDWithRadialOpen();
    await new Promise((r) => setTimeout(r, 200));

    expect(store.autoAttackEnabled.value).toBe(false);

    const attackBtn = document.querySelector('button[title="Attack"]') as HTMLButtonElement;
    expect(attackBtn).toBeTruthy();
    attackBtn.click();

    expect(store.autoAttackEnabled.value).toBe(true);
  });

  it('radial menu auto-scout toggle click toggles signal', async () => {
    renderHUDWithRadialOpen();
    await new Promise((r) => setTimeout(r, 200));

    expect(store.autoScoutEnabled.value).toBe(false);

    const scoutBtn = document.querySelector('button[title="Scout"]') as HTMLButtonElement;
    expect(scoutBtn).toBeTruthy();
    scoutBtn.click();

    expect(store.autoScoutEnabled.value).toBe(true);
  });

  it('radial menu Select button click calls onSelectAll and closes menu', async () => {
    const onIdleWorkerClick = vi.fn();
    store.radialMenuOpen.value = true;
    store.radialMenuX.value = 400;
    store.radialMenuY.value = 200;
    store.idleWorkerCount.value = 5;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick,
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    await new Promise((r) => setTimeout(r, 200));

    const selectBtn = document.querySelector('button[title="Select"]') as HTMLButtonElement;
    expect(selectBtn).toBeTruthy();
    selectBtn.click();

    expect(onIdleWorkerClick).toHaveBeenCalledTimes(1);
    expect(store.radialMenuOpen.value).toBe(false);
  });

  it('radial menu overlay click closes the menu', async () => {
    renderHUDWithRadialOpen();
    await new Promise((r) => setTimeout(r, 200));

    expect(store.radialMenuOpen.value).toBe(true);

    // Click the overlay backdrop (the fixed inset-0 div)
    const overlay = document.querySelector('.fixed.inset-0') as HTMLDivElement;
    expect(overlay).toBeTruthy();
    overlay.click();

    expect(store.radialMenuOpen.value).toBe(false);
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
        onClick: onLodge,
      },
      {
        title: 'Burrow',
        cost: '75T',
        hotkey: 'W',
        affordable: true,
        description: 'Housing',
        onClick: onBurrow,
      },
      {
        title: 'Armory',
        cost: '200C 150T',
        hotkey: 'E',
        affordable: true,
        description: 'Train combat',
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

    // Find buttons that are not action-btns (queue items)
    const allBtns = document.querySelectorAll(
      '#action-panel button:not(.action-btn)',
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

    const restartBtn = document.getElementById('restart-btn')!;
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

    const restartBtn = document.getElementById('restart-btn')!;
    restartBtn.click();
    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Idle Worker Button -> Radial Menu -> Select All flow
// ---------------------------------------------------------------------------
describe('Idle worker to radial menu flow', () => {
  it('click idle worker -> radial opens -> click Select -> calls handler & closes', async () => {
    const onIdleWorkerClick = vi.fn();
    store.idleWorkerCount.value = 4;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: vi.fn(),
          onMuteClick: vi.fn(),
          onColorBlindToggle: vi.fn(),
          onIdleWorkerClick,
          onArmyClick: vi.fn(),
          onPauseClick: vi.fn(),
          onAttackMoveClick: vi.fn(),
          onCtrlGroupClick: vi.fn(),
        }),
      ),
    );

    // Step 1: Click idle worker button
    const idleBtn = document.getElementById('idle-worker-btn')!;
    idleBtn.click();
    expect(store.radialMenuOpen.value).toBe(true);

    // Wait for animations
    await new Promise((r) => setTimeout(r, 250));

    // Step 2: Click Select in radial menu
    const selectBtn = document.querySelector('button[title="Select"]') as HTMLButtonElement;
    expect(selectBtn).toBeTruthy();
    selectBtn.click();

    expect(onIdleWorkerClick).toHaveBeenCalledTimes(1);
    expect(store.radialMenuOpen.value).toBe(false);
  });

  it('click idle worker -> toggle auto-gather -> toggle auto-defend -> close overlay', async () => {
    store.idleWorkerCount.value = 6;

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

    // Open radial menu
    document.getElementById('idle-worker-btn')?.click();
    await new Promise((r) => setTimeout(r, 250));

    // Toggle gather on
    (document.querySelector('button[title="Gather"]') as HTMLButtonElement).click();
    expect(store.autoGatherEnabled.value).toBe(true);

    // Toggle defend on
    (document.querySelector('button[title="Defend"]') as HTMLButtonElement).click();
    expect(store.autoDefendEnabled.value).toBe(true);

    // Close by clicking overlay
    (document.querySelector('.fixed.inset-0') as HTMLDivElement).click();
    expect(store.radialMenuOpen.value).toBe(false);

    // Toggles persist after menu close
    expect(store.autoGatherEnabled.value).toBe(true);
    expect(store.autoDefendEnabled.value).toBe(true);
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
