/** Ambient module - Pond bed, weather texture, and scheduled nature sounds. */
import * as Tone from 'tone';
import type { SfxManager } from './sfx';

export class AmbientManager {
  private ambientNoise: Tone.Noise | null = null;
  private ambientFilter: Tone.Filter | null = null;
  private shimmerNoise: Tone.Noise | null = null;
  private shimmerFilter: Tone.Filter | null = null;
  private shimmerGain: Tone.Gain | null = null;
  private ambientTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastDarkness = 0;

  private _getStarted: () => boolean;
  private _getMuted: () => boolean;
  private sfx: SfxManager;

  constructor(getStarted: () => boolean, getMuted: () => boolean, sfx: SfxManager) {
    this._getStarted = getStarted;
    this._getMuted = getMuted;
    this.sfx = sfx;
  }

  /** Start layered ambient beds for pond water and wind through reeds. */
  startAmbient(): void {
    if (this.ambientNoise || !this._getStarted()) return;
    try {
      this.ambientFilter = new Tone.Filter({ frequency: 400, type: 'bandpass' }).toDestination();
      this.ambientNoise = new Tone.Noise({ type: 'brown', volume: -30 }).connect(
        this.ambientFilter,
      );

      this.shimmerGain = new Tone.Gain(0.01).toDestination();
      this.shimmerFilter = new Tone.Filter({ frequency: 1200, type: 'highpass' }).connect(
        this.shimmerGain,
      );
      this.shimmerNoise = new Tone.Noise({ type: 'pink', volume: -40 }).connect(this.shimmerFilter);

      this.setAmbientBedRunning(!this._getMuted());
    } catch {
      /* ignore ambient start errors */
    }
  }

  /**
   * Shift ambient filters for day/night cycle and trigger periodic nature sounds.
   * darkness 0..1 (0 = full day, 1 = full night)
   */
  updateAmbient(darkness: number): void {
    if (!this.ambientFilter) return;
    this.ambientFilter.frequency.rampTo(200 + (1 - darkness) * 400, 2);
    this.shimmerFilter?.frequency.rampTo(900 + (1 - darkness) * 900, 2);
    this.shimmerGain?.gain.rampTo(0.008 + (1 - darkness) * 0.012, 2);
    this.lastDarkness = darkness;

    if (!this.ambientTimerId && this._getStarted()) {
      this.scheduleNextAmbientSound();
    }
  }

  /** Handle mute toggle for the continuous ambient bed. */
  onMuteToggle(muted: boolean): void {
    this.setAmbientBedRunning(!muted);
  }

  /** Schedule the next ambient event with day/night-specific color. */
  private scheduleNextAmbientSound(): void {
    const delay = 2500 + Math.random() * 4500;
    this.ambientTimerId = setTimeout(() => {
      this.ambientTimerId = null;
      if (!this._getStarted() || this._getMuted()) {
        this.scheduleNextAmbientSound();
        return;
      }

      try {
        if (this.lastDarkness > 0.65) {
          this.playCricketChirp();
          if (Math.random() > 0.35) this.playFrogCroak();
        } else {
          this.playWindGust();
          if (Math.random() > 0.4) this.playReedRustle();
        }
        this.playPondBubble();
        if (Math.random() > 0.45) this.playWaterRipple();
      } catch {
        /* ignore ambient sound errors */
      }

      this.scheduleNextAmbientSound();
    }, delay);
  }

  private setAmbientBedRunning(shouldRun: boolean): void {
    for (const noise of [this.ambientNoise, this.shimmerNoise]) {
      if (!noise) continue;
      if (shouldRun) {
        noise.start();
      } else {
        noise.stop();
      }
    }
  }

  private randomWorldX(span = 0.8): number {
    const center = this.sfx.camX + this.sfx.viewWidth / 2;
    const offset = (Math.random() * 2 - 1) * this.sfx.viewWidth * span * 0.5;
    return center + offset;
  }

