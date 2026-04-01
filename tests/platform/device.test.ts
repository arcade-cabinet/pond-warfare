/**
 * Device Detection & Form Factor Classification Tests
 *
 * Validates classifyFormFactor with mocked inputs for every form factor,
 * isFoldableModel with known and unknown models, and getDeviceInfo fallback.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  classifyFormFactor,
  type DeviceInfo,
  type FormFactor,
  getDeviceInfo,
  isFoldableModel,
  type ScreenInfo,
} from '@/platform/device';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function device(overrides: Partial<DeviceInfo> = {}): DeviceInfo {
  return { model: '', manufacturer: '', platform: 'web', isNative: false, ...overrides };
}

function screen(w: number, h: number, coarse: boolean, hover: boolean): ScreenInfo {
  return { width: w, height: h, dpr: 1, pointerCoarse: coarse, hoverCapable: hover };
}

/** Shorthand: classify a native device with given model and screen dims. */
function classifyNative(model: string, w: number, h: number): FormFactor {
  return classifyFormFactor(
    device({ model, isNative: true, platform: 'android' }),
    screen(w, h, true, false),
  );
}

/** Shorthand: classify a web device with given screen + pointer signals. */
function classifyWeb(w: number, h: number, coarse: boolean, hover: boolean): FormFactor {
  return classifyFormFactor(device(), screen(w, h, coarse, hover));
}

// ---------------------------------------------------------------------------
// isFoldableModel
// ---------------------------------------------------------------------------

describe('isFoldableModel', () => {
  const knownModels = [
    ['SM-F946B', 'Samsung Z Fold 5'],
    ['SM-F936U', 'Samsung Z Fold 4'],
    ['SM-F926N', 'Samsung Z Fold 3'],
    ['CPH2551', 'OnePlus Open'],
    ['CPH2611', 'OnePlus Open 2'],
    ['G0B96', 'Google Pixel Fold'],
    ['GGH4X', 'Google Pixel 9 Pro Fold'],
  ] as const;

  for (const [model, name] of knownModels) {
    it(`matches ${name} (${model})`, () => {
      expect(isFoldableModel(model)).toBe(true);
    });
  }

  it('is case-insensitive', () => expect(isFoldableModel('sm-f946b')).toBe(true));
  it('rejects unknown model', () => expect(isFoldableModel('SM-G998B')).toBe(false));
  it('rejects empty string', () => expect(isFoldableModel('')).toBe(false));
});

// ---------------------------------------------------------------------------
// classifyFormFactor -- Native
// ---------------------------------------------------------------------------

describe('classifyFormFactor -- native', () => {
  it('foldable unfolded (square aspect)', () =>
    expect(classifyNative('SM-F946B', 2208, 1840)).toBe('foldable'));
  it('foldable folded (narrow aspect)', () =>
    expect(classifyNative('SM-F946B', 904, 2316)).toBe('phone'));
  it('small phone', () => expect(classifyNative('Pixel 7', 412, 915)).toBe('phone'));
  it('large Android tablet', () => expect(classifyNative('SM-X810', 1600, 2560)).toBe('tablet'));
  it('iPad', () => {
    const d = device({ model: 'iPad13,4', isNative: true, platform: 'ios' });
    expect(classifyFormFactor(d, screen(1366, 1024, true, false))).toBe('tablet');
  });
});

// ---------------------------------------------------------------------------
// classifyFormFactor -- Web
// ---------------------------------------------------------------------------

describe('classifyFormFactor -- web', () => {
  it('touch small = phone', () => expect(classifyWeb(390, 844, true, false)).toBe('phone'));
  it('touch medium = tablet', () => expect(classifyWeb(820, 1180, true, false)).toBe('tablet'));
  it('touch large = tablet', () => expect(classifyWeb(1920, 1080, true, false)).toBe('tablet'));
  it('mouse < 1600 = laptop', () => expect(classifyWeb(1366, 768, false, true)).toBe('laptop'));
  it('mouse >= 1600 = desktop', () => expect(classifyWeb(2560, 1440, false, true)).toBe('desktop'));
  it('mouse at 1600px boundary = desktop', () =>
    expect(classifyWeb(1600, 900, false, true)).toBe('desktop'));
  it('mouse at 1599px = laptop', () => expect(classifyWeb(1599, 900, false, true)).toBe('laptop'));
  it('fine pointer no hover = laptop', () =>
    expect(classifyWeb(1920, 1080, false, false)).toBe('laptop'));
});

// ---------------------------------------------------------------------------
// getDeviceInfo
// ---------------------------------------------------------------------------

describe('getDeviceInfo', () => {
  it('returns valid DeviceInfo shape on web', async () => {
    const info = await getDeviceInfo();
    expect(info.platform).toBe('web');
    expect(info.isNative).toBe(false);
    expect(typeof info.model).toBe('string');
    expect(typeof info.manufacturer).toBe('string');
  });

  it('falls back gracefully when Device plugin import fails', async () => {
    vi.doMock('@capacitor/device', () => {
      throw new Error('Module not found');
    });
    const { getDeviceInfo: fresh } = await import('@/platform/device');
    const info = await fresh();
    expect(info.platform).toBe('web');
    expect(info.isNative).toBe(false);
    vi.doUnmock('@capacitor/device');
  });
});
