import type { SfxManager } from './sfx';

export class AmbientAccentPlayer {
  constructor(
    private readonly getStarted: () => boolean,
    private readonly getMuted: () => boolean,
    private readonly sfx: SfxManager,
    private readonly randomWorldX: (span?: number) => number,
  ) {}

  playWaveWash(): void {
    const worldX = this.randomWorldX();
    this.sfx.playAt(180, 'triangle', 0.28, 0.025, 120, worldX);
    setTimeout(() => {
      if (!this.canPlay()) return;
      this.sfx.playAt(130, 'sine', 0.24, 0.02, 100, worldX);
    }, 140);
  }

  playSeaGull(): void {
    const worldX = this.randomWorldX(0.95);
    this.sfx.playAt(1180, 'sine', 0.09, 0.03, 1420, worldX);
    setTimeout(() => {
      if (!this.canPlay()) return;
      this.sfx.playAt(920, 'triangle', 0.1, 0.022, 760, worldX);
    }, 120);
  }

  playWarDrum(): void {
    const worldX = this.randomWorldX(0.6);
    this.sfx.playAt(110, 'square', 0.16, 0.045, 90, worldX);
    setTimeout(() => {
      if (!this.canPlay()) return;
      this.sfx.playAt(90, 'triangle', 0.18, 0.04, 70, worldX);
    }, 180);
  }

  playCavernDrip(): void {
    const worldX = this.randomWorldX(0.4);
    this.sfx.playAt(760, 'sine', 0.05, 0.02, 980, worldX);
    setTimeout(() => {
      if (!this.canPlay()) return;
      this.sfx.playAt(320, 'triangle', 0.08, 0.016, 220, worldX);
    }, 170);
  }

  playCurrentRush(): void {
    const worldX = this.randomWorldX(0.85);
    this.sfx.playAt(240, 'triangle', 0.12, 0.024, 180, worldX);
    setTimeout(() => {
      if (!this.canPlay()) return;
      this.sfx.playAt(300, 'sine', 0.1, 0.02, 220, worldX);
    }, 90);
  }

  playStoneTap(): void {
    const worldX = this.randomWorldX(0.5);
    this.sfx.playAt(420, 'square', 0.05, 0.018, 300, worldX);
    setTimeout(() => {
      if (!this.canPlay()) return;
      this.sfx.playAt(260, 'triangle', 0.06, 0.014, 190, worldX);
    }, 85);
  }

  private canPlay(): boolean {
    return this.getStarted() && !this.getMuted();
  }
}
