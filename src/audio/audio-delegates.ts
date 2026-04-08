/**
 * Audio Delegate Installer
 *
 * Installs all SFX, cue, combat, voice, music, and ambient delegate methods
 * onto the AudioSystem prototype. Extracted to keep audio-system.ts under 300 LOC.
 */

import type { PlayableFaction } from '@/config/factions';
import type { EntityKind } from '@/types';
import type { AudioManagers } from './audio-delegate-types';
import { installEnvironmentDelegates } from './audio-delegates-env';
import { accordionCloseEffect, accordionOpenEffect, tabSwitchEffect } from './sfx-ui';

export type { AudioDelegateMethods } from './audio-delegate-types';

type Self = AudioManagers;

/** Helper to define a method on a prototype. */
function def(proto: any, name: string, fn: (this: Self, ...args: any[]) => void): void {
  proto[name] = fn;
}

/** Install all delegate methods onto the given prototype. */
export function installDelegates(proto: any): void {
  // Spatial SFX
  def(proto, 'chop', function (this: Self, wx?: number) {
    this.sfxMgr.chop(wx);
  });
  def(proto, 'mine', function (this: Self, wx?: number) {
    this.sfxMgr.mine(wx);
  });
  def(proto, 'build', function (this: Self, wx?: number) {
    this.sfxMgr.build(wx);
  });
  def(proto, 'heal', function (this: Self, wx?: number) {
    this.sfxMgr.heal(wx);
  });
  def(proto, 'deathUnit', function (this: Self, wx?: number) {
    this.sfxMgr.deathUnit(wx);
  });
  def(proto, 'deathBuilding', function (this: Self, wx?: number) {
    this.sfxMgr.deathBuilding(wx);
  });
  def(proto, 'veteranPromotion', function (this: Self, wx?: number) {
    this.sfxMgr.veteranPromotion(wx);
  });
  def(proto, 'deposit', function (this: Self, wx?: number) {
    this.sfxMgr.deposit(wx);
  });
  def(proto, 'trade', function (this: Self, wx?: number) {
    this.sfxMgr.trade(wx);
  });
  def(proto, 'pickup', function (this: Self, wx?: number) {
    this.sfxMgr.pickup(wx);
  });
  def(proto, 'sniperHit', function (this: Self, wx?: number) {
    this.sfxMgr.sniperHit(wx);
  });
  def(proto, 'catapultImpact', function (this: Self, wx?: number) {
    this.sfxMgr.catapultImpact(wx);
  });
  def(proto, 'towerHit', function (this: Self, wx?: number) {
    this.sfxMgr.towerHit(wx);
  });
  def(proto, 'deathMelee', function (this: Self, wx?: number) {
    this.sfxMgr.deathMelee(wx);
  });
  def(proto, 'deathRanged', function (this: Self, wx?: number) {
    this.sfxMgr.deathRanged(wx);
  });
  def(proto, 'offscreenCombat', function (this: Self, vol: number) {
    this.sfxMgr.offscreenCombat(vol);
  });
  // No-arg SFX
  def(proto, 'alert', function (this: Self) {
    this.sfxMgr.alert();
  });
  def(proto, 'ping', function (this: Self) {
    this.sfxMgr.ping();
  });
  def(proto, 'click', function (this: Self) {
    this.sfxMgr.click();
  });
  def(proto, 'error', function (this: Self) {
    this.sfxMgr.error();
  });
  def(proto, 'advisorTip', function (this: Self) {
    this.sfxMgr.advisorTip();
  });
  def(proto, 'selectUnit', function (this: Self) {
    this.sfxMgr.selectUnit();
  });
  def(proto, 'selectMudpaw', function (this: Self) {
    this.sfxMgr.selectMudpaw();
  });
  def(proto, 'selectGuard', function (this: Self) {
    this.sfxMgr.selectGuard();
  });
  def(proto, 'selectRanger', function (this: Self) {
    this.sfxMgr.selectRanger();
  });
  def(proto, 'selectBombardier', function (this: Self) {
    this.sfxMgr.selectBombardier();
  });
  def(proto, 'selectSapper', function (this: Self) {
    this.sfxMgr.selectSapper();
  });
  def(proto, 'selectSaboteur', function (this: Self) {
    this.sfxMgr.selectSaboteur();
  });
  def(proto, 'selectMedic', function (this: Self) {
    this.sfxMgr.selectMedic();
  });
  def(proto, 'selectCatapult', function (this: Self) {
    this.sfxMgr.selectCatapult();
  });
  def(proto, 'selectShaman', function (this: Self) {
    this.sfxMgr.selectShaman();
  });
  def(proto, 'selectLookout', function (this: Self) {
    this.sfxMgr.selectLookout();
  });
  def(proto, 'selectCommander', function (this: Self) {
    this.sfxMgr.selectCommander();
  });
  def(proto, 'selectShieldbearer', function (this: Self) {
    this.sfxMgr.selectShieldbearer();
  });
  def(proto, 'selectBuild', function (this: Self) {
    this.sfxMgr.selectBuild();
  });
  def(proto, 'placeBuilding', function (this: Self) {
    this.sfxMgr.placeBuilding();
  });
  def(proto, 'researchComplete', function (this: Self) {
    this.sfxMgr.researchComplete();
  });
  def(proto, 'upgrade', function (this: Self) {
    this.sfxMgr.upgrade();
  });
  def(proto, 'trainComplete', function (this: Self) {
    this.sfxMgr.trainComplete();
  });
  def(proto, 'buildComplete', function (this: Self) {
    this.sfxMgr.buildComplete();
  });
  def(proto, 'enemyEvolution', function (this: Self) {
    this.sfxMgr.enemyEvolution();
  });
  def(proto, 'tripleKill', function (this: Self) {
    this.sfxMgr.tripleKill();
  });
  def(proto, 'rampage', function (this: Self) {
    this.sfxMgr.rampage();
  });
  def(proto, 'unstoppable', function (this: Self) {
    this.sfxMgr.unstoppable();
  });
  // Cue delegates
  def(proto, 'combatStinger', function (this: Self) {
    this.cueMgr.combatStinger();
  });
  def(proto, 'victoryMotif', function (this: Self) {
    this.cueMgr.victoryMotif();
  });
  def(proto, 'defeatMotif', function (this: Self) {
    this.cueMgr.defeatMotif();
  });
  def(proto, 'statTick', function (this: Self) {
    this.cueMgr.statTick();
  });
  def(proto, 'statTotal', function (this: Self) {
    this.cueMgr.statTotal();
  });
  // Combat SFX (with stinger)
  def(proto, 'hit', function (this: Self, wx?: number) {
    this.cueMgr.combatStinger();
    this.sfxMgr.hit(wx);
  });
  def(proto, 'shoot', function (this: Self, wx?: number) {
    this.cueMgr.combatStinger();
    this.sfxMgr.shoot(wx);
  });
  def(proto, 'sniperShoot', function (this: Self, wx?: number) {
    this.cueMgr.combatStinger();
    this.sfxMgr.sniperShoot(wx);
  });
  def(proto, 'catapultShoot', function (this: Self, wx?: number) {
    this.cueMgr.combatStinger();
    this.sfxMgr.catapultShoot(wx);
  });
  def(proto, 'towerShoot', function (this: Self, wx?: number) {
    this.cueMgr.combatStinger();
    this.sfxMgr.towerShoot(wx);
  });
  def(proto, 'win', function (this: Self) {
    this.cueMgr.victoryMotif();
  });
  def(proto, 'lose', function (this: Self) {
    this.cueMgr.defeatMotif();
  });
  // Voice
  def(proto, 'playSelectionVoice', function (this: Self, k: EntityKind, f: PlayableFaction) {
    this.voiceMgr.playSelectionVoice(k, f);
  });
  def(
    proto,
    'playGroupSelectionVoice',
    function (this: Self, k: EntityKind, f: PlayableFaction, n: number) {
      this.voiceMgr.playGroupSelectionVoice(k, f, n);
    },
  );
  def(
    proto,
    'playCommandVoice',
    function (this: Self, k: EntityKind, t: 'move' | 'attack' | 'gather') {
      this.voiceMgr.playCommandVoice(k, t);
    },
  );
  // Music & Ambient
  def(proto, 'startMusic', function (this: Self, peaceful: boolean) {
    this.musicMgr.startMusic(peaceful);
  });
  def(proto, 'stopMusic', function (this: Self) {
    this.musicMgr.stopMusic();
  });
  def(proto, 'startAmbient', function (this: Self) {
    this.ambientMgr.startAmbient();
  });
  def(proto, 'updateAmbient', function (this: Self, darkness: number) {
    this.ambientMgr.updateAmbient(darkness);
  });
  // Environment & unit-specific sounds (extracted to audio-delegates-env.ts)
  installEnvironmentDelegates(proto, def);
  // UI navigation sounds
  def(proto, 'accordionOpen', function (this: Self) {
    accordionOpenEffect(this.sfxMgr);
  });
  def(proto, 'accordionClose', function (this: Self) {
    accordionCloseEffect(this.sfxMgr);
  });
  def(proto, 'tabSwitch', function (this: Self) {
    tabSwitchEffect(this.sfxMgr);
  });
}
