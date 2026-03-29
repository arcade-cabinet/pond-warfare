/** Synthesized audio system using Tone.js. All sounds are procedurally generated. */
import * as Tone from 'tone';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

interface SynthPannerPair {
  synth: Tone.Synth;
  panner: Tone.Panner;
  available: boolean;
}

/** Note frequencies for procedural music. */
const PEACEFUL_NOTES = ['C4', 'E4', 'G4', 'A4', 'E4', 'G4', 'C5', 'G4'];
const HUNTING_NOTES = ['C3', 'Eb3', 'G3', 'Bb3', 'C4', 'Bb3', 'G3', 'Eb3'];

/** Bass notes for chord progression. */
const PEACEFUL_BASS = ['C2', null, 'G2', null, 'A2', null, 'F2', null];
const HUNTING_BASS = ['C2', 'C2', 'Eb2', null, 'G2', 'G2', 'Bb2', null];

export class AudioSystem {
  private _muted = false;
  private _started = false;
  private ambientNoise: Tone.Noise | null = null;
  private ambientFilter: Tone.Filter | null = null;

  /** Reusable pool of synth+panner pairs to avoid per-call allocation/disposal. */
  private synthPool: SynthPannerPair[] = [];
  private readonly POOL_SIZE = 16;

  /** Background music state. */
  private musicSynth: Tone.Synth | null = null;
  private bassSynth: Tone.Synth | null = null;
  private musicGain: Tone.Gain | null = null;
  private bassGain: Tone.Gain | null = null;
  private melodySeq: Tone.Sequence | null = null;
  private bassSeq: Tone.Sequence | null = null;
  private musicPlaying = false;

  /** Ambient sound state. */
  private ambientTimerId: ReturnType<typeof setTimeout> | null = null;
  private lastDarkness = 0;

  /** Camera state for spatial panning – updated externally each frame. */
  camX = 0;
  viewWidth = 800;

  get muted(): boolean {
    return this._muted;
  }

  async init(): Promise<void> {
    if (this._started) return;
    await Tone.start();
    this._started = true;
    this.initSynthPool();
  }

  /** Pre-allocate synth+panner pairs for reuse. */
  private initSynthPool(): void {
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
    this.stopMusic();
    this.stopAmbientSounds();
    for (const pair of this.synthPool) {
      pair.synth.dispose();
      pair.panner.dispose();
    }
    this.synthPool = [];
    if (this.ambientNoise) {
      this.ambientNoise.dispose();
      this.ambientNoise = null;
    }
    if (this.ambientFilter) {
      this.ambientFilter.dispose();
      this.ambientFilter = null;
    }
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
  private playAt(
    freq: number,
    type: Tone.ToneOscillatorType,
    duration: number,
    vol = 0.1,
    slideFreq: number | null = null,
    worldX?: number,
  ): void {
    if (!this._started || this._muted) return;
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
      synth.volume.value = Tone.gainToDb(vol);

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

  toggleMute(): void {
    this._muted = !this._muted;
    if (this.ambientNoise) {
      if (this._muted) {
        this.ambientNoise.stop();
      } else {
        this.ambientNoise.start();
      }
    }
    // Mute/unmute background music gain nodes
    if (this.musicGain) {
      this.musicGain.gain.rampTo(this._muted ? 0 : 0.15, 0.1);
    }
    if (this.bassGain) {
      this.bassGain.gain.rampTo(this._muted ? 0 : 0.08, 0.1);
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
      if (!this._muted && this._started) {
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
      if (!this._muted && this._started) {
        this.playAt(400, 'square', 0.2, 0.1, 800);
      }
    }, 100);
  }

  win(): void {
    this.playAt(400, 'sine', 0.2, 0.1, 600);
    setTimeout(() => {
      if (!this._muted && this._started) {
        this.playAt(600, 'sine', 0.4, 0.1, 800);
      }
    }, 200);
  }

  lose(): void {
    this.playAt(200, 'sawtooth', 0.4, 0.1, 100);
    setTimeout(() => {
      if (!this._muted && this._started) {
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
      if (!this._muted && this._started) {
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
      if (!this._muted && this._started) {
        this.playAt(400, 'sine', 0.15, 0.06, 600);
      }
    }, 100);
  }

  // ─── Background Music ────────────────────────────────────────────

  /**
   * Start procedural chiptune background music.
   * @param peaceful - true for calm C-major pentatonic, false for tense C-minor
   */
  startMusic(peaceful: boolean): void {
    if (!this._started) return;
    // If music is already playing, tear it down first
    this.stopMusic();

    try {
      const transport = Tone.getTransport();
      transport.bpm.value = peaceful ? 100 : 140;

      // Melody synth through a gain node for volume control
      this.musicGain = new Tone.Gain(this._muted ? 0 : 0.15).toDestination();
      this.musicSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.2 },
      }).connect(this.musicGain);

      // Bass synth
      this.bassGain = new Tone.Gain(this._muted ? 0 : 0.08).toDestination();
      this.bassSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.3 },
      }).connect(this.bassGain);

