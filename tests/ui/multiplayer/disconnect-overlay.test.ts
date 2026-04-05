// @vitest-environment jsdom
/**
 * DisconnectOverlay Tests
 *
 * Validates overlay rendering, reconnection countdown timer,
 * Continue Solo and Return to Menu actions.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return { screenClass: signal('large'), canDockPanels: signal(false) };
});

import { DisconnectOverlay } from '@/ui/overlays/DisconnectOverlay';
import { menuState } from '@/ui/store';
import { multiplayerDisconnected, multiplayerMode } from '@/ui/store-multiplayer';

beforeEach(() => {
  multiplayerDisconnected.value = true;
  multiplayerMode.value = true;
  menuState.value = 'playing';
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DisconnectOverlay', () => {
  it('renders nothing when not disconnected', () => {
    multiplayerDisconnected.value = false;
    render(h(DisconnectOverlay, {}));
    expect(document.querySelector('[data-testid="disconnect-overlay"]')).toBeNull();
  });

  it('renders overlay when disconnected', () => {
    render(h(DisconnectOverlay, {}));
    const overlay = document.querySelector('[data-testid="disconnect-overlay"]');
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toContain('Player Disconnected');
  });

  it('shows reconnection countdown timer', () => {
    render(h(DisconnectOverlay, {}));
    const timer = document.querySelector('[data-testid="reconnect-timer"]');
    expect(timer).not.toBeNull();
    expect(timer?.textContent).toContain('30s');
  });

  it('countdown decrements over time', async () => {
    vi.useFakeTimers();
    render(h(DisconnectOverlay, {}));

    // Advance by 5 seconds, flushing each tick for Preact state updates
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1000);
    }

    const timer = document.querySelector('[data-testid="reconnect-timer"]');
    expect(timer?.textContent).toContain('25s');
    vi.useRealTimers();
  });

  it('Continue Solo clears disconnect and multiplayer mode', () => {
    render(h(DisconnectOverlay, {}));
    const soloBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Continue Solo'),
    );
    fireEvent.click(soloBtn!);

    expect(multiplayerDisconnected.value).toBe(false);
    expect(multiplayerMode.value).toBe(false);
  });

  it('Return to Menu navigates back to main menu', () => {
    render(h(DisconnectOverlay, {}));
    const menuBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Return to Menu'),
    );
    fireEvent.click(menuBtn!);

    expect(multiplayerDisconnected.value).toBe(false);
    expect(multiplayerMode.value).toBe(false);
    expect(menuState.value).toBe('main');
  });
});
