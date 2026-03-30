/**
 * CommandsTab Tests
 *
 * Tests the Commands tab component renders correctly based on store signals
 * and that buttons dispatch the right game actions.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '@/ui/store';

// Mock game-actions so we can verify calls without game internals
vi.mock('@/ui/game-actions', () => ({
  deselect: vi.fn(),
  haltSelection: vi.fn(),
  selectAllUnits: vi.fn(),
  cycleIdleWorker: vi.fn(),
  selectArmyUnits: vi.fn(),
}));

vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

import { deselect, haltSelection, selectAllUnits } from '@/ui/game-actions';
import { CommandsTab } from '@/ui/panel/CommandsTab';

beforeEach(() => {
  store.selectionCount.value = 0;
  store.idleWorkerCount.value = 0;
  store.idleGathererCount.value = 0;
  store.idleCombatCount.value = 0;
  store.idleHealerCount.value = 0;
  store.idleScoutCount.value = 0;
  store.armyCount.value = 0;
  store.autoGatherEnabled.value = false;
  store.autoBuildEnabled.value = false;
  store.autoAttackEnabled.value = false;
  store.autoDefendEnabled.value = false;
  store.autoHealEnabled.value = false;
  store.autoScoutEnabled.value = false;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('CommandsTab', () => {
  it('renders Deselect, Stop, Select All buttons', () => {
    render(h(CommandsTab, {}));
    const buttons = document.querySelectorAll('button');
    const texts = Array.from(buttons).map((b) => b.textContent?.trim());
    expect(texts).toContain('Deselect');
    expect(texts).toContain('Stop');
    expect(texts).toContain('Select All');
  });

  it('Deselect and Stop are disabled when nothing selected', () => {
    store.selectionCount.value = 0;
    render(h(CommandsTab, {}));
    const deselectBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Deselect',
    );
    expect(deselectBtn?.disabled).toBe(true);
  });

  it('Deselect and Stop are enabled when units selected', () => {
    store.selectionCount.value = 3;
    render(h(CommandsTab, {}));
    const deselectBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Deselect',
    );
    expect(deselectBtn?.disabled).toBe(false);
  });

  it('Deselect click calls deselect action', () => {
    store.selectionCount.value = 3;
    render(h(CommandsTab, {}));
    const deselectBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Deselect',
    );
    deselectBtn?.click();
    expect(deselect).toHaveBeenCalledTimes(1);
  });

  it('Stop click calls haltSelection action', () => {
    store.selectionCount.value = 3;
    render(h(CommandsTab, {}));
    const stopBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Stop',
    );
    stopBtn?.click();
    expect(haltSelection).toHaveBeenCalledTimes(1);
  });

  it('Select All click calls selectAllUnits action', () => {
    render(h(CommandsTab, {}));
    const selectAllBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Select All',
    );
    selectAllBtn?.click();
    expect(selectAllUnits).toHaveBeenCalledTimes(1);
  });

  it('shows idle count button when idle workers exist', () => {
    store.idleWorkerCount.value = 5;
    render(h(CommandsTab, {}));
    const idleBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Idle'),
    );
    expect(idleBtn).toBeTruthy();
    expect(idleBtn?.textContent).toContain('5');
  });

  it('shows auto-behavior toggles for idle gatherers', () => {
    store.idleWorkerCount.value = 2;
    store.idleGathererCount.value = 2;
    render(h(CommandsTab, {}));
    const buttons = Array.from(document.querySelectorAll('button'));
    const labels = buttons.map((b) => b.textContent?.trim());
    expect(labels).toContain('Gather');
    expect(labels).toContain('Build');
  });

  it('auto-behavior toggle flips signal on click', () => {
    store.idleWorkerCount.value = 1;
    store.idleGathererCount.value = 1;
    render(h(CommandsTab, {}));
    const gatherBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Gather'),
    );
    expect(store.autoGatherEnabled.value).toBe(false);
    gatherBtn?.click();
    expect(store.autoGatherEnabled.value).toBe(true);
  });
});
