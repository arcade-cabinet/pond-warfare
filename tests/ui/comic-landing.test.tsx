// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ComicLanding, resetComicLandingState } from '@/ui/comic-landing';
import * as store from '@/ui/store';
import { multiplayerMenuOpen } from '@/ui/store-multiplayer';
import * as storeV3 from '@/ui/store-v3';

function resetSignals() {
  resetComicLandingState();
  store.menuState.value = 'main';
  store.settingsOpen.value = false;
  store.hasSaveGame.value = false;
  store.continueRequested.value = false;
  store.selectedDifficulty.value = 'normal';
  store.permadeathEnabled.value = false;
  multiplayerMenuOpen.value = false;
  storeV3.upgradesScreenOpen.value = false;
  storeV3.pearlScreenOpen.value = false;
  storeV3.prestigeRank.value = 0;
}

describe('ComicLanding', () => {
  beforeEach(() => {
    resetSignals();
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup();
    resetSignals();
  });

  it('renders the three main landing panels', () => {
    const view = render(<ComicLanding />);

    expect(view.getByText('PLAY')).toBeTruthy();
    expect(view.getByText('UPGRADES')).toBeTruthy();
    expect(view.getByText('SETTINGS')).toBeTruthy();
    expect(view.queryByText('CONTINUE')).toBeNull();
    expect(view.queryByText('PRESTIGE')).toBeNull();
  });

  it('shows CONTINUE when a save exists', () => {
    store.hasSaveGame.value = true;
    const view = render(<ComicLanding />);

    expect(view.getByText('CONTINUE')).toBeTruthy();
  });

  it('shows PRESTIGE when the player has ranked up', () => {
    storeV3.prestigeRank.value = 1;
    const view = render(<ComicLanding />);

    expect(view.getByText('PRESTIGE')).toBeTruthy();
  });

  it('opens the play-mode stage from PLAY', () => {
    const view = render(<ComicLanding />);

    fireEvent.click(view.getByText('PLAY'));

    expect(view.getByText('SINGLE PLAYER')).toBeTruthy();
    expect(view.getByText('MULTIPLAYER')).toBeTruthy();
    expect(view.getByText('BACK')).toBeTruthy();
    expect(view.getByText('SETTINGS')).toBeTruthy();
  });

  it('starts a new single-player match from play-mode', () => {
    const view = render(<ComicLanding />);

    fireEvent.click(view.getByText('PLAY'));
    fireEvent.click(view.getByText('SINGLE PLAYER'));

    expect(store.menuState.value).toBe('playing');
    expect(store.continueRequested.value).toBe(false);
  });

  it('sets continueRequested and starts the game from CONTINUE', () => {
    store.hasSaveGame.value = true;
    const view = render(<ComicLanding />);

    fireEvent.click(view.getByText('CONTINUE'));

    expect(store.continueRequested.value).toBe(true);
    expect(store.menuState.value).toBe('playing');
  });

  it('opens the upgrade web from UPGRADES', () => {
    const view = render(<ComicLanding />);

    fireEvent.click(view.getByText('UPGRADES'));

    expect(storeV3.upgradesScreenOpen.value).toBe(true);
    expect(storeV3.pearlScreenOpen.value).toBe(false);
  });

  it('opens the pearl screen from PRESTIGE', () => {
    storeV3.prestigeRank.value = 2;
    const view = render(<ComicLanding />);

    fireEvent.click(view.getByText('PRESTIGE'));

    expect(storeV3.pearlScreenOpen.value).toBe(true);
    expect(storeV3.upgradesScreenOpen.value).toBe(false);
  });

  it('opens settings from either landing stage', () => {
    const view = render(<ComicLanding />);

    fireEvent.click(view.getByText('SETTINGS'));
    expect(store.settingsOpen.value).toBe(true);

    store.settingsOpen.value = false;
    fireEvent.click(view.getByText('PLAY'));
    fireEvent.click(view.getByText('SETTINGS'));
    expect(store.settingsOpen.value).toBe(true);
  });
});
