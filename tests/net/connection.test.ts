import { describe, expect, it, vi } from 'vitest';
import { generateRoomCode } from '@/net/connection';

describe('generateRoomCode', () => {
  it('produces a 6-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(6);
  });

  it('contains only allowed characters (no I/O/0/1)', () => {
    const allowed = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/;
    for (let i = 0; i < 50; i++) {
      expect(generateRoomCode()).toMatch(allowed);
    }
  });

  it('generates unique codes', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) codes.add(generateRoomCode());
    // With 32^6 possibilities, 100 codes should all be unique
    expect(codes.size).toBe(100);
  });

  it('uses crypto.getRandomValues when available', () => {
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues');
    generateRoomCode();
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('falls back to Math.random when getRandomValues is unavailable', () => {
    const original = globalThis.crypto.getRandomValues;
    // Temporarily remove getRandomValues to trigger fallback
    Object.defineProperty(globalThis.crypto, 'getRandomValues', {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const mathSpy = vi.spyOn(Math, 'random');

    const code = generateRoomCode();
    expect(code).toHaveLength(6);
    expect(mathSpy).toHaveBeenCalled();

    mathSpy.mockRestore();
    Object.defineProperty(globalThis.crypto, 'getRandomValues', {
      value: original,
      writable: true,
      configurable: true,
    });
  });
});
