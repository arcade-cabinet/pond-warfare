import type { SfxManager } from './sfx';

type CueStep = {
  delay: number;
  freq: number;
  type: Parameters<SfxManager['playAt']>[1];
  duration: number;
  volume: number;
  slide?: number;
};

export class CueManager {
  private lastCombatStingerAt = -9999;

  constructor(
    private readonly getStarted: () => boolean,
    private readonly getMuted: () => boolean,
    private readonly sfx: SfxManager,
  ) {}

  combatStinger(): void {
    const now = Date.now();
    if (!this.canPlay() || now - this.lastCombatStingerAt < 4000) return;
    this.lastCombatStingerAt = now;
    this.playPattern([
      { delay: 0, freq: 320, type: 'square', duration: 0.14, volume: 0.05, slide: 420 },
      { delay: 120, freq: 460, type: 'triangle', duration: 0.16, volume: 0.045, slide: 620 },
      { delay: 250, freq: 620, type: 'sine', duration: 0.18, volume: 0.04, slide: 760 },
    ]);
  }

  victoryMotif(): void {
    this.playPattern([
      { delay: 0, freq: 420, type: 'triangle', duration: 0.22, volume: 0.08, slide: 520 },
      { delay: 180, freq: 560, type: 'sine', duration: 0.24, volume: 0.09, slide: 700 },
      { delay: 380, freq: 760, type: 'sine', duration: 0.34, volume: 0.1, slide: 920 },
    ]);
  }

  defeatMotif(): void {
    this.playPattern([
      { delay: 0, freq: 340, type: 'sawtooth', duration: 0.35, volume: 0.08, slide: 220 },
      { delay: 260, freq: 240, type: 'square', duration: 0.4, volume: 0.09, slide: 140 },
      { delay: 560, freq: 160, type: 'sawtooth', duration: 0.46, volume: 0.1, slide: 80 },
    ]);
  }

  private playPattern(pattern: readonly CueStep[], worldX?: number): void {
    if (!this.canPlay()) return;
    for (const step of pattern) {
      setTimeout(() => {
        if (!this.canPlay()) return;
        this.sfx.playAt(
          step.freq,
          step.type,
          step.duration,
          step.volume,
          step.slide ?? null,
          worldX,
        );
      }, step.delay);
    }
  }

  private canPlay(): boolean {
    return this.getStarted() && !this.getMuted();
  }
}