      const melodyNotes = peaceful ? PEACEFUL_NOTES : HUNTING_NOTES;
      const bassNotes = peaceful ? PEACEFUL_BASS : HUNTING_BASS;

      // Melody sequence: 8 notes over 8 eighth-notes = 4 beats = 1 bar
      this.melodySeq = new Tone.Sequence(
        (time, note) => {
          if (note && this.musicSynth) {
            this.musicSynth.triggerAttackRelease(note, '16n', time);
          }
        },
        melodyNotes,
        '8n',
      );
      this.melodySeq.loop = true;
      this.melodySeq.start(0);

      // Bass sequence
      this.bassSeq = new Tone.Sequence(
        (time, note) => {
          if (note && this.bassSynth) {
            this.bassSynth.triggerAttackRelease(note, '4n', time);
          }
        },
        bassNotes,
        '8n',
      );
      this.bassSeq.loop = true;
      this.bassSeq.start(0);

      transport.start();
      this.musicPlaying = true;
    } catch {
      /* ignore music start errors */
    }
  }

  /** Stop background music and dispose music resources. */
  stopMusic(): void {
    try {
      if (this.melodySeq) {
        this.melodySeq.stop();
        this.melodySeq.dispose();
        this.melodySeq = null;
      }
      if (this.bassSeq) {
        this.bassSeq.stop();
        this.bassSeq.dispose();
        this.bassSeq = null;
      }
      if (this.musicSynth) {
        this.musicSynth.dispose();
        this.musicSynth = null;
      }
      if (this.bassSynth) {
        this.bassSynth.dispose();
        this.bassSynth = null;
      }
      if (this.musicGain) {
        this.musicGain.dispose();
        this.musicGain = null;
      }
      if (this.bassGain) {
        this.bassGain.dispose();
        this.bassGain = null;
      }
      if (this.musicPlaying) {
        Tone.getTransport().stop();
        this.musicPlaying = false;
      }
    } catch {
      /* ignore music stop errors */
    }
  }

  // ─── Ambient Sounds ─────────────────────────────────────────────

  /** Start ambient background noise (brown noise through a bandpass filter). */
  startAmbient(): void {
    if (this.ambientNoise || !this._started) return;
    try {
      this.ambientFilter = new Tone.Filter({ frequency: 400, type: 'bandpass' }).toDestination();
      this.ambientNoise = new Tone.Noise({
        type: 'brown',
        volume: -30,
      }).connect(this.ambientFilter);
      if (!this._muted) {
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
    if (!this.ambientTimerId && this._started) {
      this.scheduleNextAmbientSound();
    }
  }

  /** Schedule the next ambient sound effect (bubbling, chirps, or wind). */
  private scheduleNextAmbientSound(): void {
    // Random interval between 3-8 seconds
    const delay = 3000 + Math.random() * 5000;
    this.ambientTimerId = setTimeout(() => {
      this.ambientTimerId = null;
      if (!this._started || this._muted) {
        // Reschedule even when muted so it resumes naturally
        this.scheduleNextAmbientSound();
        return;
      }

      try {
        if (this.lastDarkness > 0.5) {
          // Night: cricket chirps — quick high-pitched blips
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
    if (!this._started || this._muted) return;
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
    if (!this._started || this._muted) return;
    try {
      // 2-3 rapid chirps
      const count = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        setTimeout(() => {
          if (!this._started || this._muted) return;
          const freq = 3000 + Math.random() * 2000;
          this.playAt(freq, 'sine', 0.04, 0.03, freq + 500);
        }, i * 60);
      }
    } catch {
      /* ignore */
    }
  }

  /** Subtle wind gust using filtered noise. */
  private playWindGust(): void {
    if (!this._started || this._muted) return;
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

  /** Stop periodic ambient sound scheduling. */
  private stopAmbientSounds(): void {
    if (this.ambientTimerId !== null) {
      clearTimeout(this.ambientTimerId);
      this.ambientTimerId = null;
    }
  }
}

/** Singleton audio system instance */
export const audio = new AudioSystem();
