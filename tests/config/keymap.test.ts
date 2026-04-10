/**
 * Keymap Tests
 *
 * Validates DEFAULT_KEYMAP structure, setKeymap merging,
 * and load/save with mock Capacitor Preferences.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logError } from '@/errors';
import {
  DEFAULT_KEYMAP,
  getKeymap,
  type KeyMap,
  loadKeymapFromStorage,
  saveKeymapToStorage,
  setKeymap,
} from '@/config/keymap';

// Mock the native module so we don't need real Capacitor
const mockPrefs: Record<string, string> = {};
const mockLoadPreference = vi.fn(async (key: string) => mockPrefs[key] ?? null);
const mockSavePreference = vi.fn(async (key: string, value: string) => {
  mockPrefs[key] = value;
});
vi.mock('@/platform/native', () => ({
  savePreference: (...args: [string, string]) => mockSavePreference(...args),
  loadPreference: (...args: [string]) => mockLoadPreference(...args),
}));

vi.mock('@/errors', async () => {
  const actual = await vi.importActual<typeof import('@/errors')>('@/errors');
  return {
    ...actual,
    logError: vi.fn(),
  };
});

describe('DEFAULT_KEYMAP', () => {
  it('should have all expected keys', () => {
    const expectedKeys: (keyof KeyMap)[] = [
      'panUp',
      'panDown',
      'panLeft',
      'panRight',
      'attackMove',
      'halt',
      'pause',
      'mute',
      'speed',
      'idleGeneralist',
      'selectArmy',
      'centerSelection',
      'cycleBuildings',
      'escape',
      'actionSlots',
    ];
    for (const key of expectedKeys) {
      expect(DEFAULT_KEYMAP[key]).toBeDefined();
    }
  });

  it('should have array values for pan directions', () => {
    expect(Array.isArray(DEFAULT_KEYMAP.panUp)).toBe(true);
    expect(Array.isArray(DEFAULT_KEYMAP.panDown)).toBe(true);
    expect(Array.isArray(DEFAULT_KEYMAP.panLeft)).toBe(true);
    expect(Array.isArray(DEFAULT_KEYMAP.panRight)).toBe(true);
  });

  it('should have string values for single-key bindings', () => {
    expect(typeof DEFAULT_KEYMAP.attackMove).toBe('string');
    expect(typeof DEFAULT_KEYMAP.halt).toBe('string');
    expect(typeof DEFAULT_KEYMAP.pause).toBe('string');
    expect(typeof DEFAULT_KEYMAP.mute).toBe('string');
    expect(typeof DEFAULT_KEYMAP.escape).toBe('string');
  });

  it('should have 6 action slots (Q, W, E, R, T, Y)', () => {
    expect(DEFAULT_KEYMAP.actionSlots).toHaveLength(6);
    expect(DEFAULT_KEYMAP.actionSlots).toEqual(['q', 'w', 'e', 'r', 't', 'y']);
  });
});

describe('setKeymap / getKeymap', () => {
  afterEach(() => {
    // Reset to default after each test
    setKeymap(DEFAULT_KEYMAP);
  });

  it('should return the active keymap', () => {
    const keymap = getKeymap();
    expect(keymap.attackMove).toBe('a');
  });

  it('should merge partial keymap overrides', () => {
    setKeymap({ attackMove: 'x', halt: 'j' });
    const keymap = getKeymap();
    expect(keymap.attackMove).toBe('x');
    expect(keymap.halt).toBe('j');
    // Unchanged keys should remain
    expect(keymap.pause).toBe('p');
    expect(keymap.mute).toBe('m');
  });

  it('should allow overriding pan keys', () => {
    setKeymap({ panUp: ['i', 'arrowup'] });
    const keymap = getKeymap();
    expect(keymap.panUp).toEqual(['i', 'arrowup']);
    // Other pan keys unchanged
    expect(keymap.panDown).toEqual(DEFAULT_KEYMAP.panDown);
  });

  it('should allow overriding action slots', () => {
    setKeymap({ actionSlots: ['1', '2', '3', '4', '5', '6'] });
    expect(getKeymap().actionSlots).toEqual(['1', '2', '3', '4', '5', '6']);
  });

  it('should pad short actionSlots with defaults', () => {
    setKeymap({ actionSlots: ['1', '2'] as any });
    const slots = getKeymap().actionSlots;
    expect(slots).toHaveLength(6);
    // First two are overridden, rest are defaults
    expect(slots[0]).toBe('1');
    expect(slots[1]).toBe('2');
    expect(slots[2]).toBe(DEFAULT_KEYMAP.actionSlots[2]);
    expect(slots[3]).toBe(DEFAULT_KEYMAP.actionSlots[3]);
    expect(slots[4]).toBe(DEFAULT_KEYMAP.actionSlots[4]);
    expect(slots[5]).toBe(DEFAULT_KEYMAP.actionSlots[5]);
  });
});

describe('loadKeymapFromStorage / saveKeymapToStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock prefs
    for (const key of Object.keys(mockPrefs)) {
      delete mockPrefs[key];
    }
    mockLoadPreference.mockImplementation(async (key: string) => mockPrefs[key] ?? null);
    mockSavePreference.mockImplementation(async (key: string, value: string) => {
      mockPrefs[key] = value;
    });
    // Reset keymap to default
    setKeymap(DEFAULT_KEYMAP);
  });

  afterEach(() => {
    setKeymap(DEFAULT_KEYMAP);
  });

  it('should save current keymap to Preferences', async () => {
    setKeymap({ attackMove: 'z' });
    await saveKeymapToStorage();
    const stored = JSON.parse(mockPrefs['pond-warfare-keymap']);
    expect(stored.attackMove).toBe('z');
  });

  it('should load keymap from Preferences', async () => {
    mockPrefs['pond-warfare-keymap'] = JSON.stringify({ halt: 'x', speed: 'g' });
    await loadKeymapFromStorage();
    const keymap = getKeymap();
    expect(keymap.halt).toBe('x');
    expect(keymap.speed).toBe('g');
    // Non-overridden keys remain default
    expect(keymap.attackMove).toBe('a');
  });

  it('should handle missing Preferences entry gracefully', async () => {
    await loadKeymapFromStorage();
    expect(getKeymap().attackMove).toBe('a');
  });

  it('should handle invalid JSON in Preferences gracefully', async () => {
    mockPrefs['pond-warfare-keymap'] = '{invalid json!!!';
    await expect(loadKeymapFromStorage()).resolves.toBeUndefined();
    // Keymap should remain unchanged
    expect(getKeymap().attackMove).toBe('a');
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('should log load failures instead of rejecting', async () => {
    mockLoadPreference.mockRejectedValueOnce(new Error('prefs unavailable'));

    await expect(loadKeymapFromStorage()).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledTimes(1);
  });

  it('should log save failures instead of rejecting', async () => {
    mockSavePreference.mockRejectedValueOnce(new Error('prefs unavailable'));

    await expect(saveKeymapToStorage()).resolves.toBeUndefined();
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
