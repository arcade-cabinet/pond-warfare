/** Ambient module - Ambient sounds (pond bubbles, cricket chirps, wind gusts, scheduling). */
import * as Tone from 'tone';
import type { SfxManager } from './sfx';

export class AmbientManager {
  private ambientNoise: Tone.Noise | null = null;
  private ambientFilter: Tone.Filter | null = null;
  private ambientTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastDarkness = 0;

  /** These are set by AudioSystem. */
  private _getStarted: () => boolean;
  private _getMuted: () => boolean;
  private sfx: SfxManager;

  constructor(
    getStarted: () => boolean,
    getMuted: () => boolean,
    sfx: SfxManager,
  ) {
    this._getStarted = getStarted;
    this._getMuted = getMuted;
    this.sfx = sfx;
  }

  /** Start ambient background noise (brown noise through a bandpass filter). */
  startAmbient(): void {
    if (this.ambientNoise || !this._getStarted()) return;
    try {
      this.ambientFilter = new Tone.Filter({ frequency: 400, type: 'bandpass' }).toDestination();
      this.ambientNoise = new Tone.Noise({
        type: 'brown',
        volume: -30,
      }).connect(this.ambientFilter);
      if (!this._getMuted()) {
        this.ambientNoise.start();
      }
    } catch {
      /* ignore ambient start errors */
    }
  }

  /**
   * Shift ambient filter frequency for day/night cycle and trigger periodic ambient sounds.
   * darkness 0..1 (0 = full day, 1 = full night)
   */
  updateAmbient(darkness: number): void {
    if (!this.ambientFilter) return;
    // Day: higher frequency (brighter), Night: lower (darker drone)
    const freq = 200 + (1 - darkness) * 400;
    this.ambientFilter.frequency.rampTo(freq, 2);

    this.lastDarkness = darkness;

    // Schedule periodic ambient sound effects if not already running
    if (!this.ambientTimerId && this._getStarted()) {
      this.scheduleNextAmbientSound();
    }
  }

  /** Handle mute toggle for ambient noise. */
  onMuteToggle(muted: boolean): void {
    if (this.ambientNoise) {
      if (muted) {
        this.ambientNoise.stop();
      } else {
        this.ambientNoise.start();
      }
    }
  }

  /** Schedule the next ambient sound effect (bubbling, chirps, or wind). */
  private scheduleNextAmbientSound(): void {
    // Random interval between 3-8 seconds
    const delay = 3000 + Math.random() * 5000;
    this.ambientTimerId = setTimeout(() => {
      this.ambientTimerId = null;
      if (!this._getStarted() || this._getMuted()) {
        // Reschedule even when muted so it resumes naturally
        this.scheduleNextAmbientSound();
        return;
      }

      try {
        if (this.lastDarkness > 0.5) {
          // Night: cricket chirps -- quick high-pitched blips
          this.playCricketChirp();
        } else {
          // Day: subtle wind gust
          this.playWindGust();
        }
        // Always play pond bubbling regardless of time
        this.playPondBubble();
      } catch {
        /* ignore ambient sound errors */
      }

      this.scheduleNextAmbientSound();
    }, delay);
  }

  /** Short filtered noise burst simulating pond bubbling. */
  private playPondBubble(): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      const filter = new Tone.Filter({ frequency: 600, type: 'bandpass', Q: 2 }).toDestination();
      const gain = new Tone.Gain(0.04).connect(filter);
      const noise = new Tone.Noise({ type: 'pink' }).connect(gain);
      noise.start();
      // Ramp frequency up for bubble effect
      filter.frequency.rampTo(1200, 0.15);
      setTimeout(() => {
        noise.stop();
        setTimeout(() => {
          noise.dispose();
          gain.dispose();
          filter.dispose();
        }, 100);
      }, 150);
    } catch {
      /* ignore */
    }
  }

  /** Quick high-pitched chirp sounds for nighttime crickets. */
  private playCricketChirp(): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      // 2-3 rapid chirps
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (!this._getStarted() || this._getMuted()) return;
          const freq = 3000 + Math.random() * 2000;
          this.sfx.playAt(freq, 'sine', 0.04, 0.03, freq + 500);
        }, i * 60);
      }
    } catch {
      /* ignore */
    }
  }

  /** Subtle wind gust using filtered noise. */
  private playWindGust(): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      const filter = new Tone.Filter({
        frequency: 300 + Math.random() * 200,
        type: 'lowpass',
      }).toDestination();
      const gain = new Tone.Gain(0.02).connect(filter);
      const noise = new Tone.Noise({ type: 'white' }).connect(gain);
      noise.start();
      // Swell and fade
      gain.gain.rampTo(0.04, 0.4);
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

  /** Stop periodic ambient sound scheduling and dispose resources. */
  shutdown(): void {
    if (this.ambientTimerId !== null) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
    if (this.ambientNoise) {
      this.ambientNoise.dispose();
      this.ambientNoise = null;
    }
    if (this.ambientFilter) {
      this.ambientFilter.dispose();
      this.ambientFilter = null;
    }
  }
}
