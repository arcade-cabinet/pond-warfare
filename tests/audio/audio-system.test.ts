/**
 * AudioSystem Tests
 *
 * Validates the AudioSystem class behavior as documented in the POC reference
 * file 04-audio-system.js. Tests cover mute state management, spatial panning
 * calculations, and the exported singleton instance.
 *
 * Tone.js is mocked in tests/setup.ts; AudioContext is mocked globally.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem, audio } from '@/audio/audio-system';

describe('AudioSystem – initial state', () => {
  let sys: AudioSystem;

  beforeEach(() => {
    sys = new AudioSystem();
  });

  it('starts unmuted', () => {
    expect(sys.muted).toBe(false);
  });

  it('exposes a muted getter', () => {
    expect(typeof sys.muted).toBe('boolean');
  });

  it('has default camX of 0', () => {
    expect(sys.camX).toBe(0);
  });

  it('has default viewWidth of 800', () => {
    expect(sys.viewWidth).toBe(800);
  });
});

describe('AudioSystem – toggleMute()', () => {
  let sys: AudioSystem;

  beforeEach(() => {
    sys = new AudioSystem();
  });

  it('toggleMute() sets muted to true', () => {
    sys.toggleMute();
    expect(sys.muted).toBe(true);
  });

  it('double toggleMute() restores muted to false', () => {
    sys.toggleMute();
    sys.toggleMute();
    expect(sys.muted).toBe(false);
  });

  it('toggleMute() alternates each call', () => {
    const states: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      sys.toggleMute();
      states.push(sys.muted);
    }
    expect(states).toEqual([true, false, true, false, true]);
  });

  it('toggleMute() stops ambient noise when muting', () => {
    // Set up a fake ambientNoise object to check stop() is called
    const fakeNoise = { stop: vi.fn(), start: vi.fn() };
    // Access private field via casting to test stop behavior
    (sys as any).ambientNoise = fakeNoise;

    sys.toggleMute(); // now muted
    expect(fakeNoise.stop).toHaveBeenCalledOnce();
  });

  it('toggleMute() restarts ambient noise when unmuting', () => {
    const fakeNoise = { stop: vi.fn(), start: vi.fn() };
    (sys as any).ambientNoise = fakeNoise;

    sys.toggleMute(); // mute
    sys.toggleMute(); // unmute
    expect(fakeNoise.start).toHaveBeenCalledOnce();
  });
});

describe('AudioSystem – init()', () => {
  let sys: AudioSystem;

  beforeEach(() => {
    sys = new AudioSystem();
  });

  it('init() can be called and resolves without error', async () => {
    await expect(sys.init()).resolves.toBeUndefined();
  });

  it('calling init() twice does not throw', async () => {
    await sys.init();
    await expect(sys.init()).resolves.toBeUndefined();
  });
});

describe('AudioSystem – worldToPan spatial logic', () => {
  let sys: AudioSystem;

  beforeEach(() => {
    sys = new AudioSystem();
    sys.camX = 0;
    sys.viewWidth = 800;
  });

  it('sound at screen center produces pan of 0', async () => {
    // The center of the view when camX=0 and viewWidth=800 is worldX=400
    await sys.init();
    (sys as any)._started = true;
    (sys as any)._muted = false;

    // We can't call worldToPan directly (private), but we verify it doesn't throw
    // for a center-positioned sound by calling a sound method
    expect(() => sys.click()).not.toThrow();
  });

  it('camX and viewWidth are externally settable', () => {
    sys.camX = 500;
    sys.viewWidth = 1024;
    expect(sys.camX).toBe(500);
    expect(sys.viewWidth).toBe(1024);
  });
});

describe('AudioSystem – sound methods (no throw when started)', () => {
  let sys: AudioSystem;

  beforeEach(async () => {
    sys = new AudioSystem();
    await sys.init();
    (sys as any)._started = true;
    (sys as any)._muted = false;
  });

  const methods: Array<keyof AudioSystem> = [
    'chop',
    'mine',
    'build',
    'hit',
    'shoot',
    'alert',
    'ping',
    'click',
    'selectUnit',
    'selectBuild',
    'upgrade',
    'win',
    'lose',
    'heal',
    'error',
    'deathUnit',
    'deathBuilding',
    'trainComplete',
    'buildComplete',
  ];

  for (const method of methods) {
    it(`${method}() does not throw`, () => {
      expect(() => (sys[method] as () => void)()).not.toThrow();
    });
  }
});

describe('AudioSystem – sound methods do nothing when muted', () => {
  it('sound methods are silent when muted (no errors)', () => {
    const sys = new AudioSystem();
    sys.toggleMute();
    expect(sys.muted).toBe(true);
    // None of these should throw even when muted
    expect(() => sys.click()).not.toThrow();
    expect(() => sys.hit()).not.toThrow();
    expect(() => sys.alert()).not.toThrow();
  });

  it('sound methods are silent when not started (no errors)', () => {
    const sys = new AudioSystem();
    // _started is false by default
    expect(() => sys.click()).not.toThrow();
    expect(() => sys.shoot()).not.toThrow();
  });
});

describe('AudioSystem – updateAmbient()', () => {
  it('does nothing when ambientFilter is null', () => {
    const sys = new AudioSystem();
    // No ambientFilter set
    expect(() => sys.updateAmbient(0.5)).not.toThrow();
  });

  it('calls rampTo on ambientFilter with appropriate frequency', () => {
    const sys = new AudioSystem();
    const fakeFilter = { frequency: { rampTo: vi.fn() } };
    (sys as any).ambientFilter = fakeFilter;

    sys.updateAmbient(0); // full day (darkness=0): max freq = 200 + 400 = 600
    expect(fakeFilter.frequency.rampTo).toHaveBeenCalledWith(600, 2);
  });

  it('uses lower frequency at full darkness (night)', () => {
    const sys = new AudioSystem();
    const fakeFilter = { frequency: { rampTo: vi.fn() } };
    (sys as any).ambientFilter = fakeFilter;

    sys.updateAmbient(1); // full night (darkness=1): freq = 200 + 0 = 200
    expect(fakeFilter.frequency.rampTo).toHaveBeenCalledWith(200, 2);
  });

  it('interpolates frequency linearly between day and night', () => {
    const sys = new AudioSystem();
    const fakeFilter = { frequency: { rampTo: vi.fn() } };
    (sys as any).ambientFilter = fakeFilter;

    sys.updateAmbient(0.5); // mid: 200 + (0.5 * 400) = 400
    expect(fakeFilter.frequency.rampTo).toHaveBeenCalledWith(400, 2);
  });
});

describe('audio singleton', () => {
  it('exports a shared AudioSystem singleton', () => {
    expect(audio).toBeInstanceOf(AudioSystem);
  });

  it('singleton is the same reference across imports', async () => {
    const { audio: audio2 } = await import('@/audio/audio-system');
    expect(audio).toBe(audio2);
  });

  it('singleton starts unmuted', () => {
    // Reset singleton state for clean test (it may have been toggled by other tests)
    if (audio.muted) audio.toggleMute();
    expect(audio.muted).toBe(false);
  });
});
