/**
 * Vitest Setup
 *
 * Provides canvas and DOM mocking for the jsdom test environment.
 * bitECS and game systems work with pure data arrays, so most tests
 * don't need full DOM—but rendering tests and UI tests do.
 */

// Mock HTMLCanvasElement.getContext for environments that don't support it
const mockContext2D = {
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

// Patch HTMLCanvasElement if getContext doesn't work in jsdom
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type: string, ...args: any[]) {
  if (type === '2d') {
    const result = originalGetContext.call(this, type, ...args);
    if (result) return result;
    return mockContext2D as any;
  }
  return originalGetContext.call(this, type, ...args);
};

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

(globalThis as any).AudioContext = MockAudioContext;
(globalThis as any).webkitAudioContext = MockAudioContext;
