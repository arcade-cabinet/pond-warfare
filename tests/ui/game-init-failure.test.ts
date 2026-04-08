// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearErrorLog, clearFatalError, getFatalError } from '@/errors';
import { handleGameInitFailure } from '@/ui/game-init-failure';
import * as store from '@/ui/store';

describe('handleGameInitFailure', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.gameLoading.value = true;
    store.continueRequested.value = true;
    store.menuState.value = 'playing';
    clearFatalError();
    clearErrorLog();
  });

  afterEach(() => {
    clearFatalError();
    clearErrorLog();
    store.gameLoading.value = false;
    store.continueRequested.value = false;
    store.menuState.value = 'main';
    vi.restoreAllMocks();
  });

  it('returns to the menu and raises a fatal error when startup fails', () => {
    handleGameInitFailure(new Error('Startup blew up'));

    expect(store.gameLoading.value).toBe(false);
    expect(store.continueRequested.value).toBe(false);
    expect(store.menuState.value).toBe('main');
    expect(getFatalError()?.message).toBe('Startup blew up');
  });
});
