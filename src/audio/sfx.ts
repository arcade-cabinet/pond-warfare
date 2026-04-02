/** SFX module - All sound effect methods and synth pool management. */
import * as Tone from 'tone';
import {
  catapultImpactEffect,
  catapultShootEffect,
  deathMeleeEffect,
  deathRangedEffect,
  rampageEffect,
  sniperHitEffect,
  sniperShootEffect,
  towerHitEffect,
  towerShootEffect,
  tripleKillEffect,
  unstoppableEffect,
} from './sfx-combat';
import {
  advisorTipEffect,
  buildCompleteEffect,
  deathBuildingEffect,
  enemyEvolutionEffect,
  loseEffect,
  pingEffect,
  placeBuildingEffect,
  researchCompleteEffect,
  selectCommanderEffect,
  selectHealerEffect,
  selectScoutEffect,
  upgradeEffect,
  veteranPromotionEffect,
  winEffect,
} from './sfx-secondary';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Return a multiplier in [1 - range, 1 + range] for pitch variation. */
function jitter(range: number): number {
  return 1 + (Math.random() * 2 - 1) * range;
}

export interface SynthPannerPair {
  synth: Tone.Synth;
  panner: Tone.Panner;
  available: boolean;
}

export class SfxManager {
  private synthPool: SynthPannerPair[] = [];
  private readonly POOL_SIZE = 16;

  camX = 0;
  viewWidth = 800;

  private _getStarted: () => boolean;
  private _getMuted: () => boolean;
  private _getSfxGain: () => number;

  constructor(getStarted: () => boolean, getMuted: () => boolean, getSfxGain: () => number) {
    this._getStarted = getStarted;
    this._getMuted = getMuted;
    this._getSfxGain = getSfxGain;
  }

