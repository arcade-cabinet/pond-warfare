/** Synthesized audio system using Web Audio API. All sounds are procedurally generated. */
export class AudioSystem {
  private ctx: AudioContext | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  init(): void {
    if (this.ctx) return;
    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private play(
    freq: number,
    type: OscillatorType,
    duration: number,
    vol = 0.1,
    slideFreq: number | null = null,
  ): void {
    if (!this.ctx || this._muted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      if (slideFreq) {
        osc.frequency.exponentialRampToValueAtTime(slideFreq, this.ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      /* ignore audio errors */
    }
  }

  toggleMute(): void {
    this._muted = !this._muted;
  }

  chop(): void {
    this.play(200, 'square', 0.1, 0.05, 100);
  }

  mine(): void {
    this.play(400, 'sine', 0.1, 0.05, 300);
  }

  build(): void {
    this.play(150, 'sawtooth', 0.15, 0.05, 50);
  }

  hit(): void {
    this.play(90, 'sawtooth', 0.2, 0.1, 40);
  }

  shoot(): void {
    this.play(700, 'triangle', 0.1, 0.05, 1200);
  }

  alert(): void {
    this.play(400, 'square', 0.8, 0.2, 300);
  }

  ping(): void {
    this.play(600, 'square', 0.1, 0.1, 800);
    setTimeout(() => {
      if (!this._muted && this.ctx && this.ctx.state !== 'closed') {
        this.play(800, 'square', 0.1, 0.1, 1000);
      }
    }, 100);
  }

  click(): void {
    this.play(800, 'sine', 0.05, 0.05);
  }

  selectUnit(): void {
    this.play(600, 'sine', 0.1, 0.05, 800);
  }

  selectBuild(): void {
    this.play(200, 'triangle', 0.1, 0.05, 150);
  }

  upgrade(): void {
    this.play(300, 'square', 0.1, 0.1, 600);
    setTimeout(() => {
      if (!this._muted && this.ctx && this.ctx.state !== 'closed') {
        this.play(400, 'square', 0.2, 0.1, 800);
      }
    }, 100);
  }

  win(): void {
    this.play(400, 'sine', 0.2, 0.1, 600);
    setTimeout(() => {
      if (!this._muted && this.ctx && this.ctx.state !== 'closed') {
        this.play(600, 'sine', 0.4, 0.1, 800);
      }
    }, 200);
  }

  lose(): void {
    this.play(200, 'sawtooth', 0.4, 0.1, 100);
    setTimeout(() => {
      if (!this._muted && this.ctx && this.ctx.state !== 'closed') {
        this.play(100, 'sawtooth', 0.6, 0.1, 50);
      }
    }, 400);
  }

  heal(): void {
    this.play(500, 'sine', 0.15, 0.04, 700);
  }

  error(): void {
    this.play(150, 'square', 0.15, 0.08, 80);
  }
}

/** Singleton audio system instance */
export const audio = new AudioSystem();
