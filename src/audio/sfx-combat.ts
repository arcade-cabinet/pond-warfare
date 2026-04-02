/**
 * Combat SFX - Differentiated projectile, death, and kill streak sounds.
 *
 * Extracted to keep sfx.ts and sfx-secondary.ts under 300 LOC.
 */

import type { SfxManager } from './sfx';

// ---- Sniper ----

/** Sharp crack when sniper fires. */
export function sniperShootEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(1400, 'triangle', 0.06, 0.07, 2000, worldX);
}

/** Precise "thwip" on sniper projectile impact. */
export function sniperHitEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(1800, 'sine', 0.04, 0.06, 800, worldX);
}

// ---- Catapult ----

/** Low thud when catapult fires. */
export function catapultShootEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(80, 'sawtooth', 0.25, 0.1, 40, worldX);
}

/** Explosion boom on catapult impact. */
export function catapultImpactEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(60, 'sawtooth', 0.3, 0.14, 25, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(40, 'square', 0.35, 0.1, 20, worldX);
  }, 80);
}

// ---- Tower ----

/** Rapid "pew" when tower fires. */
export function towerShootEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(900, 'square', 0.06, 0.04, 1400, worldX);
}

/** Spark sound on tower projectile impact. */
export function towerHitEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(1200, 'triangle', 0.05, 0.05, 600, worldX);
}

// ---- Death sounds by unit type ----

/** Grunt sound for melee unit death. */
export function deathMeleeEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(100, 'sawtooth', 0.18, 0.09, 50, worldX);
}

/** Cry sound for ranged unit death. */
export function deathRangedEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(300, 'sine', 0.12, 0.07, 150, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(180, 'triangle', 0.1, 0.05, 100, worldX);
  }, 60);
}

// ---- Kill streak audio ----

/** Triple Kill chord (3-kill streak). */
export function tripleKillEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(440, 'sine', 0.2, 0.08, 660);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(550, 'sine', 0.2, 0.08, 880);
  }, 80);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(660, 'triangle', 0.25, 0.08, 1000);
  }, 160);
}

/** Rampage fanfare (5-kill streak). */
export function rampageEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(440, 'square', 0.15, 0.1, 660);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(660, 'square', 0.15, 0.1, 880);
  }, 100);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(880, 'sine', 0.2, 0.1, 1100);
  }, 200);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(1100, 'triangle', 0.3, 0.1, 1320);
  }, 300);
}

/** Unstoppable victorious motif (10-kill streak). */
export function unstoppableEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(440, 'square', 0.12, 0.12, 550);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(550, 'square', 0.12, 0.12, 660);
  }, 80);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(660, 'sine', 0.15, 0.12, 880);
  }, 160);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(880, 'sine', 0.15, 0.12, 1100);
  }, 240);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(1100, 'triangle', 0.35, 0.12, 1320);
  }, 320);
}
