/**
 * Panel Actions Tests
 *
 * Tests for the shared panel-actions helpers (panToEntity, selectEntity,
 * selectBuilding) used by Forces and Buildings tabs to pan the camera
 * and select entities from the command panel.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/game', () => ({
  game: {
    world: {
      selection: [] as number[],
      isTracking: false,
      ecs: {},
    },
    syncUIStore: vi.fn(),
    smoothPanTo: vi.fn(),
  },
}));

vi.mock('@/audio/audio-system', () => ({
  audio: {
    selectUnit: vi.fn(),
  },
}));

vi.mock('@/ecs/components', () => ({
  Position: {
    x: new Float32Array(1000),
    y: new Float32Array(1000),
  },
  Selectable: { selected: new Float32Array(1000) },
}));

vi.mock('bitecs', () => ({
  hasComponent: () => true,
}));

vi.mock('@/platform', () => ({
  canDockPanels: { value: false },
}));

import { audio } from '@/audio/audio-system';
import { Position, Selectable } from '@/ecs/components';
import { game } from '@/game';
import { panToEntity, selectBuilding, selectEntity } from '@/game/panel-actions';
import { canDockPanels } from '@/platform';
import * as store from '@/ui/store';

beforeEach(() => {
  game.world.selection = [];
  game.world.isTracking = false;
  store.mobilePanelOpen.value = false;
  (Selectable.selected as unknown as Float32Array).fill(0);
  (Position.x as unknown as Float32Array).fill(0);
  (Position.y as unknown as Float32Array).fill(0);
  vi.clearAllMocks();
});

describe('panToEntity', () => {
  it('pans the camera to the entity position', () => {
    Position.x[5] = 400;
    Position.y[5] = 300;
    panToEntity(5);
    expect(game.smoothPanTo).toHaveBeenCalledWith(400, 300);
  });
});

describe('selectEntity', () => {
  it('clears previous selection and selects new entity', () => {
    // Set up existing selection
    game.world.selection = [1, 2];
    Selectable.selected[1] = 1;
    Selectable.selected[2] = 1;

    Position.x[3] = 200;
    Position.y[3] = 150;

    selectEntity(3);

    // Previous selection cleared
    expect(Selectable.selected[1]).toBe(0);
    expect(Selectable.selected[2]).toBe(0);

    // New entity selected
    expect(game.world.selection).toEqual([3]);
    expect(Selectable.selected[3]).toBe(1);
    expect(game.world.isTracking).toBe(true);
  });

  it('pans camera to the selected entity', () => {
    Position.x[7] = 500;
    Position.y[7] = 600;
    selectEntity(7);
    expect(game.smoothPanTo).toHaveBeenCalledWith(500, 600);
  });

  it('plays selection audio', () => {
    selectEntity(1);
    expect(audio.selectUnit).toHaveBeenCalled();
  });

  it('syncs the UI store', () => {
    selectEntity(1);
    expect(game.syncUIStore).toHaveBeenCalled();
  });

  it('closes mobile panel when not docked', () => {
    store.mobilePanelOpen.value = true;
    (canDockPanels as { value: boolean }).value = false;
    selectEntity(1);
    expect(store.mobilePanelOpen.value).toBe(false);
  });

  it('keeps panel open when docked', () => {
    store.mobilePanelOpen.value = true;
    (canDockPanels as { value: boolean }).value = true;
    selectEntity(1);
    expect(store.mobilePanelOpen.value).toBe(true);
  });
});

describe('selectBuilding', () => {
  it('delegates to the same selection logic as selectEntity', () => {
    Position.x[10] = 800;
    Position.y[10] = 700;
    selectBuilding(10);

    expect(game.world.selection).toEqual([10]);
    expect(Selectable.selected[10]).toBe(1);
    expect(game.smoothPanTo).toHaveBeenCalledWith(800, 700);
    expect(audio.selectUnit).toHaveBeenCalled();
    expect(game.syncUIStore).toHaveBeenCalled();
  });
});
