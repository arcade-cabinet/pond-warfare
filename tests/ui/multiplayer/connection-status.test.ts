/**
 * ConnectionStatus Tests
 *
 * Validates the in-game HUD connection indicator renders ping,
 * peer name, and correct color dot based on connection quality.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return { screenClass: signal('large'), canDockPanels: signal(false) };
});

import { ConnectionStatus } from '@/ui/hud/ConnectionStatus';
import {
  multiplayerDisconnected,
  multiplayerMode,
  multiplayerPeerId,
  multiplayerPing,
} from '@/ui/store-multiplayer';

beforeEach(() => {
  multiplayerMode.value = true;
  multiplayerPing.value = 42;
  multiplayerPeerId.value = 'Otter-Friend';
  multiplayerDisconnected.value = false;
});

afterEach(() => {
  cleanup();
});

describe('ConnectionStatus', () => {
  it('renders nothing when multiplayer is off', () => {
    multiplayerMode.value = false;
    render(h(ConnectionStatus, {}));
    expect(document.querySelector('[data-testid="connection-status"]')).toBeNull();
  });

  it('shows ping value', () => {
    render(h(ConnectionStatus, {}));
    const el = document.querySelector('[data-testid="connection-status"]');
    expect(el?.textContent).toContain('42ms');
  });

  it('shows peer name', () => {
    render(h(ConnectionStatus, {}));
    const el = document.querySelector('[data-testid="connection-status"]');
    expect(el?.textContent).toContain('Otter-Friend');
  });

  it('shows green dot when connected with low ping', () => {
    render(h(ConnectionStatus, {}));
    const dot = document.querySelector('[data-testid="connection-dot"]') as HTMLElement;
    expect(dot.style.background).toContain('--pw-success');
  });

  it('shows yellow dot when ping is degraded', () => {
    multiplayerPing.value = 250;
    render(h(ConnectionStatus, {}));
    const dot = document.querySelector('[data-testid="connection-dot"]') as HTMLElement;
    expect(dot.style.background).toContain('--pw-warning');
  });

  it('shows red dot when disconnected', () => {
    multiplayerDisconnected.value = true;
    render(h(ConnectionStatus, {}));
    const dot = document.querySelector('[data-testid="connection-dot"]') as HTMLElement;
    expect(dot.style.background).toContain('--pw-hp-low');
  });
});
