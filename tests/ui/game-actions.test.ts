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
      yukaManager: { removeUnit: vi.fn() },
      resources: { clams: 500, twigs: 300 },
      floatingTexts: [] as unknown[],
      camX: 0,
      camY: 0,
      viewWidth: 800,
      viewHeight: 600,
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
    hasAttackMoveTarget: new Float32Array(1000),
  },
}));

vi.mock('bitecs', () => ({
  hasComponent: () => true,
}));

vi.mock('@/input/selection', () => ({
  hasPlayerUnitsSelected: vi.fn(() => true),
  selectArmy: vi.fn(),
  selectIdleWorker: vi.fn(),
}));

vi.mock('@/rendering/pixi-app', () => ({
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

import { audio } from '@/audio/audio-system';
import { game } from '@/game';
import { selectArmy, selectIdleWorker } from '@/input/selection';
import { setColorBlindMode } from '@/rendering/pixi-app';
import {
  activateAttackMove,
  cycleIdleWorker,
  deselect,
  haltSelection,
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
    haltSelection();
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('selectAllUnits calls selectArmy and syncs', () => {
    selectAllUnits();
    expect(selectArmy).toHaveBeenCalled();
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('cycleIdleWorker calls selectIdleWorker and syncs', () => {
    cycleIdleWorker();
    expect(selectIdleWorker).toHaveBeenCalled();
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
});
