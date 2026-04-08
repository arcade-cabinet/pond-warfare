// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { OnboardingHint } from '@/ui/hud/OnboardingHint';
import * as store from '@/ui/store';

const STORAGE_KEY = 'pw_onboarding_v2';

function installMemoryStorage() {
  const backing = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => backing.set(key, String(value)),
      removeItem: (key: string) => backing.delete(key),
      clear: () => backing.clear(),
      key: (index: number) => [...backing.keys()][index] ?? null,
      get length() {
        return backing.size;
      },
    },
  });
}

describe('OnboardingHint', () => {
  beforeEach(() => {
    installMemoryStorage();
    localStorage.removeItem(STORAGE_KEY);
    store.gameState.value = 'playing';
    store.globalProductionQueue.value = [];
    store.unitRoster.value = [];
    store.hasPlayerUnits.value = false;
    store.selectionCount.value = 0;
    store.waveNumber.value = 0;
    store.baseThreatCount.value = 0;
    store.gameEvents.value = [];
  });

  afterEach(() => {
    cleanup();
    localStorage.removeItem(STORAGE_KEY);
  });

  it('renders the first-step Lodge training guidance for a fresh session', () => {
    render(<OnboardingHint />);

    expect(screen.getByText('First Match Guide')).toBeTruthy();
    expect(screen.getByText('Train From the Lodge')).toBeTruthy();
    expect(
      screen.getByText(/Use the Lodge to field Mudpaws/i),
    ).toBeTruthy();
  });

  it('advances through the action-driven onboarding steps and completes on first pressure', async () => {
    render(<OnboardingHint />);

    act(() => {
      store.globalProductionQueue.value = [
        { buildingKind: 1, unitLabel: 'Mudpaw', progress: 0 },
      ];
    });

    await waitFor(() => {
      expect(screen.getByText('Command Your Mudpaws')).toBeTruthy();
    });

    act(() => {
      store.hasPlayerUnits.value = true;
      store.selectionCount.value = 1;
    });

    await waitFor(() => {
      expect(screen.getByText('Hold The First Wave')).toBeTruthy();
    });

    act(() => {
      store.waveNumber.value = 1;
    });

    await waitFor(() => {
      expect(screen.queryByText('First Match Guide')).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('complete');
  });

  it('dismisses and persists when the player hides the coach', async () => {
    render(<OnboardingHint />);

    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));

    await waitFor(() => {
      expect(screen.queryByText('First Match Guide')).toBeNull();
    });
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dismissed');
  });

  it('stays hidden after completion or dismissal has already been recorded', () => {
    localStorage.setItem(STORAGE_KEY, 'complete');

    render(<OnboardingHint />);

    expect(screen.queryByText('First Match Guide')).toBeNull();
  });
});
