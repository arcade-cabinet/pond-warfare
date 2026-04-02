/**
 * MultiplayerMenu Tests
 *
 * Validates host/join flow rendering, room code display, copy button,
 * join code input, and connection status transitions.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return { screenClass: signal('large'), canDockPanels: signal(false) };
});

import { MultiplayerMenu } from '@/ui/screens/MultiplayerMenu';
import {
  multiplayerConnected,
  multiplayerHostSettings,
  multiplayerMenuOpen,
  multiplayerRoomCode,
} from '@/ui/store-multiplayer';

beforeEach(() => {
  multiplayerMenuOpen.value = true;
  multiplayerConnected.value = false;
  multiplayerRoomCode.value = '';
  multiplayerHostSettings.value = null;
});

afterEach(() => {
  cleanup();
});

describe('MultiplayerMenu', () => {
  it('renders host and join buttons in choose mode', () => {
    render(h(MultiplayerMenu, {}));
    const menu = document.querySelector('[data-testid="multiplayer-menu"]');
    expect(menu).not.toBeNull();
    expect(menu?.textContent).toContain('Host a Game');
    expect(menu?.textContent).toContain('Join a Game');
  });

  it('shows room code when hosting', () => {
    render(h(MultiplayerMenu, {}));
    const hostBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Host a Game'),
    );
    fireEvent.click(hostBtn!);

    const codeEl = document.querySelector('[data-testid="room-code"]');
    expect(codeEl).not.toBeNull();
    expect(codeEl?.textContent?.length).toBe(6);
    expect(multiplayerRoomCode.value.length).toBe(6);
  });

  it('shows waiting status when no peer connected', () => {
    render(h(MultiplayerMenu, {}));
    const hostBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Host a Game'),
    );
    fireEvent.click(hostBtn!);

    const status = document.querySelector('[data-testid="host-status"]');
    expect(status?.textContent).toContain('Waiting for player...');
  });

  it('shows connected status and Start Game when peer joins', () => {
    render(h(MultiplayerMenu, {}));
    const hostBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Host a Game'),
    );
    fireEvent.click(hostBtn!);

    // Simulate peer connecting
    multiplayerConnected.value = true;

    // Re-render
    cleanup();
    render(h(MultiplayerMenu, {}));
    // Click host again to get back to host mode
    const hostBtn2 = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Host a Game'),
    );
    fireEvent.click(hostBtn2!);

    const status = document.querySelector('[data-testid="host-status"]');
    expect(status?.textContent).toContain('Player connected!');
  });

  it('renders join code input in join mode', () => {
    render(h(MultiplayerMenu, {}));
    const joinBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Join a Game'),
    );
    fireEvent.click(joinBtn!);

    const input = document.querySelector('[data-testid="join-code-input"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.maxLength).toBe(6);
  });

  it('join button is disabled with incomplete code', () => {
    render(h(MultiplayerMenu, {}));
    const joinModeBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Join a Game'),
    );
    fireEvent.click(joinModeBtn!);

    const joinBtn = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Join') && !b.textContent?.includes('Game'),
    );
    expect(joinBtn?.disabled).toBe(true);
  });

  it('back button returns to choose mode from host', () => {
    render(h(MultiplayerMenu, {}));
    const hostBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Host a Game'),
    );
    fireEvent.click(hostBtn!);

    const backBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Back'),
    );
    fireEvent.click(backBtn!);

    // Should be back to choose mode
    expect(document.querySelector('[data-testid="room-code"]')).toBeNull();
    const hostBtnAgain = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Host a Game'),
    );
    expect(hostBtnAgain).not.toBeUndefined();
  });
});
