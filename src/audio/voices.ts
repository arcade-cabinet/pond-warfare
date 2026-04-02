import type { PlayableFaction } from '@/config/factions';
import { EntityKind } from '@/types';
import type { SfxManager } from './sfx';

type VoiceStep = {
  freq: number;
  type: Parameters<SfxManager['playAt']>[1];
  duration: number;
  volume: number;
  slide?: number;
  delay?: number;
};

type VoicePalette = Record<
  'worker' | 'skirmisher' | 'heavy' | 'support' | 'leader',
  readonly VoiceStep[]
>;

const OTTER_PALETTE: VoicePalette = {
  worker: [
    { freq: 820, type: 'triangle', duration: 0.06, volume: 0.035, slide: 960 },
    { freq: 980, type: 'sine', duration: 0.05, volume: 0.03, slide: 1120, delay: 70 },
  ],
  skirmisher: [
    { freq: 640, type: 'sine', duration: 0.08, volume: 0.04, slide: 820 },
    { freq: 860, type: 'triangle', duration: 0.05, volume: 0.03, slide: 980, delay: 80 },
  ],
  heavy: [{ freq: 220, type: 'triangle', duration: 0.14, volume: 0.055, slide: 160 }],
  support: [
    { freq: 700, type: 'sine', duration: 0.12, volume: 0.035, slide: 860 },
    { freq: 940, type: 'sine', duration: 0.08, volume: 0.028, slide: 1100, delay: 90 },
  ],
  leader: [
    { freq: 260, type: 'square', duration: 0.16, volume: 0.06, slide: 320 },
    { freq: 390, type: 'triangle', duration: 0.14, volume: 0.05, slide: 460, delay: 120 },
  ],
};

const PREDATOR_PALETTE: VoicePalette = {
  worker: [{ freq: 280, type: 'square', duration: 0.08, volume: 0.04, slide: 230 }],
  skirmisher: [
    { freq: 300, type: 'sawtooth', duration: 0.1, volume: 0.045, slide: 220 },
    { freq: 220, type: 'square', duration: 0.08, volume: 0.035, slide: 180, delay: 70 },
  ],
  heavy: [{ freq: 140, type: 'square', duration: 0.16, volume: 0.06, slide: 100 }],
  support: [
    { freq: 360, type: 'triangle', duration: 0.12, volume: 0.04, slide: 300 },
    { freq: 240, type: 'sawtooth', duration: 0.1, volume: 0.032, slide: 180, delay: 100 },
  ],
  leader: [
    { freq: 180, type: 'square', duration: 0.18, volume: 0.065, slide: 130 },
    { freq: 120, type: 'sawtooth', duration: 0.16, volume: 0.055, slide: 90, delay: 140 },
  ],
};

export class VoiceManager {
  constructor(private readonly sfx: SfxManager) {}

  playSelectionVoice(kind: EntityKind, faction: PlayableFaction): void {
    const palette = faction === 'predator' ? PREDATOR_PALETTE : OTTER_PALETTE;
    const role = this.roleFor(kind, faction);
    this.playPalette(palette[role]);
  }

  /** Play a command acknowledgement voice (move/attack/gather). */
  playCommandVoice(kind: EntityKind, trigger: 'move' | 'attack' | 'gather'): void {
    const role = this.roleFor(kind, 'otter');
    const base = OTTER_PALETTE[role];
    // Pitch-shift the selection palette based on command type
    const shift = trigger === 'attack' ? 0.7 : trigger === 'gather' ? 1.15 : 1.0;
    const steps: VoiceStep[] = base.map((s) => ({
      ...s,
      freq: Math.round(s.freq * shift),
      slide: s.slide ? Math.round(s.slide * shift) : undefined,
      duration: s.duration * 0.8,
    }));
    this.playPalette(steps);
  }

  private playPalette(steps: readonly VoiceStep[]): void {
    for (const step of steps) {
      setTimeout(() => {
        this.sfx.playAt(step.freq, step.type, step.duration, step.volume, step.slide ?? null);
      }, step.delay ?? 0);
    }
  }

  private roleFor(kind: EntityKind, faction: PlayableFaction): keyof VoicePalette {
    if (kind === EntityKind.Gatherer) return 'worker';
    if (
      kind === EntityKind.Healer ||
      kind === EntityKind.Scout ||
      kind === EntityKind.SwampDrake ||
      kind === EntityKind.Trapper
    ) {
      return 'support';
    }
    if (
      kind === EntityKind.Commander ||
      kind === EntityKind.BossCroc ||
      kind === EntityKind.AlphaPredator
    ) {
      return 'leader';
    }
    if (
      kind === EntityKind.Shieldbearer ||
      kind === EntityKind.Catapult ||
      kind === EntityKind.ArmoredGator ||
      kind === EntityKind.SiegeTurtle
    ) {
      return 'heavy';
    }
    if (
      faction === 'predator' &&
      (kind === EntityKind.Gator || kind === EntityKind.Snake || kind === EntityKind.VenomSnake)
    ) {
      return 'skirmisher';
    }
    return kind === EntityKind.Brawler || kind === EntityKind.Sniper ? 'skirmisher' : 'heavy';
  }
}