  initSynthPool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const panner = new Tone.Panner(0).toDestination();
      const synth = new Tone.Synth().connect(panner);
      this.synthPool.push({ synth, panner, available: true });
    }
  }

  private borrowSynthPair(): SynthPannerPair {
    let pair = this.synthPool.find((p) => p.available);
    if (!pair) pair = this.synthPool[0];
    pair.available = false;
    return pair;
  }

  private returnSynthPair(pair: SynthPannerPair): void {
    pair.available = true;
  }

  shutdown(): void {
    for (const pair of this.synthPool) {
      pair.synth.dispose();
      pair.panner.dispose();
    }
    this.synthPool = [];
  }

  private worldToPan(worldX?: number): number {
    if (worldX === undefined) return 0;
    const center = this.camX + this.viewWidth / 2;
    return clamp((worldX - center) / (this.viewWidth / 2), -1, 1);
  }

  playAt(
    freq: number,
    type: Tone.ToneOscillatorType,
    duration: number,
    vol = 0.1,
    slideFreq: number | null = null,
    worldX?: number,
  ): void {
    if (!this._getStarted() || this._getMuted()) return;
    try {
      const pair = this.borrowSynthPair();
      const { synth, panner } = pair;
      panner.pan.value = this.worldToPan(worldX);
      synth.oscillator.type = type as any;
      synth.envelope.attack = 0.001;
      synth.envelope.decay = duration * 0.8;
      synth.envelope.sustain = 0;
      synth.envelope.release = duration * 0.2;
      synth.volume.value = Tone.gainToDb(vol * this._getSfxGain());
      synth.triggerAttackRelease(freq, duration);
      if (slideFreq) synth.oscillator.frequency.exponentialRampTo(slideFreq, duration);
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

  // ---- Single-note effects ----
  chop(worldX?: number): void {
    const p = jitter(0.08);
    this.playAt(200 * p, 'square', 0.1, 0.05, 100 * p, worldX);
  }
  mine(worldX?: number): void {
    const p = jitter(0.08);
    this.playAt(400 * p, 'sine', 0.1, 0.05, 300 * p, worldX);
  }
  build(worldX?: number): void {
    this.playAt(150, 'sawtooth', 0.15, 0.05, 50, worldX);
  }
  hit(worldX?: number): void {
    const p = jitter(0.05);
    this.playAt(90 * p, 'sawtooth', 0.2, 0.1, 40 * p, worldX);
  }
  shoot(worldX?: number): void {
    const p = jitter(0.05);
    this.playAt(700 * p, 'triangle', 0.1, 0.05, 1200 * p, worldX);
  }
  alert(): void {
    this.playAt(400, 'square', 0.8, 0.2, 300);
  }
  click(): void {
    this.playAt(800, 'sine', 0.05, 0.05);
  }
  selectUnit(): void {
    this.playAt(600, 'sine', 0.1, 0.05, 800);
  }
  selectBrawler(): void {
    this.playAt(80, 'sine', 0.15, 0.08, 50);
  }
  selectSniper(): void {
    this.playAt(1200, 'triangle', 0.08, 0.06, 1800);
  }
  selectCatapult(): void {
    this.playAt(60, 'sawtooth', 0.2, 0.06, 40);
  }
  selectGatherer(): void {
    this.playAt(900, 'triangle', 0.04, 0.04, 600);
  }
  selectShieldbearer(): void {
    this.playAt(150, 'square', 0.12, 0.07, 90);
  }
  selectBuild(): void {
    this.playAt(200, 'triangle', 0.1, 0.05, 150);
  }
  heal(worldX?: number): void {
    this.playAt(500, 'sine', 0.15, 0.04, 700, worldX);
  }
  error(): void {
    this.playAt(150, 'square', 0.15, 0.08, 80);
  }
  deathUnit(worldX?: number): void {
    const p = jitter(0.05);
    this.playAt(120 * p, 'sawtooth', 0.15, 0.08, 60 * p, worldX);
  }
  trainComplete(): void {
    this.playAt(500, 'sine', 0.1, 0.06, 800);
  }
  airdropIncoming(): void {
    this.playAt(1200, 'sine', 0.4, 0.08, 300);
  }
  /** Short rising tone when resources are deposited at the Lodge. */
  deposit(worldX?: number): void {
    this.playAt(500, 'sine', 0.08, 0.04, 800, worldX);
  }
  /** Cash register sound for Market trades (deposit at lower pitch). */
  trade(worldX?: number): void {
    this.playAt(350, 'sine', 0.1, 0.06, 550, worldX);
  }
  /** Subtle pickup sound when a gatherer finishes collecting a resource. */
  pickup(worldX?: number): void {
    this.playAt(700, 'triangle', 0.06, 0.03, 900, worldX);
  }

  // ---- Multi-note effects (delegated to sfx-secondary.ts) ----
  ping(): void {
    pingEffect(this, this._getMuted, this._getStarted);
  }
  selectHealer(): void {
    selectHealerEffect(this, this._getMuted, this._getStarted);
  }
  selectScout(): void {
    selectScoutEffect(this, this._getMuted, this._getStarted);
  }
  selectCommander(): void {
    selectCommanderEffect(this, this._getMuted, this._getStarted);
  }
  placeBuilding(): void {
    placeBuildingEffect(this, this._getMuted, this._getStarted);
  }
  researchComplete(): void {
    researchCompleteEffect(this, this._getMuted, this._getStarted);
  }
  upgrade(): void {
    upgradeEffect(this, this._getMuted, this._getStarted);
  }
  win(): void {
    winEffect(this, this._getMuted, this._getStarted);
  }
  lose(): void {
    loseEffect(this, this._getMuted, this._getStarted);
  }
  deathBuilding(worldX?: number): void {
    deathBuildingEffect(this, this._getMuted, this._getStarted, worldX);
  }
  buildComplete(): void {
    buildCompleteEffect(this, this._getMuted, this._getStarted);
  }
  enemyEvolution(): void {
    enemyEvolutionEffect(this, this._getMuted, this._getStarted);
  }
  veteranPromotion(worldX?: number): void {
    veteranPromotionEffect(this, this._getMuted, this._getStarted, worldX);
  }
  advisorTip(): void {
    advisorTipEffect(this, this._getMuted, this._getStarted);
  }

  /** Muffled off-screen combat rumble. Volume 0-1 scales with proximity. */
  offscreenCombat(volume: number): void {
    if (volume <= 0) return;
    this.playAt(60, 'sawtooth', 0.3, 0.04 * volume, 40);
  }

  // ---- Differentiated combat sounds ----
  sniperShoot(worldX?: number): void {
    sniperShootEffect(this, worldX);
  }
  sniperHit(worldX?: number): void {
    sniperHitEffect(this, worldX);
  }
  catapultShoot(worldX?: number): void {
    catapultShootEffect(this, worldX);
  }
  catapultImpact(worldX?: number): void {
    catapultImpactEffect(this, this._getMuted, this._getStarted, worldX);
  }
  towerShoot(worldX?: number): void {
    towerShootEffect(this, worldX);
  }
  towerHit(worldX?: number): void {
    towerHitEffect(this, worldX);
  }
  deathMelee(worldX?: number): void {
    deathMeleeEffect(this, worldX);
  }
  deathRanged(worldX?: number): void {
    deathRangedEffect(this, this._getMuted, this._getStarted, worldX);
  }
  tripleKill(): void {
    tripleKillEffect(this, this._getMuted, this._getStarted);
  }
  rampage(): void {
    rampageEffect(this, this._getMuted, this._getStarted);
  }
  unstoppable(): void {
    unstoppableEffect(this, this._getMuted, this._getStarted);
  }
}
