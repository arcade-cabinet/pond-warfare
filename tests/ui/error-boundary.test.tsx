// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearErrorLog, clearFatalError, getErrorLog, getFatalError } from '@/errors';
import { ErrorBoundary } from '@/ui/error-boundary';
import * as store from '@/ui/store';

function BrokenChild() {
  if (store.menuState.value === 'playing') {
    throw new Error('Render exploded');
  }
  return <div>Recovered</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    clearErrorLog();
    clearFatalError();
    store.menuState.value = 'playing';
    store.gameLoading.value = true;
    store.continueRequested.value = true;
  });

  afterEach(() => {
    cleanup();
    clearErrorLog();
    clearFatalError();
    store.menuState.value = 'main';
    store.gameLoading.value = false;
    store.continueRequested.value = false;
  });

  it('reports render errors as fatal and recovers back to the main menu', () => {
    const view = render(h(ErrorBoundary, null, h(BrokenChild, null)));

    expect(view.getByText('Game Error')).toBeTruthy();
    expect(getFatalError()?.message).toBe('Render exploded');
    expect(getErrorLog()).toHaveLength(1);
    expect(getErrorLog()[0].isFatal).toBe(true);

    fireEvent.click(view.getByRole('button', { name: 'Retry' }));

    expect(store.menuState.value).toBe('main');
    expect(store.gameLoading.value).toBe(false);
    expect(store.continueRequested.value).toBe(false);
    expect(getFatalError()).toBeNull();
  });
});
