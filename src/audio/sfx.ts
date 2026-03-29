/** SFX module - All sound effect methods and synth pool management. */
import * as Tone from 'tone';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export interface SynthPannerPair {
  synth: Tone.Synth;
  panner: Tone.Panner;
  available: boolean;
}

export class SfxManager {
  /** Reusable pool of synth+panner pairs to avoid per-call allocation/disposal. */
  private synthPool: SynthPannerPair[] = [];
  private readonly POOL_SIZE = 16;

  /** Camera state for spatial panning -- updated externally each frame. */
  camX = 0;
  viewWidth = 800;

  /** These are set by AudioSystem and read by playAt. */
  private _getStarted: () => boolean;
  private _getMuted: () => boolean;
  private _getSfxGain: () => number;

  constructor(getStarted: () => boolean, getMuted: () => boolean, getSfxGain: () => number) {
    this._getStarted = getStarted;
    this._getMuted = getMuted;
    this._getSfxGain = getSfxGain;
  }

  /** Pre-allocate synth+panner pairs for reuse. */
  initSynthPool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const panner = new Tone.Panner(0).toDestination();
      const synth = new Tone.Synth().connect(panner);
      this.synthPool.push({ synth, panner, available: true });
    }
  }

  /** Get an available synth+panner pair from the pool, or reuse oldest if pool is exhausted. */
  private borrowSynthPair(): SynthPannerPair {
    // Find first available pair
    let pair = this.synthPool.find((p) => p.available);
    if (!pair) {
      // Pool exhausted; reuse first pair (evict oldest)
      pair = this.synthPool[0];
    }
    pair.available = false;
    return pair;
  }

  /** Mark a synth+panner pair as available for reuse. */
  private returnSynthPair(pair: SynthPannerPair): void {
    pair.available = true;
  }

  /** Dispose all pooled synths and panners on shutdown. */
  shutdown(): void {
    for (const pair of this.synthPool) {
      pair.synth.dispose();
      pair.panner.dispose();
    }
    this.synthPool = [];
  }

  /** Convert world X to stereo pan -1..1 relative to camera. */
  private worldToPan(worldX?: number): number {
    if (worldX === undefined) return 0;
    const center = this.camX + this.viewWidth / 2;
    const half = this.viewWidth / 2;
    return clamp((worldX - center) / half, -1, 1);
  }

  /**
   * Play a synthesized tone through Tone.Synth with optional panning and frequency slide.
   * Uses pooled synth+panner pairs to avoid per-call allocation/disposal.
   */
  playAt(
    freq: number,
    type: Tone.ToneOscillatorType,
    duration: number,
    vol = 0.1,
    slideFreq: number | null = null,
    worldX?: number,
  ): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      const pair = this.borrowSynthPair();
      const { synth, panner } = pair;

      // Configure panner position
      panner.pan.value = this.worldToPan(worldX);

      // Configure synth properties
      synth.oscillator.type = type as any;
      synth.envelope.attack = 0.001;
      synth.envelope.decay = duration * 0.8;
      synth.envelope.sustain = 0;
      synth.envelope.release = duration * 0.2;
      synth.volume.value = Tone.gainToDb(vol * this._getSfxGain());

      synth.triggerAttackRelease(freq, duration);

      if (slideFreq) {
        synth.oscillator.frequency.exponentialRampTo(slideFreq, duration);
      }

      // Return pair to pool after sound completes
      setTimeout(
        () => {
          this.returnSynthPair(pair);
        },
        (duration + 0.1) * 1000,
      );
    } catch {
      /* ignore audio errors */
    }
  }

  chop(worldX?: number): void {
    this.playAt(200, 'square', 0.1, 0.05, 100, worldX);
  }

  mine(worldX?: number): void {
    this.playAt(400, 'sine', 0.1, 0.05, 300, worldX);
  }

  build(worldX?: number): void {
    this.playAt(150, 'sawtooth', 0.15, 0.05, 50, worldX);
  }

  hit(worldX?: number): void {
    this.playAt(90, 'sawtooth', 0.2, 0.1, 40, worldX);
  }

  shoot(worldX?: number): void {
    this.playAt(700, 'triangle', 0.1, 0.05, 1200, worldX);
  }

  alert(): void {
    this.playAt(400, 'square', 0.8, 0.2, 300);
  }

  ping(): void {
    this.playAt(600, 'square', 0.1, 0.1, 800);
    setTimeout(() => {
      if (!this._getMuted() && this._getStarted()) {
        this.playAt(800, 'square', 0.1, 0.1, 1000);
      }
    }, 100);
  }

  click(): void {
    this.playAt(800, 'sine', 0.05, 0.05);
  }

  selectUnit(): void {
    this.playAt(600, 'sine', 0.1, 0.05, 800);
  }

  selectBuild(): void {
    this.playAt(200, 'triangle', 0.1, 0.05, 150);
  }

  upgrade(): void {
    this.playAt(300, 'square', 0.1, 0.1, 600);
    setTimeout(() => {
      if (!this._getMuted() && this._getStarted()) {
        this.playAt(400, 'square', 0.2, 0.1, 800);
      }
    }, 100);
  }

  win(): void {
    this.playAt(400, 'sine', 0.2, 0.1, 600);
    setTimeout(() => {
      if (!this._getMuted() && this._getStarted()) {
        this.playAt(600, 'sine', 0.4, 0.1, 800);
      }
    }, 200);
  }

  lose(): void {
    this.playAt(200, 'sawtooth', 0.4, 0.1, 100);
    setTimeout(() => {
      if (!this._getMuted() && this._getStarted()) {
        this.playAt(100, 'sawtooth', 0.6, 0.1, 50);
      }
    }, 400);
  }

  heal(worldX?: number): void {
    this.playAt(500, 'sine', 0.15, 0.04, 700, worldX);
  }

  error(): void {
    this.playAt(150, 'square', 0.15, 0.08, 80);
  }

  deathUnit(worldX?: number): void {
    this.playAt(120, 'sawtooth', 0.15, 0.08, 60, worldX);
  }

  deathBuilding(worldX?: number): void {
    this.playAt(80, 'sawtooth', 0.3, 0.15, 30, worldX);
    setTimeout(() => {
      if (!this._getMuted() && this._getStarted()) {
        this.playAt(50, 'square', 0.4, 0.1, 25, worldX);
      }
    }, 150);
  }

  trainComplete(): void {
    this.playAt(500, 'sine', 0.1, 0.06, 800);
  }

  buildComplete(): void {
    this.playAt(300, 'sine', 0.15, 0.08, 500);
    setTimeout(() => {
      if (!this._getMuted() && this._getStarted()) {
        this.playAt(400, 'sine', 0.15, 0.06, 600);
      }
    }, 100);
  }
}
