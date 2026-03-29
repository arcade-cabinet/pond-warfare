/** Music module - Background music (startMusic, stopMusic, peaceful/hunting sequences). */
import * as Tone from 'tone';

/** Note frequencies for procedural music. */
const PEACEFUL_NOTES = ['C4', 'E4', 'G4', 'A4', 'E4', 'G4', 'C5', 'G4'];
const HUNTING_NOTES = ['C3', 'Eb3', 'G3', 'Bb3', 'C4', 'Bb3', 'G3', 'Eb3'];

/** Bass notes for chord progression. */
const PEACEFUL_BASS = ['C2', null, 'G2', null, 'A2', null, 'F2', null];
const HUNTING_BASS = ['C2', 'C2', 'Eb2', null, 'G2', 'G2', 'Bb2', null];

export class MusicManager {
  /** Background music state. */
  private musicSynth: Tone.Synth | null = null;
  private bassSynth: Tone.Synth | null = null;
  musicGain: Tone.Gain | null = null;
  bassGain: Tone.Gain | null = null;
  private melodySeq: Tone.Sequence | null = null;
  private bassSeq: Tone.Sequence | null = null;
  private musicPlaying = false;

  /** These are set by AudioSystem. */
  private _getStarted: () => boolean;
  private _getMusicGainLevel: () => number;
  private _getMuted: () => boolean;

  constructor(
    getStarted: () => boolean,
    getMusicGainLevel: () => number,
    getMuted: () => boolean,
  ) {
    this._getStarted = getStarted;
    this._getMusicGainLevel = getMusicGainLevel;
    this._getMuted = getMuted;
  }

  /** Apply current music volume to gain nodes. */
  applyMusicVolume(): void {
    if (this._getMuted()) return;
    const ml = this._getMusicGainLevel();
    if (this.musicGain) {
      this.musicGain.gain.rampTo(0.15 * ml, 0.1);
    }
    if (this.bassGain) {
      this.bassGain.gain.rampTo(0.08 * ml, 0.1);
    }
  }

  /**
   * Start procedural chiptune background music.
   * @param peaceful - true for calm C-major pentatonic, false for tense C-minor
   */
  startMusic(peaceful: boolean): void {
    if (!this._getStarted()) return;
    // If music is already playing, tear it down first
    this.stopMusic();

    try {
      const transport = Tone.getTransport();
      transport.bpm.value = peaceful ? 100 : 140;

      // Melody synth through a gain node for volume control
      const ml = this._getMusicGainLevel();
      this.musicGain = new Tone.Gain(this._getMuted() ? 0 : 0.15 * ml).toDestination();
      this.musicSynth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.2 },
      }).connect(this.musicGain);

      // Bass synth
      this.bassGain = new Tone.Gain(this._getMuted() ? 0 : 0.08 * ml).toDestination();
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
}
