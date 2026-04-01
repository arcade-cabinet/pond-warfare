/** Ambient module - Pond bed, weather texture, and scheduled nature sounds. */
import * as Tone from 'tone';
import { mapScenario } from '@/ui/store';
import { AmbientAccentPlayer } from './ambient-accents';
import { BIOME_AUDIO_PROFILES, type BiomeAccent } from './ambient-biomes';
import {
  type AmbientSoundCtx,
  playCricketChirp,
  playFrogCroak,
  playPondBubble,
  playReedRustle,
  playWaterRipple,
  playWindGust,
} from './ambient-sounds';
import type { SfxManager } from './sfx';

export class AmbientManager {
  private ambientNoise: Tone.Noise | null = null;
  private ambientFilter: Tone.Filter | null = null;
  private shimmerNoise: Tone.Noise | null = null;
  private shimmerFilter: Tone.Filter | null = null;
  private shimmerGain: Tone.Gain | null = null;
  private ambientTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastDarkness = 0;
  private accentPlayer: AmbientAccentPlayer;

  private _getStarted: () => boolean;
  private _getMuted: () => boolean;
  private sfx: SfxManager;

  constructor(getStarted: () => boolean, getMuted: () => boolean, sfx: SfxManager) {
    this._getStarted = getStarted;
    this._getMuted = getMuted;
    this.sfx = sfx;
    this.accentPlayer = new AmbientAccentPlayer(
      () => this._getStarted(),
      () => this._getMuted(),
      this.sfx,
      (span) => this.randomWorldX(span),
    );
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
      // Clean up any partially created nodes so we can safely retry later.
      if (this.ambientNoise) {
        this.ambientNoise.dispose();
        this.ambientNoise = null;
      }
      if (this.ambientFilter) {
        this.ambientFilter.dispose();
        this.ambientFilter = null;
      }
      if (this.shimmerNoise) {
        this.shimmerNoise.dispose();
        this.shimmerNoise = null;
      }
      if (this.shimmerFilter) {
        this.shimmerFilter.dispose();
        this.shimmerFilter = null;
      }
      if (this.shimmerGain) {
        this.shimmerGain.dispose();
        this.shimmerGain = null;
      }
      if (this.ambientTimerId) {
        clearTimeout(this.ambientTimerId);
        this.ambientTimerId = null;
      }
    }
  }

  /**
   * Shift ambient filters for day/night cycle and trigger periodic nature sounds.
   * darkness 0..1 (0 = full day, 1 = full night)
   */
  updateAmbient(darkness: number): void {
    if (!this.ambientFilter) return;
    const profile = BIOME_AUDIO_PROFILES[mapScenario.value];
    this.ambientFilter.frequency.rampTo(profile.baseFrequency + (1 - darkness) * 220, 2);
    this.shimmerFilter?.frequency.rampTo(profile.shimmerFrequency + (1 - darkness) * 420, 2);
    this.shimmerGain?.gain.rampTo(0.008 + (1 - darkness) * 0.012, 2);
    this.lastDarkness = darkness;

    if (!this.ambientTimerId && this._getStarted()) {
      this.scheduleNextAmbientSound();
    }
  }

  /** Handle mute toggle for the continuous ambient bed and active one-shots. */
  onMuteToggle(muted: boolean): void {
    this.setAmbientBedRunning(!muted);
    if (muted) {
      this.accentPlayer.stopAll();
    }
  }

  /** Schedule the next ambient event with day/night-specific color. */
  private scheduleNextAmbientSound(): void {
    const profile = BIOME_AUDIO_PROFILES[mapScenario.value];
    const delay = profile.eventMinMs + Math.random() * (profile.eventMaxMs - profile.eventMinMs);
    this.ambientTimerId = setTimeout(() => {
      this.ambientTimerId = null;
      if (!this._getStarted() || this._getMuted()) {
        this.scheduleNextAmbientSound();
        return;
      }

      try {
        this.playPondBubble();
        if (mapScenario.value === 'standard') {
          if (this.lastDarkness > 0.65) {
            this.playCricketChirp();
            if (Math.random() > 0.35) this.playFrogCroak();
          } else {
            this.playWindGust();
            if (Math.random() > 0.4) this.playReedRustle();
          }
          if (Math.random() > 0.45) this.playWaterRipple();
        } else {
          const accents = this.lastDarkness > 0.65 ? profile.nightAccents : profile.dayAccents;
          this.playBiomeAccent(accents[Math.floor(Math.random() * accents.length)]);
          if (Math.random() > 0.45 && !accents.includes('ripple')) this.playWaterRipple();
        }
      } catch {
        /* ignore ambient sound errors */
      }

      this.scheduleNextAmbientSound();
    }, delay);
  }

  // Thin forwarding methods — delegate to module functions in ambient-sounds.ts.
  // Kept as instance methods so tests can spy on them.
  playPondBubble(): void {
    playPondBubble(this.soundCtx);
  }
  playCricketChirp(): void {
    playCricketChirp(this.soundCtx);
  }
  playFrogCroak(): void {
    playFrogCroak(this.soundCtx);
  }
  playWaterRipple(): void {
    playWaterRipple(this.soundCtx);
  }
  playReedRustle(): void {
    playReedRustle(this.soundCtx);
  }
  playWindGust(): void {
    playWindGust(this.soundCtx);
  }

  private playBiomeAccent(accent: BiomeAccent): void {
    switch (accent) {
      case 'cricket':
        this.playCricketChirp();
        break;
      case 'frog':
        this.playFrogCroak();
        break;
      case 'ripple':
        this.playWaterRipple();
        break;
      case 'wind':
        this.playWindGust();
        break;
      case 'reed':
        this.playReedRustle();
        break;
      case 'wave':
        this.accentPlayer.playWaveWash();
        break;
      case 'gull':
        this.accentPlayer.playSeaGull();
        break;
      case 'drum':
        this.accentPlayer.playWarDrum();
        break;
      case 'drip':
        this.accentPlayer.playCavernDrip();
        break;
      case 'current':
        this.accentPlayer.playCurrentRush();
        break;
      case 'stone':
        this.accentPlayer.playStoneTap();
        break;
    }
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

  private get soundCtx(): AmbientSoundCtx {
    return {
      getStarted: this._getStarted,
      getMuted: this._getMuted,
      sfx: this.sfx,
      randomWorldX: (span) => this.randomWorldX(span),
    };
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
