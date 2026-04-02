/**
 * Audio Variety Tests
 *
 * Tests for pitch randomization on combat/gathering sounds and new event
 * SFX methods (enemyEvolution, veteranPromotion, advisorTip).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '@/audio/audio-system';

describe('AudioSystem – pitch randomization on combat/gathering sounds', () => {
  let sys: AudioSystem;
  let playAtSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    sys = new AudioSystem();
    await sys.init();
    (sys as any)._started = true;
    (sys as any)._muted = false;
    playAtSpy = vi.spyOn((sys as any).sfxMgr, 'playAt');
  });

  it('hit() applies pitch jitter so frequencies vary between calls', () => {
    const freqs: number[] = [];
    for (let i = 0; i < 20; i++) {
      playAtSpy.mockClear();
      sys.hit(100);
      if (playAtSpy.mock.calls.length > 0) {
        freqs.push(playAtSpy.mock.calls[0][0] as number);
      }
    }
    // With jitter, not all frequencies should be identical
    const unique = new Set(freqs.map((f) => Math.round(f * 100)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('chop() applies pitch jitter', () => {
    const freqs: number[] = [];
    for (let i = 0; i < 20; i++) {
      playAtSpy.mockClear();
      sys.chop(100);
      if (playAtSpy.mock.calls.length > 0) {
        freqs.push(playAtSpy.mock.calls[0][0] as number);
      }
    }
    const unique = new Set(freqs.map((f) => Math.round(f * 100)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('shoot() frequencies stay within +-5% of base', () => {
    for (let i = 0; i < 50; i++) {
      playAtSpy.mockClear();
      sys.shoot(100);
      if (playAtSpy.mock.calls.length > 0) {
        const freq = playAtSpy.mock.calls[0][0] as number;
        expect(freq).toBeGreaterThanOrEqual(700 * 0.95);
        expect(freq).toBeLessThanOrEqual(700 * 1.05);
      }
    }
  });

  it('deathUnit() applies pitch jitter', () => {
    const freqs: number[] = [];
    for (let i = 0; i < 20; i++) {
      playAtSpy.mockClear();
      sys.deathUnit(100);
      if (playAtSpy.mock.calls.length > 0) {
        freqs.push(playAtSpy.mock.calls[0][0] as number);
      }
    }
    const unique = new Set(freqs.map((f) => Math.round(f * 100)));
    expect(unique.size).toBeGreaterThan(1);
  });

  it('mine() frequencies stay within +-8% of base', () => {
    for (let i = 0; i < 50; i++) {
      playAtSpy.mockClear();
      sys.mine(100);
      if (playAtSpy.mock.calls.length > 0) {
        const freq = playAtSpy.mock.calls[0][0] as number;
        expect(freq).toBeGreaterThanOrEqual(400 * 0.92);
        expect(freq).toBeLessThanOrEqual(400 * 1.08);
      }
    }
  });
});

describe('AudioSystem – new event SFX methods', () => {
  let sys: AudioSystem;

  beforeEach(async () => {
    sys = new AudioSystem();
    await sys.init();
    (sys as any)._started = true;
    (sys as any)._muted = false;
  });

  it('enemyEvolution() calls playAt with low-frequency rumble', () => {
    const playAtSpy = vi.spyOn((sys as any).sfxMgr, 'playAt');
    sys.enemyEvolution();
    expect(playAtSpy).toHaveBeenCalled();
    // First note should be a low rumble (60 Hz base)
    expect(playAtSpy.mock.calls[0][0]).toBe(60);
  });

  it('veteranPromotion() calls playAt with ascending frequencies', () => {
    vi.useFakeTimers();
    const playAtSpy = vi.spyOn((sys as any).sfxMgr, 'playAt');
    sys.veteranPromotion(500);
    vi.advanceTimersByTime(200);
    // Should have 3 ascending notes: 440, 660, 880
    const freqs = playAtSpy.mock.calls.map((c) => c[0]);
    expect(freqs).toEqual([440, 660, 880]);
    vi.useRealTimers();
  });

  it('advisorTip() calls playAt with chime frequencies', () => {
    vi.useFakeTimers();
    const playAtSpy = vi.spyOn((sys as any).sfxMgr, 'playAt');
    sys.advisorTip();
    vi.advanceTimersByTime(100);
    const freqs = playAtSpy.mock.calls.map((c) => c[0]);
    expect(freqs).toEqual([720, 960]);
    vi.useRealTimers();
  });

  it('enemyEvolution() does not throw when muted', () => {
    sys.toggleMute();
    expect(() => sys.enemyEvolution()).not.toThrow();
  });

  it('veteranPromotion() does not throw when muted', () => {
    sys.toggleMute();
    expect(() => sys.veteranPromotion()).not.toThrow();
  });

  it('advisorTip() does not throw when muted', () => {
    sys.toggleMute();
    expect(() => sys.advisorTip()).not.toThrow();
  });
});
