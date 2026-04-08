/**
 * Vitest Setup
 *
 * Provides canvas and DOM mocking for the jsdom test environment.
 * bitECS and game systems work with pure data arrays, so most tests
 * don't need full DOM—but rendering tests and UI tests do.
 */

import { vi } from 'vitest';

// Mock Tone.js – it relies on standardized-audio-context which cannot run in jsdom
function MockToneNode(this: any) {
  this.connect = vi.fn().mockReturnValue(this);
  this.toDestination = vi.fn().mockReturnValue(this);
  this.dispose = vi.fn();
  this.start = vi.fn();
  this.stop = vi.fn();
  this.triggerAttackRelease = vi.fn();
  this.triggerAttack = vi.fn();
  this.triggerRelease = vi.fn();
  this.frequency = { rampTo: vi.fn(), value: 0, exponentialRampTo: vi.fn() };
  this.gain = { value: 0, rampTo: vi.fn() };
  this.volume = { value: 0, rampTo: vi.fn() };
  this.oscillator = { type: 'sine', frequency: { exponentialRampTo: vi.fn() } };
  this.pan = { value: 0 };
}
vi.mock('tone', () => ({
  start: vi.fn().mockResolvedValue(undefined),
  getContext: vi.fn().mockReturnValue({ state: 'running' }),
  getTransport: vi
    .fn()
    .mockReturnValue({ bpm: { value: 60, rampTo: vi.fn() }, start: vi.fn(), stop: vi.fn() }),
  gainToDb: (v: number) => 20 * Math.log10(Math.max(v, 1e-6)),
  Synth: MockToneNode,
  PolySynth: MockToneNode,
  MembraneSynth: MockToneNode,
  MetalSynth: MockToneNode,
  Gain: MockToneNode,
  Panner: MockToneNode,
  Noise: MockToneNode,
  Filter: MockToneNode,
  AutoFilter: MockToneNode,
  Reverb: MockToneNode,
  Limiter: MockToneNode,
  Channel: MockToneNode,
  Sequence: vi.fn(function MockSequence(this: any) {
    this.start = vi.fn();
    this.stop = vi.fn();
    this.dispose = vi.fn();
    this.loop = false;
    return this;
  }),
}));

// Mock HTMLCanvasElement.getContext for environments that don't support it
// Use a factory to create fresh context instances for each call to avoid state leakage
function makeMockContext2D() {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '',
    textAlign: 'start',
    imageSmoothingEnabled: true,
    fillRect: () => {},
    strokeRect: () => {},
    clearRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => {},
    ellipse: () => {},
    fill: () => {},
    stroke: () => {},
    fillText: () => {},
    strokeText: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    scale: () => {},
    setLineDash: () => {},
    createRadialGradient: () => ({
      addColorStop: () => {},
    }),
    createPattern: () => ({}),
    getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: () => {},
    measureText: () => ({ width: 0 }),
    setTransform: () => {},
    resetTransform: () => {},
    createLinearGradient: () => ({
      addColorStop: () => {},
    }),
  };
}

// ── DOM Mocks (JSDOM only) ──────────────────────────────────────────
// Guard: only patch DOM globals when they exist (JSDOM environment).
if (typeof HTMLCanvasElement !== 'undefined') {
  // biome-ignore lint/complexity/noBannedTypes: need generic function type for canvas mock
  const originalGetContext = HTMLCanvasElement.prototype.getContext as Function;
  const isJsdom =
    typeof navigator !== 'undefined' && /\bjsdom\b/i.test(navigator.userAgent ?? '');
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    options?: any,
  ) {
    if (type === '2d') {
      if (isJsdom) {
        return makeMockContext2D() as any;
      }
      try {
        const result = originalGetContext.call(this, type, options);
        if (result) return result;
      } catch {
        // jsdom throws "Not implemented" – fall through to mock
      }
      return makeMockContext2D() as any;
    }
    try {
      return originalGetContext.call(this, type, options) as any;
    } catch {
      return null;
    }
  } as any;
}

// Mock requestAnimationFrame if not available
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  };
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  destination = {};
  createOscillator() {
    return {
      type: 'sine',
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    };
  }
}

// ── AudioContext (Node polyfill) ────────────────────────────────────
if (typeof (globalThis as any).AudioContext === 'undefined') {
  (globalThis as any).AudioContext = MockAudioContext;
  (globalThis as any).webkitAudioContext = MockAudioContext;
}

// ── localStorage (Node polyfill) ────────────────────────────────────
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  };
}
