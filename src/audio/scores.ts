/** A melodic event; null means a rest for that step. */
type Note = string | null;
/** A harmonic event; null means no pad chord should play for that step. */
type Chord = readonly string[] | null;

/**
 * Procedural score data consumed by MusicManager.
 *
 * Each score provides the transport tempo plus step-based note/chord/percussion
 * timelines used to build the layered melody, bass, pad, kick, and hat loops.
 */
export type Score = {
  tempo: number;
  melodies: readonly (readonly Note[])[];
  bass: readonly Note[];
  pads: readonly Chord[];
  kick: readonly boolean[];
  hat: readonly boolean[];
};

export const PEACEFUL_SCORE: Score = {
  tempo: 94,
  melodies: [
    [
      'C4',
      'E4',
      'G4',
      'A4',
      'G4',
      'E4',
      'D4',
      'E4',
      'G4',
      'A4',
      'C5',
      'A4',
      'G4',
      'E4',
      'D4',
      null,
    ],
    [
      'E4',
      'G4',
      'A4',
      'C5',
      'A4',
      'G4',
      'E4',
      'D4',
      'C4',
      'E4',
      'G4',
      'E4',
      'A4',
      'G4',
      'E4',
      null,
    ],
    [
      'G4',
      'A4',
      'C5',
      'E5',
      'C5',
      'A4',
      'G4',
      'E4',
      'D4',
      'E4',
      'G4',
      'A4',
      'G4',
      'E4',
      'C4',
      null,
    ],
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

export const HUNTING_SCORE: Score = {
  tempo: 132,
  melodies: [
    [
      'C4',
      null,
      'Eb4',
      'G4',
      'Bb4',
      'G4',
      'Eb4',
      'C4',
      'G3',
      'Bb3',
      'C4',
      'Eb4',
      'G4',
      'Eb4',
      'C4',
      null,
    ],
    [
      'C4',
      'Eb4',
      'G4',
      'Bb4',
      'C5',
      'Bb4',
      'G4',
      'Eb4',
      'D4',
      'F4',
      'Ab4',
      'Bb4',
      'Ab4',
      'F4',
      'D4',
      null,
    ],
    [
      'G3',
      'Bb3',
      'C4',
      'Eb4',
      'G4',
      'F4',
      'Eb4',
      'C4',
      'Bb3',
      'C4',
      'Eb4',
      'G4',
      'Eb4',
      'C4',
      'Bb3',
      null,
    ],
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
