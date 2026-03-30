/**
 * MenuTab Tests
 *
 * Tests the Menu tab renders tech tree, save, load, settings, and color blind
 * buttons and dispatches the correct game actions.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as store from '@/ui/store';

vi.mock('@/ui/game-actions', () => ({
  openTechTree: vi.fn(),
  quickSave: vi.fn(),
  quickLoad: vi.fn(),
  openSettings: vi.fn(),
  toggleColorBlind: vi.fn(),
}));

vi.mock('@/rendering/animations', () => ({
  cleanupEntityAnimation: vi.fn(),
  triggerCommandPulse: vi.fn(),
}));

import { openSettings, openTechTree, quickSave } from '@/ui/game-actions';
import { MenuTab } from '@/ui/panel/MenuTab';

beforeEach(() => {
  store.hasSaveGame.value = false;
  store.colorBlindMode.value = false;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('MenuTab', () => {
  it('renders tech tree, save, load, settings, color blind buttons', () => {
    render(h(MenuTab, {}));
    const buttons = Array.from(document.querySelectorAll('button'));
    const texts = buttons.map((b) => b.textContent?.trim());
    expect(texts.some((t) => t?.includes('TECH TREE'))).toBe(true);
    expect(texts).toContain('Save');
    expect(texts).toContain('Load');
    expect(texts.some((t) => t?.includes('Settings'))).toBe(true);
    expect(texts.some((t) => t?.includes('Color Blind'))).toBe(true);
  });

  it('Load button is disabled when no save exists', () => {
    store.hasSaveGame.value = false;
    render(h(MenuTab, {}));
    const loadBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Load',
    );
    expect(loadBtn?.disabled).toBe(true);
  });

  it('Load button is enabled when save exists', () => {
    store.hasSaveGame.value = true;
    render(h(MenuTab, {}));
    const loadBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Load',
    );
    expect(loadBtn?.disabled).toBe(false);
  });

  it('Tech Tree click calls openTechTree', () => {
    render(h(MenuTab, {}));
    const techBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('TECH TREE'),
    );
    techBtn?.click();
    expect(openTechTree).toHaveBeenCalledTimes(1);
  });

  it('Save click calls quickSave', () => {
    render(h(MenuTab, {}));
    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Save',
    );
    saveBtn?.click();
    expect(quickSave).toHaveBeenCalledTimes(1);
  });

  it('Settings click calls openSettings', () => {
    render(h(MenuTab, {}));
    const settingsBtn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Settings'),
    );
    settingsBtn?.click();
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
