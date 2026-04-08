// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPanel } from '@/ui/command-panel';
import * as store from '@/ui/store';

vi.mock('@/ui/action-panel', () => ({
  ActionPanel: () => <div data-testid="action-panel">Action Panel</div>,
}));

vi.mock('@/ui/selection-panel', () => ({
  SelectionPanel: () => <div data-testid="selection-panel">Selection Panel</div>,
}));

vi.mock('@/game/panel-actions', () => ({
  selectBuilding: vi.fn(),
  selectEntity: vi.fn(),
}));

vi.mock('@/ui/game-actions', () => ({
  activateAttackMove: vi.fn(),
  cycleIdleGeneralist: vi.fn(),
  deselect: vi.fn(),
  haltSelection: vi.fn(),
  openKeyboardRef: vi.fn(),
  openSettings: vi.fn(),
  quickLoad: vi.fn(),
  quickSave: vi.fn(),
  selectArmyUnits: vi.fn(),
  toggleColorBlind: vi.fn(),
}));

beforeEach(() => {
  store.mobilePanelOpen.value = true;
  store.unitRoster.value = [
    {
      role: 'generalist',
      idleCount: 0,
      automationEnabled: false,
      units: [
        {
          eid: 1,
          kind: 0,
          label: 'Mudpaw',
          task: 'gathering-fish',
          targetName: '',
          hp: 30,
          maxHp: 30,
          hasOverride: false,
        },
        {
          eid: 2,
          kind: 7,
          label: 'Lookout',
          task: 'scouting',
          targetName: '',
          hp: 20,
          maxHp: 20,
          hasOverride: false,
        },
      ],
    },
  ];
  store.buildingRoster.value = [];
});

afterEach(() => {
  cleanup();
});

describe('CommandPanel Forces tab', () => {
  it('renders human-readable unit task labels instead of raw task ids', () => {
    render(<CommandPanel onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Forces' }));

    expect(screen.getByText(/Mudpaw/)).toBeTruthy();
    expect(screen.getByText(/Gathering Fish/)).toBeTruthy();
    expect(screen.getByText(/Recon/)).toBeTruthy();
    expect(screen.queryByText(/gathering-fish/)).toBeNull();
    expect(screen.queryByText(/scouting/)).toBeNull();
  });
});
