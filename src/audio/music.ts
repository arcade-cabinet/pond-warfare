/** Music module - Background music (startMusic, stopMusic, peaceful/hunting sequences). */
import * as Tone from 'tone';

type Note = string | null;
type Chord = readonly string[] | null;
type Score = {
  tempo: number;
  melodies: readonly (readonly Note[])[];
  bass: readonly Note[];
  pads: readonly Chord[];
  kick: readonly boolean[];
  hat: readonly boolean[];
};

const PEACEFUL_SCORE: Score = {
  tempo: 94,
  melodies: [
    ['C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'D4', null],
    ['E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4', 'D4', 'C4', 'E4', 'G4', 'E4', 'A4', 'G4', 'E4', null],
    ['G4', 'A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'E4', 'D4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4', null],
  ],
  bass: ['C2', null, 'G1', null, 'A1', null, 'F1', null],
  pads: [
    ['C4', 'E4', 'G4'],
    null,
    ['G3', 'B3', 'D4'],
    null,
    ['A3', 'C4', 'E4'],
    null,
    ['F3', 'A3', 'C4'],
    null,
  ],
  kick: [true, false, false, false, true, false, false, false],
  hat: [false, true, false, true, false, true, false, true],
};

const HUNTING_SCORE: Score = {
  tempo: 132,
  melodies: [
    ['C4', null, 'Eb4', 'G4', 'Bb4', 'G4', 'Eb4', 'C4', 'G3', 'Bb3', 'C4', 'Eb4', 'G4', 'Eb4', 'C4', null],
    ['C4', 'Eb4', 'G4', 'Bb4', 'C5', 'Bb4', 'G4', 'Eb4', 'D4', 'F4', 'Ab4', 'Bb4', 'Ab4', 'F4', 'D4', null],
    ['G3', 'Bb3', 'C4', 'Eb4', 'G4', 'F4', 'Eb4', 'C4', 'Bb3', 'C4', 'Eb4', 'G4', 'Eb4', 'C4', 'Bb3', null],
  ],
  bass: ['C2', 'C2', 'Eb2', null, 'G1', 'G1', 'Bb1', null],
  pads: [
    ['C3', 'Eb3', 'G3'],
    null,
    ['Ab2', 'C3', 'Eb3'],
    null,
    ['G2', 'Bb2', 'D3'],
    null,
    ['Bb2', 'D3', 'F3'],
    null,
  ],
  kick: [true, false, true, false, true, false, true, false],
  hat: [true, false, true, true, true, false, true, true],
};

export class MusicManager {
  private musicSynth: Tone.Synth | null = null;
  private bassSynth: Tone.Synth | null = null;
  private padSynth: Tone.PolySynth | null = null;
  private kickSynth: Tone.MembraneSynth | null = null;
  private hatSynth: Tone.MetalSynth | null = null;
  musicGain: Tone.Gain | null = null;
  bassGain: Tone.Gain | null = null;
  private padGain: Tone.Gain | null = null;
  private percussionGain: Tone.Gain | null = null;
  private melodySeq: Tone.Sequence | null = null;
  private bassSeq: Tone.Sequence | null = null;
  private padSeq: Tone.Sequence | null = null;
  private kickSeq: Tone.Sequence | null = null;
  private hatSeq: Tone.Sequence | null = null;
  private musicPlaying = false;

  private _getStarted: () => boolean;
  private _getMusicGainLevel: () => number;
  private _getMuted: () => boolean;

  constructor(getStarted: () => boolean, getMusicGainLevel: () => number, getMuted: () => boolean) {
    this._getStarted = getStarted;
    this._getMusicGainLevel = getMusicGainLevel;
    this._getMuted = getMuted;
  }

  /** Apply current music volume to gain nodes. */
  applyMusicVolume(): void {
    const ml = this._getMuted() ? 0 : this._getMusicGainLevel();
    this.musicGain?.gain.rampTo(0.16 * ml, 0.1);
    this.bassGain?.gain.rampTo(0.1 * ml, 0.1);
    this.padGain?.gain.rampTo(0.08 * ml, 0.1);
    this.percussionGain?.gain.rampTo(0.09 * ml, 0.1);
  }

  /**
   * Start procedural background music with melodic variation, harmony, and percussion.
   * @param peaceful - true for calm pond score, false for tense hunting score
   */
  startMusic(peaceful: boolean): void {
    if (!this._getStarted()) return;
    this.stopMusic();

    try {
      const score = peaceful ? PEACEFUL_SCORE : HUNTING_SCORE;
      const transport = Tone.getTransport();
      transport.bpm.value = score.tempo;

      this.musicGain = new Tone.Gain(0).toDestination();
      this.musicSynth = new Tone.Synth({
        oscillator: { type: peaceful ? 'triangle' : 'square' },
        envelope: { attack: 0.01, decay: 0.18, sustain: 0.12, release: 0.25 },
      }).connect(this.musicGain);

      this.bassGain = new Tone.Gain(0).toDestination();
      this.bassSynth = new Tone.Synth({
        oscillator: { type: peaceful ? 'sine' : 'triangle' },
        envelope: { attack: 0.02, decay: 0.25, sustain: 0.15, release: 0.35 },
      }).connect(this.bassGain);

      this.padGain = new Tone.Gain(0).toDestination();
      this.padSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: peaceful ? 'sine' : 'triangle' },
        envelope: { attack: 0.08, decay: 0.4, sustain: 0.35, release: 0.8 },
      }).connect(this.padGain);

      this.percussionGain = new Tone.Gain(0).toDestination();
      this.kickSynth = new Tone.MembraneSynth({
        pitchDecay: 0.03,
        octaves: 4,
        envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.08 },
      }).connect(this.percussionGain);
      this.hatSynth = new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: peaceful ? 0.08 : 0.12, release: 0.02 },
      }).connect(this.percussionGain);

      this.applyMusicVolume();

      let melodyStep = 0;
      const phraseLength = score.melodies[0].length;
      const melodyTimeline = Array.from({ length: phraseLength }, (_, step) => step);
      this.melodySeq = new Tone.Sequence(
        (time) => {
          const phrase = score.melodies[Math.floor(melodyStep / phraseLength) % score.melodies.length];
          const note = phrase[melodyStep % phraseLength];
          if (note && this.musicSynth) {
            this.musicSynth.triggerAttackRelease(note, '8n', time);
          }
          melodyStep += 1;
        },
        melodyTimeline,
        '8n',
      );
      this.melodySeq.loop = true;
      this.melodySeq.start(0);

      this.bassSeq = new Tone.Sequence(
        (time, note) => {
          if (note && this.bassSynth) {
            this.bassSynth.triggerAttackRelease(note, '4n', time);
          }
        },
        [...score.bass],
        '4n',
      );
      this.bassSeq.loop = true;
      this.bassSeq.start(0);

      const padTimeline = Array.from({ length: score.pads.length }, (_, step) => step);
      this.padSeq = new Tone.Sequence(
        (time, step) => {
          const chord = score.pads[step];
          if (chord && this.padSynth) {
            this.padSynth.triggerAttackRelease([...chord], '2n', time);
          }
        },
        padTimeline,
        '4n',
      );
      this.padSeq.loop = true;
      this.padSeq.start(0);

      this.kickSeq = new Tone.Sequence(
        (time, shouldHit) => {
          if (shouldHit && this.kickSynth) {
            this.kickSynth.triggerAttackRelease('C1', '8n', time);
          }
        },
        [...score.kick],
        '8n',
      );
      this.kickSeq.loop = true;
      this.kickSeq.start(0);

      this.hatSeq = new Tone.Sequence(
        (time, shouldHit) => {
          if (shouldHit && this.hatSynth) {
            this.hatSynth.triggerAttackRelease('16n', time);
          }
        },
        [...score.hat],
        '8n',
      );
      this.hatSeq.loop = true;
      this.hatSeq.start(0);

      transport.start();
      this.musicPlaying = true;
    } catch {
      /* ignore music start errors */
    }
  }

  /** Stop background music and dispose music resources. */
  stopMusic(): void {
    try {
      for (const seq of [this.melodySeq, this.bassSeq, this.padSeq, this.kickSeq, this.hatSeq]) {
        seq?.stop();
        seq?.dispose();
      }
      this.melodySeq = null;
      this.bassSeq = null;
      this.padSeq = null;
      this.kickSeq = null;
      this.hatSeq = null;

      for (const synth of [
        this.musicSynth,
        this.bassSynth,
        this.padSynth,
        this.kickSynth,
        this.hatSynth,
      ]) {
        synth?.dispose();
      }
      this.musicSynth = null;
      this.bassSynth = null;
      this.padSynth = null;
      this.kickSynth = null;
      this.hatSynth = null;

      for (const gain of [this.musicGain, this.bassGain, this.padGain, this.percussionGain]) {
        gain?.dispose();
      }
      this.musicGain = null;
      this.bassGain = null;
      this.padGain = null;
      this.percussionGain = null;

      if (this.musicPlaying) {
        Tone.getTransport().stop();
        this.musicPlaying = false;
      }
    } catch {
      /* ignore music stop errors */
    }
  }
}
