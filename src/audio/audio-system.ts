/** Synthesized audio system using Tone.js. All sounds are procedurally generated. */
import * as Tone from 'tone';
import { AmbientManager } from './ambient';
import type { AudioDelegateMethods } from './audio-delegate-types';
import { installDelegates } from './audio-delegates';
import { CueManager } from './cues';
import { MusicManager } from './music';
import { SfxManager } from './sfx';
import { VoiceManager } from './voices';

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// biome-ignore lint/suspicious/noUnsafeDeclarationMerging: delegate mixin pattern
export class AudioSystem {
  private _muted = false;
  private _started = false;

  /** Volume levels (0-100) for master, music, and SFX channels. */
  private _masterVol = 80;
  private _musicVol = 50;
  private _sfxVol = 80;

  /** @internal Sub-managers -- accessed by delegate methods in audio-delegates.ts. */
  sfxMgr: SfxManager;
  cueMgr: CueManager;
  voiceMgr: VoiceManager;
  musicMgr: MusicManager;
  ambientMgr: AmbientManager;

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
    this.cueMgr = new CueManager(
      () => this._started,
      () => this._muted,
      this.sfxMgr,
    );
    this.voiceMgr = new VoiceManager(this.sfxMgr);
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

  get isStarted(): boolean {
    return this._started;
  }

  get isMuted(): boolean {
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
    this.musicMgr.applyMusicVolume();
  }
}

// Merge delegate method types into AudioSystem
export interface AudioSystem extends AudioDelegateMethods {}

// Install all delegate methods onto the prototype
installDelegates(AudioSystem.prototype);

/** Singleton audio system instance */
export const audio = new AudioSystem();
