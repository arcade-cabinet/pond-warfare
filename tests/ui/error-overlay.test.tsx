// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearErrorLog, clearFatalError, getFatalError, reportFatalError } from '@/errors';
import { restartMountedGameSession } from '@/game/shell-session';
import { ErrorOverlay } from '@/ui/error-overlay';
import * as store from '@/ui/store';

vi.mock('@/game/shell-session', () => ({
  restartMountedGameSession: vi.fn().mockResolvedValue(true),
}));

describe('ErrorOverlay', () => {
  beforeEach(() => {
    clearErrorLog();
    clearFatalError();
    store.menuState.value = 'main';
    store.gameLoading.value = true;
    store.continueRequested.value = true;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    clearErrorLog();
    clearFatalError();
    store.menuState.value = 'main';
    store.gameLoading.value = false;
    store.continueRequested.value = false;
  });

  it('renders fatal errors as recovery-only modals on the menu shell', async () => {
    const view = render(<ErrorOverlay />);

    reportFatalError(new Error('Menu startup blew up'));

    await waitFor(() => {
      expect(view.getByText('Fatal Error')).toBeTruthy();
    });

    expect(view.getByRole('button', { name: 'Return to Menu' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Dismiss' })).toBeNull();

    fireEvent.click(view.getByRole('button', { name: 'Return to Menu' }));

    await waitFor(() => {
      expect(getFatalError()).toBeNull();
    });

    expect(store.menuState.value).toBe('main');
    expect(store.gameLoading.value).toBe(false);
    expect(store.continueRequested.value).toBe(false);
    expect(restartMountedGameSession).not.toHaveBeenCalled();
  });

  it('retries the mounted session instead of dismissing a fatal in-match crash', async () => {
    store.menuState.value = 'playing';

    const view = render(<ErrorOverlay />);

    reportFatalError(new Error('Match blew up'));

    await waitFor(() => {
      expect(view.getByRole('button', { name: 'Retry Session' })).toBeTruthy();
    });

    expect(view.queryByRole('button', { name: 'Dismiss' })).toBeNull();

    fireEvent.click(view.getByRole('button', { name: 'Retry Session' }));

    await waitFor(() => {
      expect(restartMountedGameSession).toHaveBeenCalledTimes(1);
    });

    expect(getFatalError()).toBeNull();
  });
});
