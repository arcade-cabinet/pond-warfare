/**
 * Game Actions Tests
 *
 * Tests the extracted game action handler functions from game-actions.ts.
 * These functions wrap game-world mutations + UI store syncs.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock game module before importing game-actions
vi.mock('@/game', () => ({
  game: {
    world: {
      selection: [] as number[],
      isTracking: false,
      attackMoveMode: false,
      paused: false,
      gameSpeed: 1,
      ecs: {},
      yukaManager: { removeUnit: vi.fn(), clearFormationBehaviors: vi.fn() },
      resources: { fish: 500, twigs: 300 },
      floatingTexts: [] as unknown[],
      camX: 0,
      camY: 0,
      viewWidth: 800,
      viewHeight: 600,
      autoBehaviors: { generalist: false, combat: false, support: false, recon: false },
    },
    syncUIStore: vi.fn(),
    cycleSpeed: vi.fn(),
    smoothPanTo: vi.fn(),
  },
}));

vi.mock('@/audio/audio-system', () => ({
  audio: {
    toggleMute: vi.fn(),
    muted: false,
    click: vi.fn(),
    selectUnit: vi.fn(),
  },
}));

vi.mock('@/ecs/components', () => ({
  Selectable: { selected: new Float32Array(1000) },
  UnitStateMachine: {
    state: new Float32Array(1000),
    targetEntity: new Float32Array(1000),
    returnEntity: new Float32Array(1000),
    gatherTimer: new Float32Array(1000),
    attackMoveTargetX: new Float32Array(1000),
    attackMoveTargetY: new Float32Array(1000),
    hasAttackMoveTarget: new Float32Array(1000),
  },
}));

vi.mock('bitecs', () => ({
  hasComponent: () => true,
}));

vi.mock('@/input/selection/group-select', () => ({
  selectArmy: vi.fn(),
  selectIdleGeneralist: vi.fn(),
}));

vi.mock('@/input/selection/queries', () => ({
  hasPlayerUnitsSelected: vi.fn(() => true),
}));

vi.mock('@/rendering/pixi', () => ({
  setColorBlindMode: vi.fn(),
}));

vi.mock('@/save-system', () => ({
  saveGame: vi.fn(() => '{}'),
  loadGame: vi.fn(),
}));

vi.mock('@/storage', () => ({
  saveGameToDb: vi.fn(() => Promise.resolve()),
  getLatestSave: vi.fn(() => Promise.resolve(null)),
}));
vi.mock('@/errors', async () => {
  const actual = await vi.importActual<typeof import('@/errors')>('@/errors');
  return {
    ...actual,
    logError: vi.fn(),
  };
});

import { audio } from '@/audio/audio-system';
import { UnitStateMachine } from '@/ecs/components';
import { logError } from '@/errors';
import { game } from '@/game';
import { selectArmy, selectIdleGeneralist } from '@/input/selection/group-select';
import { setColorBlindMode } from '@/rendering/pixi';
import { loadGame } from '@/save-system';
import { getLatestSave, saveGameToDb } from '@/storage';
import {
  activateAttackMove,
  cycleIdleGeneralist,
  deselect,
  haltSelection,
  quickLoad,
  quickSave,
  selectAllUnits,
  selectArmyUnits,
  toggleColorBlind,
  toggleMute,
  togglePanel,
  togglePause,
} from '@/ui/game-actions';
import * as store from '@/ui/store';

beforeEach(() => {
  game.world.selection = [];
  game.world.attackMoveMode = false;
  game.world.paused = false;
  game.world.floatingTexts = [];
  game.world.autoBehaviors = { generalist: false, combat: false, support: false, recon: false };
  store.mobilePanelOpen.value = false;
  store.colorBlindMode.value = false;
  store.muted.value = false;
  vi.clearAllMocks();
});

describe('game-actions', () => {
  it('deselect clears selection and syncs UI', () => {
    game.world.selection = [1, 2, 3];
    game.world.isTracking = true;
    deselect();
    expect(game.world.selection).toEqual([]);
    expect(game.world.isTracking).toBe(false);
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('activateAttackMove sets attackMoveMode', () => {
    game.world.selection = [1];
    activateAttackMove();
    expect(game.world.attackMoveMode).toBe(true);
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('haltSelection stops units and syncs', () => {
    game.world.selection = [1, 2];
    UnitStateMachine.returnEntity[1] = 9;
    UnitStateMachine.gatherTimer[1] = 30;
    UnitStateMachine.attackMoveTargetX[1] = 100;
    UnitStateMachine.attackMoveTargetY[1] = 200;
    haltSelection();
    expect(game.syncUIStore).toHaveBeenCalled();
    // Yuka steering must be cleared so units physically stop
    expect(game.world.yukaManager.clearFormationBehaviors).toHaveBeenCalledTimes(2);
    expect(game.world.yukaManager.removeUnit).toHaveBeenCalledWith(1);
    expect(game.world.yukaManager.removeUnit).toHaveBeenCalledWith(2);
    expect(UnitStateMachine.returnEntity[1]).toBe(-1);
    expect(UnitStateMachine.gatherTimer[1]).toBe(0);
    expect(UnitStateMachine.attackMoveTargetX[1]).toBe(0);
    expect(UnitStateMachine.attackMoveTargetY[1]).toBe(0);
  });

  it('selectAllUnits calls selectArmy and syncs', () => {
    selectAllUnits();
    expect(selectArmy).toHaveBeenCalled();
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('cycleIdleGeneralist calls selectIdleGeneralist and syncs', () => {
    cycleIdleGeneralist();
    expect(selectIdleGeneralist).toHaveBeenCalled();
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('selectArmyUnits calls selectArmy and syncs', () => {
    selectArmyUnits();
    expect(selectArmy).toHaveBeenCalled();
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('togglePause flips paused state', () => {
    expect(game.world.paused).toBe(false);
    togglePause();
    expect(game.world.paused).toBe(true);
    togglePause();
    expect(game.world.paused).toBe(false);
  });

  it('togglePanel flips mobilePanelOpen signal', () => {
    expect(store.mobilePanelOpen.value).toBe(false);
    togglePanel();
    expect(store.mobilePanelOpen.value).toBe(true);
    togglePanel();
    expect(store.mobilePanelOpen.value).toBe(false);
  });

  it('toggleColorBlind flips colorBlindMode signal', () => {
    expect(store.colorBlindMode.value).toBe(false);
    toggleColorBlind();
    expect(store.colorBlindMode.value).toBe(true);
    expect(setColorBlindMode).toHaveBeenCalledWith(true);
  });

  it('toggleMute calls audio.toggleMute', () => {
    toggleMute();
    expect(audio.toggleMute).toHaveBeenCalled();
  });

  it('quickSave persists to DB and shows success feedback', async () => {
    quickSave();
    await Promise.resolve();

    expect(saveGameToDb).toHaveBeenCalled();
    expect(store.hasSaveGame.value).toBe(true);
    expect(audio.click).toHaveBeenCalled();
    expect(game.world.floatingTexts.at(-1)).toMatchObject({
      text: 'Game Saved',
      color: '#4ade80',
    });
  });

  it('quickSave logs a nonfatal error and shows failure feedback when persistence fails', async () => {
    vi.mocked(saveGameToDb).mockRejectedValueOnce(new Error('db down'));

    quickSave();
    await vi.waitFor(() => {
      expect(logError).toHaveBeenCalledTimes(1);
    });

    expect(audio.click).not.toHaveBeenCalled();
    expect(game.world.floatingTexts.at(-1)).toMatchObject({
      text: 'Save Failed',
      color: '#f87171',
    });
  });

  it('quickLoad restores the latest save and shows success feedback', async () => {
    vi.mocked(getLatestSave).mockResolvedValueOnce({ data: '{"ok":true}' } as Awaited<ReturnType<typeof getLatestSave>>);

    quickLoad();
    await Promise.resolve();

    expect(loadGame).toHaveBeenCalledWith(game.world, '{"ok":true}');
    expect(game.syncUIStore).toHaveBeenCalled();
    expect(audio.click).toHaveBeenCalled();
    expect(game.world.floatingTexts.at(-1)).toMatchObject({
      text: 'Game Loaded',
      color: '#4ade80',
    });
  });

  it('quickLoad shows a warning when no save exists', async () => {
    vi.mocked(getLatestSave).mockResolvedValueOnce(null);

    quickLoad();
    await Promise.resolve();

    expect(loadGame).not.toHaveBeenCalled();
    expect(audio.click).not.toHaveBeenCalled();
    expect(game.world.floatingTexts.at(-1)).toMatchObject({
      text: 'No Save Found',
      color: '#f59e0b',
    });
  });

  it('quickLoad logs a nonfatal error and shows failure feedback when loading fails', async () => {
    vi.mocked(getLatestSave).mockRejectedValueOnce(new Error('db read failed'));

    quickLoad();
    await vi.waitFor(() => {
      expect(logError).toHaveBeenCalledTimes(1);
    });

    expect(audio.click).not.toHaveBeenCalled();
    expect(game.world.floatingTexts.at(-1)).toMatchObject({
      text: 'Load Failed',
      color: '#f87171',
    });
  });
});
