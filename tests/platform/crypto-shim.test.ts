import { describe, expect, it } from 'vitest';
import { randomBytes, randomFillSync } from '@/platform/crypto-shim';

describe('crypto shim', () => {
  it('fills an existing Uint8Array in place', () => {
    const bytes = new Uint8Array(16);
    const result = randomFillSync(bytes);
    expect(result).toBe(bytes);
    expect(Array.from(bytes).some((value) => value !== 0)).toBe(true);
  });

  it('creates a Uint8Array with requested size', () => {
    const bytes = randomBytes(24);
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes).toHaveLength(24);
    expect(Array.from(bytes).some((value) => value !== 0)).toBe(true);
  });
});
