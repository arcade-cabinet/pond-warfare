/**
 * Secondary SFX - Multi-note sound effects with setTimeout chains.
 *
 * Extracted from SfxManager to keep the main file under 300 LOC.
 */

import type { SfxManager } from './sfx';

export function pingEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(600, 'square', 0.1, 0.1, 800);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(800, 'square', 0.1, 0.1, 1000);
  }, 100);
}

export function selectSupportEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(800, 'sine', 0.2, 0.04, 1000);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(1000, 'sine', 0.15, 0.03, 1200);
  }, 80);
}

export function selectReconEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(1400, 'sine', 0.06, 0.05, 1800);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(1600, 'sine', 0.04, 0.04, 2000);
  }, 60);
}

export function selectCommanderEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(220, 'square', 0.25, 0.08, 180);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(260, 'square', 0.15, 0.06, 220);
  }, 120);
}

export function placeBuildingEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(100, 'sawtooth', 0.2, 0.08, 60);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(80, 'square', 0.15, 0.06, 50);
  }, 80);
}

export function researchCompleteEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(600, 'sine', 0.1, 0.06, 900);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(800, 'sine', 0.1, 0.06, 1200);
  }, 100);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(1000, 'sine', 0.15, 0.06, 1400);
  }, 200);
}

export function upgradeEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(300, 'square', 0.1, 0.1, 600);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(400, 'square', 0.2, 0.1, 800);
  }, 100);
}

export function winEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(400, 'sine', 0.2, 0.1, 600);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(600, 'sine', 0.4, 0.1, 800);
  }, 200);
}

export function loseEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(200, 'sawtooth', 0.4, 0.1, 100);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(100, 'sawtooth', 0.6, 0.1, 50);
  }, 400);
}

export function deathBuildingEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(80, 'sawtooth', 0.3, 0.15, 30, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(50, 'square', 0.4, 0.1, 25, worldX);
  }, 150);
}

export function buildCompleteEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(300, 'sine', 0.15, 0.08, 500);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(400, 'sine', 0.15, 0.06, 600);
  }, 100);
}

/** Ominous low rumble when enemy evolves to a new tier. */
export function enemyEvolutionEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(60, 'sawtooth', 0.4, 0.12, 35);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(45, 'square', 0.5, 0.1, 30);
  }, 200);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(80, 'triangle', 0.3, 0.08, 50);
  }, 450);
}

/** Brief ascending fanfare when a unit reaches a new veterancy rank. */
export function veteranPromotionEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(440, 'sine', 0.1, 0.06, 660, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(660, 'sine', 0.1, 0.06, 880, worldX);
  }, 90);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(880, 'triangle', 0.14, 0.05, 1100, worldX);
  }, 180);
}

/** Subtle notification chime when an advisor tip appears. */
export function advisorTipEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
): void {
  mgr.playAt(720, 'sine', 0.08, 0.03, 960);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(960, 'sine', 0.06, 0.025, 1100);
  }, 70);
}