  /** Short filtered noise burst simulating pond bubbling and small droplets. */
  private playPondBubble(): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      const filter = new Tone.Filter({ frequency: 520, type: 'bandpass', Q: 2 }).toDestination();
      const gain = new Tone.Gain(0.035).connect(filter);
      const noise = new Tone.Noise({ type: 'pink' }).connect(gain);
      noise.start();
      filter.frequency.rampTo(1100, 0.18);
      this.sfx.playAt(220 + Math.random() * 60, 'sine', 0.08, 0.025, 320, this.randomWorldX(0.5));
      setTimeout(() => {
        noise.stop();
        setTimeout(() => {
          noise.dispose();
          gain.dispose();
          filter.dispose();
        }, 100);
      }, 180);
    } catch {
      /* ignore */
    }
  }

  /** Quick clustered chirps for nighttime crickets. */
  private playCricketChirp(): void {
    if (!this._getStarted() || this._getMuted()) return;
    const worldX = this.randomWorldX();
    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (!this._getStarted() || this._getMuted()) return;
        const freq = 2800 + Math.random() * 1700;
        this.sfx.playAt(freq, 'sine', 0.03, 0.035, freq + 500, worldX);
      }, i * 65);
    }
  }

  /** Low croak sweep to make night ambience feel alive. */
  private playFrogCroak(): void {
    if (!this._getStarted() || this._getMuted()) return;
    const worldX = this.randomWorldX(0.9);
    this.sfx.playAt(140 + Math.random() * 40, 'triangle', 0.22, 0.05, 90, worldX);
    setTimeout(() => {
      if (!this._getStarted() || this._getMuted()) return;
      this.sfx.playAt(95, 'triangle', 0.18, 0.035, 70, worldX);
    }, 120);
  }

  /** Gentle paired plucks that read as ripples and fish splashes. */
  private playWaterRipple(): void {
    if (!this._getStarted() || this._getMuted()) return;
    const worldX = this.randomWorldX(0.7);
    this.sfx.playAt(480, 'triangle', 0.08, 0.025, 620, worldX);
    setTimeout(() => {
      if (!this._getStarted() || this._getMuted()) return;
      this.sfx.playAt(640, 'sine', 0.07, 0.02, 760, worldX);
    }, 110);
  }

  /** Rustling reeds with a soft tonal scrape. */
  private playReedRustle(): void {
    if (!this._getStarted() || this._getMuted()) return;
    const worldX = this.randomWorldX();
    this.sfx.playAt(340, 'sawtooth', 0.14, 0.02, 180, worldX);
    setTimeout(() => {
      if (!this._getStarted() || this._getMuted()) return;
      this.sfx.playAt(220, 'triangle', 0.1, 0.018, 140, worldX);
    }, 90);
  }

  /** Subtle wind gust using filtered noise plus a soft moving tone. */
  private playWindGust(): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      const filter = new Tone.Filter({
        frequency: 280 + Math.random() * 220,
        type: 'lowpass',
      }).toDestination();
      const gain = new Tone.Gain(0.02).connect(filter);
      const noise = new Tone.Noise({ type: 'white' }).connect(gain);
      const worldX = this.randomWorldX();
      noise.start();
      gain.gain.rampTo(0.04, 0.4);
      this.sfx.playAt(260, 'triangle', 0.24, 0.02, 180, worldX);
      setTimeout(() => {
        gain.gain.rampTo(0, 0.5);
        setTimeout(() => {
          noise.stop();
          setTimeout(() => {
            noise.dispose();
            gain.dispose();
            filter.dispose();
          }, 100);
        }, 500);
      }, 400);
    } catch {
      /* ignore */
    }
  }

  /** Stop periodic ambient scheduling and dispose resources. */
  shutdown(): void {
    if (this.ambientTimerId !== null) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    for (const noise of [this.ambientNoise, this.shimmerNoise]) {
      noise?.dispose();
    }
    this.ambientNoise = null;
    this.shimmerNoise = null;
    for (const node of [this.ambientFilter, this.shimmerFilter, this.shimmerGain]) {
      node?.dispose();
    }
    this.ambientFilter = null;
    this.shimmerFilter = null;
    this.shimmerGain = null;
  }
}
