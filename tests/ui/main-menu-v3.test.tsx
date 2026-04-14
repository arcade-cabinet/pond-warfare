// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { MenuScreen } from '@/ui/menu-screen';
import * as store from '@/ui/store';
import { multiplayerMenuOpen } from '@/ui/store-multiplayer';
import * as storeV3 from '@/ui/store-v3';

function resetSignals() {
  store.menuState.value = 'main';
  store.settingsOpen.value = false;
  store.keyboardRefOpen.value = false;
  multiplayerMenuOpen.value = false;
  storeV3.upgradesScreenOpen.value = false;
  storeV3.pearlScreenOpen.value = false;
  storeV3.totalClams.value = 0;
  storeV3.prestigeState.value = {
    rank: 0,
    pearls: 0,
    totalPearlsEarned: 0,
    upgradeRanks: {},
  };
}

describe('MenuScreen', () => {
  beforeEach(() => {
    resetSignals();
  });

  afterEach(() => {
    cleanup();
    resetSignals();
  });

  it('renders settings overlay from main menu state', () => {
    store.settingsOpen.value = true;
    const view = render(<MenuScreen />);

    expect(view.getByLabelText('Settings')).toBeTruthy();
  }, 15_000);

  it('renders the upgrade web overlay from main menu state', () => {
    storeV3.upgradesScreenOpen.value = true;
    storeV3.totalClams.value = 75;
    const view = render(<MenuScreen />);

    expect(view.getByText('Spend Clams')).toBeTruthy();
    expect(view.getByText('75C')).toBeTruthy();
  }, 15_000);

  it('renders the pearl loadout overlay from main menu state', () => {
    storeV3.pearlScreenOpen.value = true;
    const view = render(<MenuScreen />);

    expect(view.getByText('Pearl Loadout')).toBeTruthy();
  });
});
