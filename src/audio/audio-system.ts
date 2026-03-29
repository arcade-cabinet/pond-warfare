/** Synthesized audio system using Tone.js. All sounds are procedurally generated. */
import * as Tone from 'tone';
import { SfxManager } from './sfx';
import { MusicManager } from './music';
import { AmbientManager } from './ambient';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export class AudioSystem {
  private _muted = false;
  private _started = false;

  /** Volume levels (0-100) for master, music, and SFX channels. */
  private _masterVol = 80;
  private _musicVol = 50;
  private _sfxVol = 80;

  /** Sub-managers for SFX, music, and ambient. */
  private sfxMgr: SfxManager;
  private musicMgr: MusicManager;
  private ambientMgr: AmbientManager;

  constructor() {
    this.sfxMgr = new SfxManager(
      () => this._started,
      () => this._muted,
      () => this.sfxGain,
    );
    this.musicMgr = new MusicManager(
      () => this._started,
      () => this.musicGainLevel,
      () => this._muted,
    );
    this.ambientMgr = new AmbientManager(
      () => this._started,
      () => this._muted,
      this.sfxMgr,
    );
  }

  /** Camera state for spatial panning -- updated externally each frame. */
  get camX(): number {
    return this.sfxMgr.camX;
  }
  set camX(v: number) {
    this.sfxMgr.camX = v;
  }
  get viewWidth(): number {
    return this.sfxMgr.viewWidth;
  }
  set viewWidth(v: number) {
    this.sfxMgr.viewWidth = v;
  }

  get muted(): boolean {
    return this._muted;
  }

  async init(): Promise<void> {
    if (this._started) return;
    await Tone.start();
    this._started = true;
    this.sfxMgr.initSynthPool();
  }

  /** Dispose all resources on shutdown. */
  shutdown(): void {
    this.musicMgr.stopMusic();
    this.ambientMgr.shutdown();
    this.sfxMgr.shutdown();
  }

  // ─── Volume Control ─────────────────────────────────────────────

  /** Effective SFX gain multiplier (master * sfx, both 0-1). */
  private get sfxGain(): number {
    return (this._masterVol / 100) * (this._sfxVol / 100);
  }

  /** Effective music gain multiplier (master * music, both 0-1). */
  private get musicGainLevel(): number {
    return (this._masterVol / 100) * (this._musicVol / 100);
  }

  /** Set master volume (0-100). Adjusts all output. */
  setMasterVolume(v: number): void {
    this._masterVol = clamp(v, 0, 100);
    this.musicMgr.applyMusicVolume();
  }

  /** Set music volume (0-100). */
  setMusicVolume(v: number): void {
    this._musicVol = clamp(v, 0, 100);
    this.musicMgr.applyMusicVolume();
  }

  /** Set SFX volume (0-100). */
  setSfxVolume(v: number): void {
    this._sfxVol = clamp(v, 0, 100);
  }

  toggleMute(): void {
    this._muted = !this._muted;
    this.ambientMgr.onMuteToggle(this._muted);
    // Mute/unmute background music gain nodes
    const ml = this.musicGainLevel;
    if (this.musicMgr.musicGain) {
      this.musicMgr.musicGain.gain.rampTo(this._muted ? 0 : 0.15 * ml, 0.1);
    }
    if (this.musicMgr.bassGain) {
      this.musicMgr.bassGain.gain.rampTo(this._muted ? 0 : 0.08 * ml, 0.1);
    }
  }

  // ─── SFX Delegate Methods ──────────────────────────────────────

  chop(worldX?: number): void {
    this.sfxMgr.chop(worldX);
  }
  mine(worldX?: number): void {
    this.sfxMgr.mine(worldX);
  }
  build(worldX?: number): void {
    this.sfxMgr.build(worldX);
  }
  hit(worldX?: number): void {
    this.sfxMgr.hit(worldX);
  }
  shoot(worldX?: number): void {
    this.sfxMgr.shoot(worldX);
  }
  alert(): void {
    this.sfxMgr.alert();
  }
  ping(): void {
    this.sfxMgr.ping();
  }
  click(): void {
    this.sfxMgr.click();
  }
  selectUnit(): void {
    this.sfxMgr.selectUnit();
  }
  selectBuild(): void {
    this.sfxMgr.selectBuild();
  }
  upgrade(): void {
    this.sfxMgr.upgrade();
  }
  win(): void {
    this.sfxMgr.win();
  }
  lose(): void {
    this.sfxMgr.lose();
  }
  heal(worldX?: number): void {
    this.sfxMgr.heal(worldX);
  }
  error(): void {
    this.sfxMgr.error();
  }
  deathUnit(worldX?: number): void {
    this.sfxMgr.deathUnit(worldX);
  }
  deathBuilding(worldX?: number): void {
    this.sfxMgr.deathBuilding(worldX);
  }
  trainComplete(): void {
    this.sfxMgr.trainComplete();
  }
  buildComplete(): void {
    this.sfxMgr.buildComplete();
  }

  // ─── Music Delegate Methods ────────────────────────────────────

  startMusic(peaceful: boolean): void {
    this.musicMgr.startMusic(peaceful);
  }
  stopMusic(): void {
    this.musicMgr.stopMusic();
  }

  // ─── Ambient Delegate Methods ──────────────────────────────────

  startAmbient(): void {
    this.ambientMgr.startAmbient();
  }
  updateAmbient(darkness: number): void {
    this.ambientMgr.updateAmbient(darkness);
  }
}

/** Singleton audio system instance */
export const audio = new AudioSystem();
