/**
 * Component Screenshot Tests
 *
 * Renders each UI component in isolation with various store signal states,
 * captures a screenshot for each state. These serve as visual regression
 * baselines for the mobile-first game UI.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { ActionPanel, actionButtons, queueItems } from '@/ui/action-panel';
import { ErrorBoundary } from '@/ui/error-boundary';
import { GameOverBanner } from '@/ui/game-over';
// Components under test
import { HUD } from '@/ui/hud';
import { KeyboardReference } from '@/ui/keyboard-reference';
import { MainMenu } from '@/ui/main-menu';
import { MinimapPanel } from '@/ui/minimap-panel';

// v3: NewGameModal removed
const NewGameModal = () => null;

import { SelectionPanel } from '@/ui/selection-panel';
// Store signals — we set these directly to control component state
import * as store from '@/ui/store';

// Mock animejs — the game-over and intro components import animation helpers
vi.mock('@/rendering/animations', () => ({
  animateGameOverStats: vi.fn(),
  animateIntroTitle: vi.fn(),
  animateIntroSubtitle: vi.fn(),
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

/** Import the stylesheet so Tailwind classes render properly */
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

const noop = () => {};

beforeEach(() => {
  resetStore();
});

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// HUD Screenshots
// ---------------------------------------------------------------------------
describe('HUD screenshots', () => {
  const hudProps = {
    onSpeedClick: noop,
    onMuteClick: noop,
    onColorBlindToggle: noop,
    onIdleWorkerClick: noop,
    onArmyClick: noop,
    onPauseClick: noop,
    onAttackMoveClick: noop,
    onCtrlGroupClick: noop,
  };

  it('HUD - peaceful state, starting resources', async () => {
    store.isPeaceful.value = true;
    store.peaceCountdown.value = 180;
    store.clams.value = 200;
    store.twigs.value = 50;
    store.food.value = 3;
    store.maxFood.value = 8;
    store.gameTimeDisplay.value = 'Day 1 - 08:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-peaceful.png', element: document.body });
  });

  it('HUD - hunting state with wave countdown', async () => {
    store.isPeaceful.value = false;
    store.waveCountdown.value = 15;
    store.clams.value = 450;
    store.twigs.value = 320;
    store.rateClams.value = 12;
    store.rateTwigs.value = -3;
    store.food.value = 12;
    store.maxFood.value = 16;
    store.gameTimeDisplay.value = 'Day 5 - 14:30';
    store.gameSpeed.value = 2;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-hunting.png', element: document.body });
  });

  it('HUD - low resources warning', async () => {
    store.isPeaceful.value = false;
    store.clams.value = 30;
    store.twigs.value = 15;
    store.lowClams.value = true;
    store.lowTwigs.value = true;
    store.food.value = 16;
    store.maxFood.value = 16;
    store.gameTimeDisplay.value = 'Day 8 - 22:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-low-resources.png', element: document.body });
  });

  it('HUD - paused state', async () => {
    store.paused.value = true;
    store.gameTimeDisplay.value = 'Day 3 - 12:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-paused.png', element: document.body });
  });

  it('HUD - attack move banner active', async () => {
    store.attackMoveActive.value = true;
    store.hasPlayerUnits.value = true;
    store.selectionCount.value = 5;
    store.gameTimeDisplay.value = 'Day 4 - 10:15';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:80px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-attack-move.png', element: document.body });
  });

  it('HUD - idle workers and army buttons', async () => {
    store.idleWorkerCount.value = 3;
    store.armyCount.value = 7;
    store.hasPlayerUnits.value = true;
    store.selectionCount.value = 2;
    store.gameTimeDisplay.value = 'Day 6 - 16:45';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:200px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-idle-army.png', element: document.body });
  });

  it('HUD - production queue', async () => {
    store.globalProductionQueue.value = [
      { buildingKind: 5, unitLabel: 'Gatherer', progress: 65, entityId: 100 },
      { buildingKind: 7, unitLabel: 'Brawler', progress: 0, entityId: 101 },
    ];
    store.gameTimeDisplay.value = 'Day 2 - 09:30';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:80px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-production-queue.png', element: document.body });
  });

  it('HUD - control group badges', async () => {
    store.ctrlGroupCounts.value = { 1: 5, 2: 3, 4: 8 };
    store.gameTimeDisplay.value = 'Day 3 - 11:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:80px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-ctrl-groups.png', element: document.body });
  });

  it('HUD - color blind mode active', async () => {
    store.colorBlindMode.value = true;
    store.isPeaceful.value = true;
    store.peaceCountdown.value = 90;
    store.gameTimeDisplay.value = 'Day 1 - 08:30';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({ path: 'screenshots/hud-colorblind.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Selection Panel Screenshots
// ---------------------------------------------------------------------------
describe('Selection Panel screenshots', () => {
  it('SelectionPanel - empty (Command Center)', async () => {
    store.selectionCount.value = 0;
    store.selectionName.value = 'Command Center';
    store.selectionNameColor.value = 'text-sky-400';
    store.selectionStatsHtml.value = 'Idle: 2 | Army: 5 | Pop: 7/12';

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({ path: 'screenshots/selection-empty.png', element: document.body });
  });

  it('SelectionPanel - single unit selected (Gatherer)', async () => {
    store.selectionCount.value = 1;
    store.selectionName.value = 'Gatherer';
    store.selectionNameColor.value = 'text-green-400';
    store.selectionHp.value = 80;
    store.selectionMaxHp.value = 100;
    store.selectionShowHpBar.value = true;
    store.selectionStatsHtml.value = 'HP: 80/100 | Spd: 1.5';
    store.selectionDesc.value = 'Gathering';
    store.selectionIsMulti.value = false;
    store.selectionKills.value = 0;

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({
      path: 'screenshots/selection-single-gatherer.png',
      element: document.body,
    });
  });

  it('SelectionPanel - single unit low HP (Brawler)', async () => {
    store.selectionCount.value = 1;
    store.selectionName.value = 'Brawler';
    store.selectionNameColor.value = 'text-green-400';
    store.selectionHp.value = 15;
    store.selectionMaxHp.value = 120;
    store.selectionShowHpBar.value = true;
    store.selectionStatsHtml.value = 'HP: 15/120 | Dmg: 12 | Range: 30';
    store.selectionDesc.value = 'Attacking';
    store.selectionKills.value = 4;

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({
      path: 'screenshots/selection-single-low-hp.png',
      element: document.body,
    });
  });

  it('SelectionPanel - single enemy unit', async () => {
    store.selectionCount.value = 1;
    store.selectionName.value = 'Gator';
    store.selectionNameColor.value = 'text-red-400';
    store.selectionHp.value = 200;
    store.selectionMaxHp.value = 200;
    store.selectionShowHpBar.value = true;
    store.selectionStatsHtml.value = 'HP: 200/200 | Dmg: 25 | Range: 35';
    store.selectionDesc.value = 'Idle';

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({
      path: 'screenshots/selection-single-enemy.png',
      element: document.body,
    });
  });

  it('SelectionPanel - single building (Lodge)', async () => {
    store.selectionCount.value = 1;
    store.selectionName.value = 'Lodge';
    store.selectionNameColor.value = 'text-green-400';
    store.selectionHp.value = 500;
    store.selectionMaxHp.value = 500;
    store.selectionShowHpBar.value = true;
    store.selectionStatsHtml.value = 'HP: 500/500';
    store.selectionDesc.value = '';

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({
      path: 'screenshots/selection-single-building.png',
      element: document.body,
    });
  });

  it('SelectionPanel - multi-select squad', async () => {
    store.selectionCount.value = 6;
    store.selectionName.value = '6 Units';
    store.selectionNameColor.value = 'text-green-400';
    store.selectionIsMulti.value = true;
    store.selectionComposition.value = '3 Brawler, 2 Sniper, 1 Healer';
    store.selectionShowHpBar.value = false;

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({ path: 'screenshots/selection-multi.png', element: document.body });
  });

  it('SelectionPanel - resource (Clambed)', async () => {
    store.selectionCount.value = 1;
    store.selectionName.value = 'Clambed';
    store.selectionNameColor.value = 'text-slate-400';
    store.selectionShowHpBar.value = false;
    store.selectionStatsHtml.value = 'HP: 500/500';
    store.selectionDesc.value = 'Resource';

    render(
      h(
        'div',
        { style: 'width:256px;height:300px;background:#0f172a' },
        h(SelectionPanel, { onDeselect: noop }),
      ),
    );

    await page.screenshot({ path: 'screenshots/selection-resource.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Action Panel Screenshots
// ---------------------------------------------------------------------------
describe('Action Panel screenshots', () => {
  it('ActionPanel - empty (no selection)', async () => {
    actionButtons.value = [];
    queueItems.value = [];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    await page.screenshot({ path: 'screenshots/action-empty.png', element: document.body });
  });

  it('ActionPanel - gatherer build buttons', async () => {
    actionButtons.value = [
      {
        title: 'Lodge',
        cost: '150C 100T',
        hotkey: 'Q',
        affordable: true,
        description: 'Expansion (+4 food cap)',
        category: 'build',
        onClick: noop,
      },
      {
        title: 'Burrow',
        cost: '75T',
        hotkey: 'W',
        affordable: true,
        description: 'Housing (+4 food cap)',
        category: 'build',
        onClick: noop,
      },
      {
        title: 'Armory',
        cost: '200C 150T',
        hotkey: 'E',
        affordable: false,
        description: 'Train combat units',
        category: 'build',
        onClick: noop,
      },
      {
        title: 'Tower',
        cost: '100C 200T',
        hotkey: 'R',
        affordable: false,
        description: 'Defensive tower',
        category: 'build',
        onClick: noop,
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    await page.screenshot({
      path: 'screenshots/action-gatherer-build.png',
      element: document.body,
    });
  });

  it('ActionPanel - lodge train + tech buttons', async () => {
    actionButtons.value = [
      {
        title: 'Gatherer',
        cost: '50C 1F',
        hotkey: 'Q',
        affordable: true,
        description: 'Worker unit',
        category: 'train',
        onClick: noop,
      },
      {
        title: 'Sturdy Mud',
        cost: '100C 50T',
        hotkey: 'W',
        affordable: true,
        description: '+20% building HP',
        category: 'tech',
        onClick: noop,
      },
      {
        title: 'Swift Paws',
        cost: '75C 75T',
        hotkey: 'E',
        affordable: false,
        description: '+15% unit speed',
        category: 'tech',
        onClick: noop,
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    await page.screenshot({ path: 'screenshots/action-lodge-train.png', element: document.body });
  });

  it('ActionPanel - armory train buttons', async () => {
    actionButtons.value = [
      {
        title: 'Brawler',
        cost: '80C 30T 2F',
        hotkey: 'Q',
        affordable: true,
        description: 'Melee fighter',
        category: 'train',
        onClick: noop,
      },
      {
        title: 'Sniper',
        cost: '60C 40T 2F',
        hotkey: 'W',
        affordable: true,
        description: 'Ranged attacker',
        category: 'train',
        onClick: noop,
      },
      {
        title: 'Healer',
        cost: '100C 50T 2F',
        hotkey: 'E',
        affordable: true,
        description: 'Heals nearby friendlies',
        category: 'train',
        onClick: noop,
      },
      {
        title: 'Sharp Sticks',
        cost: '150C 100T',
        hotkey: 'R',
        affordable: false,
        description: '+25% melee damage',
        category: 'tech',
        onClick: noop,
      },
    ];

    render(
      h('div', { style: 'width:256px;height:256px;background:#1e293b' }, h(ActionPanel, null)),
    );

    await page.screenshot({ path: 'screenshots/action-armory-train.png', element: document.body });
  });

  it('ActionPanel - with training queue', async () => {
    actionButtons.value = [
      {
        title: 'Gatherer',
        cost: '50C 1F',
        hotkey: 'Q',
        affordable: true,
        description: 'Worker unit',
        category: 'train',
        onClick: noop,
      },
    ];
    queueItems.value = [
      { label: 'G', progressPct: 72, onCancel: noop },
      { label: 'G', progressPct: 0, onCancel: noop },
      { label: 'G', progressPct: 0, onCancel: noop },
    ];

    render(
      h('div', { style: 'width:256px;height:300px;background:#1e293b' }, h(ActionPanel, null)),
    );

    await page.screenshot({ path: 'screenshots/action-with-queue.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Radial Menu Screenshots
// ---------------------------------------------------------------------------
describe('Radial Menu screenshots', () => {
  it('Radial menu - open with idle count', async () => {
    store.radialMenuOpen.value = true;
    store.radialMenuX.value = 400;
    store.radialMenuY.value = 200;
    store.idleWorkerCount.value = 5;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: noop,
          onMuteClick: noop,
          onColorBlindToggle: noop,
          onIdleWorkerClick: noop,
          onArmyClick: noop,
          onPauseClick: noop,
          onAttackMoveClick: noop,
          onCtrlGroupClick: noop,
        }),
      ),
    );

    // Wait for sprout animations
    await new Promise((r) => setTimeout(r, 250));

    await page.screenshot({ path: 'screenshots/radial-menu-open.png', element: document.body });
  });

  it('Radial menu - with auto-gather toggled on', async () => {
    store.radialMenuOpen.value = true;
    store.radialMenuX.value = 400;
    store.radialMenuY.value = 200;
    store.idleWorkerCount.value = 3;
    store.autoGatherEnabled.value = true;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: noop,
          onMuteClick: noop,
          onColorBlindToggle: noop,
          onIdleWorkerClick: noop,
          onArmyClick: noop,
          onPauseClick: noop,
          onAttackMoveClick: noop,
          onCtrlGroupClick: noop,
        }),
      ),
    );

    await new Promise((r) => setTimeout(r, 250));

    await page.screenshot({
      path: 'screenshots/radial-menu-gather-on.png',
      element: document.body,
    });
  });

  it('Radial menu - all auto-behaviors toggled', async () => {
    store.radialMenuOpen.value = true;
    store.radialMenuX.value = 400;
    store.radialMenuY.value = 200;
    store.idleWorkerCount.value = 8;
    store.autoGatherEnabled.value = true;
    store.autoDefendEnabled.value = true;
    store.autoAttackEnabled.value = true;
    store.autoScoutEnabled.value = true;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, {
          onSpeedClick: noop,
          onMuteClick: noop,
          onColorBlindToggle: noop,
          onIdleWorkerClick: noop,
          onArmyClick: noop,
          onPauseClick: noop,
          onAttackMoveClick: noop,
          onCtrlGroupClick: noop,
        }),
      ),
    );

    await new Promise((r) => setTimeout(r, 250));

    await page.screenshot({ path: 'screenshots/radial-menu-all-on.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Game Over Screenshots
// ---------------------------------------------------------------------------
describe('Game Over screenshots', () => {
  it('GameOver - victory with 3 stars', async () => {
    store.gameState.value = 'win';
    store.goTitle.value = 'Victory';
    store.goTitleColor.value = 'text-amber-400';
    store.goDesc.value = 'All predator nests destroyed!';
    store.goStatLines.value = [
      'Time: 8 days, 14 hours',
      'Kills: 47',
      'Losses: 12',
      'Resources gathered: 3200',
      'Buildings built: 9',
      'Peak army: 15',
    ];
    store.goRating.value = 3;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(GameOverBanner, { onRestart: noop }),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/gameover-victory-3star.png',
      element: document.body,
    });
  });

  it('GameOver - victory with 2 stars', async () => {
    store.gameState.value = 'win';
    store.goTitle.value = 'Victory';
    store.goTitleColor.value = 'text-amber-400';
    store.goDesc.value = 'All predator nests destroyed!';
    store.goStatLines.value = [
      'Time: 18 days, 6 hours',
      'Kills: 32',
      'Losses: 25',
      'Resources gathered: 5400',
      'Buildings built: 14',
      'Peak army: 10',
    ];
    store.goRating.value = 2;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(GameOverBanner, { onRestart: noop }),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/gameover-victory-2star.png',
      element: document.body,
    });
  });

  it('GameOver - defeat with 1 star', async () => {
    store.gameState.value = 'lose';
    store.goTitle.value = 'Defeat';
    store.goTitleColor.value = 'text-red-500';
    store.goDesc.value = 'All lodges destroyed!';
    store.goStatLines.value = [
      'Time: 3 days, 2 hours',
      'Kills: 8',
      'Losses: 14',
      'Resources gathered: 800',
      'Buildings built: 3',
      'Peak army: 4',
    ];
    store.goRating.value = 1;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(GameOverBanner, { onRestart: noop }),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/gameover-defeat-1star.png',
      element: document.body,
    });
  });
});

// ---------------------------------------------------------------------------
// Main Menu Screenshots
// ---------------------------------------------------------------------------
describe('Main Menu screenshots', () => {
  it('MainMenu - initial splash', async () => {
    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#000' },
        h(MainMenu, null),
      ),
    );

    // Wait for animations to begin
    await new Promise((r) => setTimeout(r, 200));

    await page.screenshot({ path: 'screenshots/intro-overlay.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Minimap Panel Screenshots
// ---------------------------------------------------------------------------
describe('Minimap Panel screenshots', () => {
  it('MinimapPanel - default canvas', async () => {
    render(
      h(
        'div',
        { style: 'width:256px;height:256px;background:#000' },
        h(MinimapPanel, { canvasRef: { current: null }, camRef: { current: null } }),
      ),
    );

    await page.screenshot({ path: 'screenshots/minimap-panel.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Error Boundary Screenshots
// ---------------------------------------------------------------------------
describe('Error Boundary screenshots', () => {
  it('ErrorBoundary - error state', async () => {
    function BrokenChild(): ReturnType<typeof h> {
      throw new Error('Test render error');
    }

    render(
      h(
        'div',
        { style: 'width:400px;background:#0f172a' },
        h(ErrorBoundary, null, h(BrokenChild, null)),
      ),
    );

    await page.screenshot({ path: 'screenshots/error-boundary.png', element: document.body });
  });
});

// ---------------------------------------------------------------------------
// Main Menu Screenshots (New Game / Continue / Settings)
// ---------------------------------------------------------------------------
describe('Main Menu screenshots', () => {
  it('MainMenu - main menu with buttons', async () => {
    store.menuState.value = 'main';
    store.hasSaveGame.value = true;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#000' },
        h(MainMenu, null),
      ),
    );

    await new Promise((r) => setTimeout(r, 200));

    await page.screenshot({
      path: 'screenshots/main-menu-buttons.png',
      element: document.body,
    });
  });

  it('MainMenu - no save game (Continue disabled)', async () => {
    store.menuState.value = 'main';
    store.hasSaveGame.value = false;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#000' },
        h(MainMenu, null),
      ),
    );

    await new Promise((r) => setTimeout(r, 200));

    await page.screenshot({
      path: 'screenshots/main-menu-no-save.png',
      element: document.body,
    });
  });
});

// ---------------------------------------------------------------------------
// New Game Modal Screenshots
// ---------------------------------------------------------------------------
describe('New Game Modal screenshots', () => {
  it('NewGameModal - difficulty grid with Normal selected', async () => {
    store.menuState.value = 'main';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:800px;background:#0f172a' },
        h(NewGameModal, null),
      ),
    );

    await new Promise((r) => setTimeout(r, 200));

    await page.screenshot({
      path: 'screenshots/new-game-modal.png',
      element: document.body,
    });
  });
});

// ---------------------------------------------------------------------------
// Keyboard Reference Overlay Screenshots
// ---------------------------------------------------------------------------
describe('Keyboard Reference screenshots', () => {
  it('KeyboardReference - full overlay', async () => {
    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:600px;background:#0f172a' },
        h(KeyboardReference, { onClose: noop }),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/keyboard-reference.png',
      element: document.body,
    });
  });
});

// ---------------------------------------------------------------------------
// Contextual Idle Menu Screenshots
// ---------------------------------------------------------------------------
describe('Contextual Idle Menu screenshots', () => {
  const hudProps = {
    onSpeedClick: noop,
    onMuteClick: noop,
    onColorBlindToggle: noop,
    onIdleWorkerClick: noop,
    onArmyClick: noop,
    onPauseClick: noop,
    onAttackMoveClick: noop,
    onCtrlGroupClick: noop,
  };

  it('Idle menu expanded - gatherers idle (Gather + Build)', async () => {
    store.idleWorkerCount.value = 5;
    store.idleGathererCount.value = 5;
    store.idleCombatCount.value = 0;
    store.autoMenuExpanded.value = true;
    store.gameTimeDisplay.value = 'Day 3 - 10:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/idle-menu-gatherers.png',
      element: document.body,
    });
  });

  it('Idle menu expanded - combat idle (Attack + Defend)', async () => {
    store.idleWorkerCount.value = 4;
    store.idleGathererCount.value = 0;
    store.idleCombatCount.value = 4;
    store.autoMenuExpanded.value = true;
    store.gameTimeDisplay.value = 'Day 5 - 16:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/idle-menu-combat.png',
      element: document.body,
    });
  });

  it('Idle menu expanded - mixed idle with all auto toggles on', async () => {
    store.idleWorkerCount.value = 8;
    store.idleGathererCount.value = 3;
    store.idleCombatCount.value = 3;
    store.idleHealerCount.value = 1;
    store.idleScoutCount.value = 1;
    store.autoMenuExpanded.value = true;
    store.autoGatherEnabled.value = true;
    store.autoBuildEnabled.value = true;
    store.autoAttackEnabled.value = true;
    store.autoDefendEnabled.value = true;
    store.autoHealEnabled.value = true;
    store.autoScoutEnabled.value = true;
    store.gameTimeDisplay.value = 'Day 8 - 12:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:400px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await new Promise((r) => setTimeout(r, 100));

    await page.screenshot({
      path: 'screenshots/idle-menu-all-on.png',
      element: document.body,
    });
  });
});

// ---------------------------------------------------------------------------
// Pearl Resource in HUD Screenshots
// ---------------------------------------------------------------------------
describe('Pearl Resource HUD screenshots', () => {
  const hudProps = {
    onSpeedClick: noop,
    onMuteClick: noop,
    onColorBlindToggle: noop,
    onIdleWorkerClick: noop,
    onArmyClick: noop,
    onPauseClick: noop,
    onAttackMoveClick: noop,
    onCtrlGroupClick: noop,
  };

  it('HUD - pearls visible in resource bar', async () => {
    store.clams.value = 800;
    store.twigs.value = 600;
    store.pearls.value = 25;
    store.food.value = 10;
    store.maxFood.value = 16;
    store.gameTimeDisplay.value = 'Day 10 - 14:00';

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:60px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({
      path: 'screenshots/hud-with-pearls.png',
      element: document.body,
    });
  });
});

// ---------------------------------------------------------------------------
// Enemy Economy Indicator Screenshots
// ---------------------------------------------------------------------------
describe('Enemy Economy HUD screenshots', () => {
  const hudProps = {
    onSpeedClick: noop,
    onMuteClick: noop,
    onColorBlindToggle: noop,
    onIdleWorkerClick: noop,
    onArmyClick: noop,
    onPauseClick: noop,
    onAttackMoveClick: noop,
    onCtrlGroupClick: noop,
  };

  it('HUD - enemy economy indicator after scouting', async () => {
    store.enemyEconomyVisible.value = true;
    store.enemyClams.value = 450;
    store.enemyTwigs.value = 300;
    store.gameTimeDisplay.value = 'Day 7 - 11:00';
    store.isPeaceful.value = false;

    render(
      h(
        'div',
        { style: 'position:relative;width:800px;height:120px;background:#0f172a' },
        h(HUD, hudProps),
      ),
    );

    await page.screenshot({
      path: 'screenshots/hud-enemy-economy.png',
      element: document.body,
    });
  });
});
