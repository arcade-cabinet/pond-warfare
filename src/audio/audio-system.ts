/** Synthesized audio system using Tone.js. All sounds are procedurally generated. */
import * as Tone from 'tone';
import type { PlayableFaction } from '@/config/factions';
import type { EntityKind } from '@/types';
import { AmbientManager } from './ambient';
import {
  combatCatapultShoot,
  combatHit,
  combatShoot,
  combatSniperShoot,
  combatTowerShoot,
} from './audio-combat';
import { CueManager } from './cues';
import { MusicManager } from './music';
import { SfxManager } from './sfx';
import { VoiceManager } from './voices';

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
  private cueMgr: CueManager;
  private voiceMgr: VoiceManager;

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

  // ─── Simple SFX Delegates ──────────────────────────────────────
  chop(worldX?: number): void {
    this.sfxMgr.chop(worldX);
  }
  mine(worldX?: number): void {
    this.sfxMgr.mine(worldX);
  }
  build(worldX?: number): void {
    this.sfxMgr.build(worldX);
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
  selectBrawler(): void {
    this.sfxMgr.selectBrawler();
  }
  selectSniper(): void {
    this.sfxMgr.selectSniper();
  }
  selectHealer(): void {
    this.sfxMgr.selectHealer();
  }
  selectCatapult(): void {
    this.sfxMgr.selectCatapult();
  }
  selectScout(): void {
    this.sfxMgr.selectScout();
  }
  selectCommander(): void {
    this.sfxMgr.selectCommander();
  }
  selectGatherer(): void {
    this.sfxMgr.selectGatherer();
  }
  selectShieldbearer(): void {
    this.sfxMgr.selectShieldbearer();
  }
  placeBuilding(): void {
    this.sfxMgr.placeBuilding();
  }
  researchComplete(): void {
    this.sfxMgr.researchComplete();
  }
  airdropIncoming(): void {
    this.sfxMgr.airdropIncoming();
  }
  selectBuild(): void {
    this.sfxMgr.selectBuild();
  }
  upgrade(): void {
    this.sfxMgr.upgrade();
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
  enemyEvolution(): void {
    this.sfxMgr.enemyEvolution();
  }
  veteranPromotion(worldX?: number): void {
    this.sfxMgr.veteranPromotion(worldX);
  }
  advisorTip(): void {
    this.sfxMgr.advisorTip();
  }
  deposit(worldX?: number): void {
    this.sfxMgr.deposit(worldX);
  }
  trade(worldX?: number): void {
    this.sfxMgr.trade(worldX);
  }
  pickup(worldX?: number): void {
    this.sfxMgr.pickup(worldX);
  }
  sniperHit(worldX?: number): void {
    this.sfxMgr.sniperHit(worldX);
  }
  catapultImpact(worldX?: number): void {
    this.sfxMgr.catapultImpact(worldX);
  }
  towerHit(worldX?: number): void {
    this.sfxMgr.towerHit(worldX);
  }
  deathMelee(worldX?: number): void {
    this.sfxMgr.deathMelee(worldX);
  }
  deathRanged(worldX?: number): void {
    this.sfxMgr.deathRanged(worldX);
  }
  tripleKill(): void {
    this.sfxMgr.tripleKill();
  }
  rampage(): void {
    this.sfxMgr.rampage();
  }
  unstoppable(): void {
    this.sfxMgr.unstoppable();
  }
  offscreenCombat(volume: number): void {
    this.sfxMgr.offscreenCombat(volume);
  }
  combatStinger(): void {
    this.cueMgr.combatStinger();
  }
  victoryMotif(): void {
    this.cueMgr.victoryMotif();
  }
  defeatMotif(): void {
    this.cueMgr.defeatMotif();
  }
  statTick(): void {
    this.cueMgr.statTick();
  }
  statTotal(): void {
    this.cueMgr.statTotal();
  }

  // ─── Combat SFX (with stinger) ────────────────────────────────
  hit(worldX?: number): void {
    combatHit(this.sfxMgr, this.cueMgr, worldX);
  }
  shoot(worldX?: number): void {
    combatShoot(this.sfxMgr, this.cueMgr, worldX);
  }
  sniperShoot(worldX?: number): void {
    combatSniperShoot(this.sfxMgr, this.cueMgr, worldX);
  }
  catapultShoot(worldX?: number): void {
    combatCatapultShoot(this.sfxMgr, this.cueMgr, worldX);
  }
  towerShoot(worldX?: number): void {
    combatTowerShoot(this.sfxMgr, this.cueMgr, worldX);
  }
  win(): void {
    this.cueMgr.victoryMotif();
  }
  lose(): void {
    this.cueMgr.defeatMotif();
  }

  // ─── Voice / Music / Ambient Delegates ────────────────────────
  playSelectionVoice(kind: EntityKind, faction: PlayableFaction): void {
    this.voiceMgr.playSelectionVoice(kind, faction);
  }
  playGroupSelectionVoice(kind: EntityKind, faction: PlayableFaction, groupSize: number): void {
    this.voiceMgr.playGroupSelectionVoice(kind, faction, groupSize);
  }
  playCommandVoice(kind: EntityKind, trigger: 'move' | 'attack' | 'gather'): void {
    this.voiceMgr.playCommandVoice(kind, trigger);
  }
  startMusic(peaceful: boolean): void {
    this.musicMgr.startMusic(peaceful);
  }
  stopMusic(): void {
    this.musicMgr.stopMusic();
  }
  startAmbient(): void {
    this.ambientMgr.startAmbient();
  }
  updateAmbient(darkness: number): void {
    this.ambientMgr.updateAmbient(darkness);
  }
}

/** Singleton audio system instance */
export const audio = new AudioSystem();
