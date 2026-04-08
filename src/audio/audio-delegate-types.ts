/**
 * Audio Delegate Types
 *
 * Type interfaces for the AudioSystem delegate mixin pattern.
 * AudioDelegateMethods defines all methods installed on the prototype.
 * AudioManagers defines the internal shape needed by delegates.
 */

import type { PlayableFaction } from '@/config/factions';
import type { WeatherType } from '@/config/weather';
import type { EntityKind } from '@/types';
import type { AmbientManager } from './ambient';
import type { CueManager } from './cues';
import type { MusicManager } from './music';
import type { SfxManager } from './sfx';
import type { VoiceManager } from './voices';

/** Internal shape of AudioSystem needed by delegates. */
export interface AudioManagers {
  sfxMgr: SfxManager;
  cueMgr: CueManager;
  voiceMgr: VoiceManager;
  musicMgr: MusicManager;
  ambientMgr: AmbientManager;
  /** Whether audio has been initialized (Tone.start() called). */
  readonly isStarted: boolean;
  /** Whether audio is currently muted. */
  readonly isMuted: boolean;
}

/** All delegate methods mixed into AudioSystem.prototype. */
export interface AudioDelegateMethods {
  chop(worldX?: number): void;
  mine(worldX?: number): void;
  build(worldX?: number): void;
  heal(worldX?: number): void;
  deathUnit(worldX?: number): void;
  deathBuilding(worldX?: number): void;
  veteranPromotion(worldX?: number): void;
  deposit(worldX?: number): void;
  trade(worldX?: number): void;
  pickup(worldX?: number): void;
  catapultImpact(worldX?: number): void;
  towerHit(worldX?: number): void;
  deathMelee(worldX?: number): void;
  deathRanged(worldX?: number): void;
  offscreenCombat(volume: number): void;
  alert(): void;
  ping(): void;
  click(): void;
  error(): void;
  advisorTip(): void;
  selectUnit(): void;
  selectMudpaw(): void;
  selectGuard(): void;
  selectRanger(): void;
  selectBombardier(): void;
  selectSapper(): void;
  selectSaboteur(): void;
  selectMedic(): void;
  selectCatapult(): void;
  selectShaman(): void;
  selectLookout(): void;
  selectCommander(): void;
  selectShieldbearer(): void;
  selectBuild(): void;
  placeBuilding(): void;
  researchComplete(): void;
  upgrade(): void;
  trainComplete(): void;
  buildComplete(): void;
  enemyEvolution(): void;
  tripleKill(): void;
  rampage(): void;
  unstoppable(): void;
  combatStinger(): void;
  victoryMotif(): void;
  defeatMotif(): void;
  statTick(): void;
  statTotal(): void;
  hit(worldX?: number): void;
  shoot(worldX?: number): void;
  catapultShoot(worldX?: number): void;
  towerShoot(worldX?: number): void;
  win(): void;
  lose(): void;
  playSelectionVoice(kind: EntityKind, faction: PlayableFaction): void;
  playGroupSelectionVoice(kind: EntityKind, faction: PlayableFaction, groupSize: number): void;
  playCommandVoice(kind: EntityKind, trigger: 'move' | 'attack' | 'gather'): void;
  startMusic(peaceful: boolean): void;
  stopMusic(): void;
  startAmbient(): void;
  updateAmbient(darkness: number): void;
  // Environment & unit-specific sounds
  weatherTransition(weatherType: WeatherType): void;
  wormEmergence(worldX?: number): void;
  heronScreech(worldX?: number): void;
  // UI navigation sounds
  accordionOpen(): void;
  accordionClose(): void;
  tabSwitch(): void;
}
