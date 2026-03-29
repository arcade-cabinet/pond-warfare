/**
 * Animation Manager Tests
 *
 * Validates that entityScales map, triggerCommandPulse, and
 * cleanupEntityAnimation work correctly.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupEntityAnimation, entityScales, triggerCommandPulse } from '@/rendering/animations';

describe('entityScales', () => {
  afterEach(() => {
    // Clean up any lingering animation state
    for (const eid of entityScales.keys()) {
      cleanupEntityAnimation(eid);
    }
  });

  it('should be an empty map initially', () => {
    expect(entityScales.size).toBe(0);
  });

  it('should support set/get/delete operations', () => {
    entityScales.set(99, { scaleX: 1.5, scaleY: 0.8 });
    expect(entityScales.get(99)).toEqual({ scaleX: 1.5, scaleY: 0.8 });
    entityScales.delete(99);
    expect(entityScales.has(99)).toBe(false);
  });
});

describe('triggerCommandPulse', () => {
  afterEach(() => {
    for (const eid of entityScales.keys()) {
      cleanupEntityAnimation(eid);
    }
  });

  it('should add an entry to entityScales', () => {
    triggerCommandPulse(42);
    expect(entityScales.has(42)).toBe(true);
    const scale = entityScales.get(42);
    expect(scale).toBeDefined();
    expect(typeof scale?.scaleX).toBe('number');
    expect(typeof scale?.scaleY).toBe('number');
  });

  it('should handle multiple entities independently', () => {
    triggerCommandPulse(1);
    triggerCommandPulse(2);
    expect(entityScales.has(1)).toBe(true);
    expect(entityScales.has(2)).toBe(true);
  });

  it('should overwrite existing animation for the same entity', () => {
    triggerCommandPulse(10);
    const first = entityScales.get(10);
    triggerCommandPulse(10);
    const second = entityScales.get(10);
    // Both should exist (second overwrites first animation)
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });
});

describe('cleanupEntityAnimation', () => {
  it('should remove an entry from entityScales', () => {
    triggerCommandPulse(77);
    expect(entityScales.has(77)).toBe(true);
    cleanupEntityAnimation(77);
    expect(entityScales.has(77)).toBe(false);
  });

  it('should be safe to call for non-existent entity', () => {
    expect(() => cleanupEntityAnimation(999)).not.toThrow();
  });

  it('should clean up after multiple pulses on same entity', () => {
    triggerCommandPulse(50);
    triggerCommandPulse(50);
    cleanupEntityAnimation(50);
    expect(entityScales.has(50)).toBe(false);
  });
});
