/**
 * Audio Delegate Types
 *
 * Type interfaces for the AudioSystem delegate mixin pattern.
 * AudioDelegateMethods defines all methods installed on the prototype.
 * AudioManagers defines the internal shape needed by delegates.
 */

import type { PlayableFaction } from '@/config/factions';
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
  sniperHit(worldX?: number): void;
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
  selectBrawler(): void;
  selectSniper(): void;
  selectHealer(): void;
  selectCatapult(): void;
  selectScout(): void;
  selectCommander(): void;
  selectGatherer(): void;
  selectShieldbearer(): void;
  selectBuild(): void;
  placeBuilding(): void;
  researchComplete(): void;
  upgrade(): void;
  trainComplete(): void;
  buildComplete(): void;
  airdropIncoming(): void;
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
  sniperShoot(worldX?: number): void;
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
}
