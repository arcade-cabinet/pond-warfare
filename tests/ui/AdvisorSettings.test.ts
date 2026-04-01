/**
 * AdvisorSettings Tests
 *
 * Validates the per-advisor toggle controls render correctly,
 * toggle individual advisors, and the "Disable All" master switch
 * works as expected.
 */

import { cleanup, render, waitFor } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* ── Hoisted mocks ────────────────────────────────────────── */

const mockSettings = vi.hoisted(() => ({
  load: vi.fn(() => Promise.resolve({ economy: true, war: true, builder: true })),
  save: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/advisors/advisor-state', () => ({
  loadAdvisorSettings: mockSettings.load,
  saveAdvisorSettings: mockSettings.save,
}));

vi.mock('@/game', () => ({
  game: {
    world: {
      advisorState: {
        enabled: { economy: true, war: true, builder: true },
      },
    },
  },
}));

vi.mock('@/ui/store', async () => {
  const { signal } = await import('@preact/signals');
  return { menuState: signal('playing') };
});

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return { screenClass: signal('large'), canDockPanels: signal(false) };
});

import { game } from '@/game';
import { AdvisorSettings } from '@/ui/components/AdvisorSettings';

beforeEach(() => {
  mockSettings.load.mockResolvedValue({ economy: true, war: true, builder: true });
  mockSettings.save.mockResolvedValue(undefined);
  game.world.advisorState.enabled = { economy: true, war: true, builder: true };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdvisorSettings', () => {
  it('renders all three advisor toggles with names and roles', async () => {
    render(h(AdvisorSettings, {}));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Elder Whiskers');
      expect(document.body.textContent).toContain('(Economy)');
      expect(document.body.textContent).toContain('Captain Claw');
      expect(document.body.textContent).toContain('(War)');
      expect(document.body.textContent).toContain('Architect Pebble');
      expect(document.body.textContent).toContain('(Builder)');
    });
  });

  it('renders colored advisor icons', async () => {
    render(h(AdvisorSettings, {}));
    await waitFor(() => {
      const icons = document.querySelectorAll('.advisor-icon');
      expect(icons).toHaveLength(3);
      expect((icons[0] as HTMLElement).textContent).toBe('E');
      expect((icons[1] as HTMLElement).textContent).toBe('W');
      expect((icons[2] as HTMLElement).textContent).toBe('B');
    });
  });

  it('renders Disable All Advisors master switch', async () => {
    render(h(AdvisorSettings, {}));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Disable All Advisors');
    });
  });

  it('toggles individual advisor and saves', async () => {
    render(h(AdvisorSettings, {}));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Elder Whiskers');
    });

    // Find the first toggle button (economy advisor)
    const toggleButtons = document.querySelectorAll('button[class*="rounded-full"]');
    expect(toggleButtons.length).toBeGreaterThanOrEqual(4); // 3 advisors + 1 master

    // Click economy toggle to disable it
    (toggleButtons[0] as HTMLElement).click();

    expect(mockSettings.save).toHaveBeenCalledWith({
      economy: false,
      war: true,
      builder: true,
    });
    expect(game.world.advisorState.enabled.economy).toBe(false);
  });

  it('disable-all sets all advisors to false', async () => {
    render(h(AdvisorSettings, {}));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Disable All');
    });

    // The last toggle is the master "Disable All" switch
    const toggleButtons = document.querySelectorAll('button[class*="rounded-full"]');
    const masterToggle = toggleButtons[toggleButtons.length - 1] as HTMLElement;
    masterToggle.click();

    expect(mockSettings.save).toHaveBeenCalledWith({
      economy: false,
      war: false,
      builder: false,
    });
  });

  it('re-enables all when disable-all is clicked while all are off', async () => {
    mockSettings.load.mockResolvedValue({ economy: false, war: false, builder: false });
    render(h(AdvisorSettings, {}));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Elder Whiskers');
    });

    const toggleButtons = document.querySelectorAll('button[class*="rounded-full"]');
    const masterToggle = toggleButtons[toggleButtons.length - 1] as HTMLElement;
    masterToggle.click();

    expect(mockSettings.save).toHaveBeenCalledWith({
      economy: true,
      war: true,
      builder: true,
    });
  });

  it('loads initial state from loadAdvisorSettings on mount', async () => {
    mockSettings.load.mockResolvedValue({ economy: false, war: true, builder: false });
    render(h(AdvisorSettings, {}));

    await waitFor(() => {
      expect(mockSettings.load).toHaveBeenCalledTimes(1);
    });
  });
});
