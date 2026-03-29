/**
 * Keymap Tests
 *
 * Validates DEFAULT_KEYMAP structure, setKeymap merging,
 * and load/save with mock localStorage.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_KEYMAP,
  getKeymap,
  type KeyMap,
  loadKeymapFromStorage,
  saveKeymapToStorage,
  setKeymap,
} from '@/config/keymap';

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
      'idleWorker',
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
    setKeymap({ actionSlots: ['1', '2', '3', '4'] });
    expect(getKeymap().actionSlots).toEqual(['1', '2', '3', '4']);
  });
});

describe('loadKeymapFromStorage / saveKeymapToStorage', () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
    });
    // Reset keymap to default
    setKeymap(DEFAULT_KEYMAP);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setKeymap(DEFAULT_KEYMAP);
  });

  it('should save current keymap to localStorage', () => {
    setKeymap({ attackMove: 'z' });
    saveKeymapToStorage();
    expect(localStorage.setItem).toHaveBeenCalledWith('pond-warfare-keymap', expect.any(String));
    const stored = JSON.parse(mockStorage['pond-warfare-keymap']);
    expect(stored.attackMove).toBe('z');
  });

  it('should load keymap from localStorage', () => {
    mockStorage['pond-warfare-keymap'] = JSON.stringify({ halt: 'x', speed: 'g' });
    loadKeymapFromStorage();
    const keymap = getKeymap();
    expect(keymap.halt).toBe('x');
    expect(keymap.speed).toBe('g');
    // Non-overridden keys remain default
    expect(keymap.attackMove).toBe('a');
  });

  it('should handle missing localStorage entry gracefully', () => {
    loadKeymapFromStorage();
    expect(getKeymap().attackMove).toBe('a');
  });

  it('should handle invalid JSON in localStorage gracefully', () => {
    mockStorage['pond-warfare-keymap'] = '{invalid json!!!';
    expect(() => loadKeymapFromStorage()).not.toThrow();
    // Keymap should remain unchanged
    expect(getKeymap().attackMove).toBe('a');
  });
});
