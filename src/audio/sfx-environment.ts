/**
 * Environment & Unit SFX
 *
 * Weather transitions, unit-specific ability sounds, and environmental cues.
 * Extracted to keep sfx.ts under 300 LOC.
 */

import type { WeatherType } from '@/config/weather';
import type { ShrineAbility } from '@/ecs/systems/shrine';
import type { SfxManager } from './sfx';

// ---- Weather Transition Sounds ----

/** Play a weather transition sound based on the new weather type. */
export function weatherTransitionEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  weatherType: WeatherType,
): void {
  if (!getStarted() || getMuted()) return;
  switch (weatherType) {
    case 'rain':
      // Rising water sound: low to mid ascending
      mgr.playAt(200, 'sine', 0.3, 0.05, 500);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(350, 'triangle', 0.25, 0.04, 600);
      }, 150);
      break;
    case 'fog':
      // Low eerie tone: slow, dark
      mgr.playAt(80, 'sine', 0.4, 0.04, 60);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(100, 'triangle', 0.35, 0.03, 70);
      }, 200);
      break;
    case 'wind':
      // Whoosh: high sweep downward
      mgr.playAt(800, 'sawtooth', 0.3, 0.04, 200);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(600, 'triangle', 0.2, 0.03, 150);
      }, 120);
      break;
    case 'clear':
      // Birds chirping: quick high notes
      mgr.playAt(1200, 'sine', 0.08, 0.03, 1500);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(1400, 'sine', 0.06, 0.03, 1600);
      }, 100);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(1100, 'triangle', 0.07, 0.025, 1400);
      }, 200);
      break;
  }
}

// ---- Shrine Activation Sounds ----

/** Deep resonant tone with reverb feel, different per ability type. */
export function shrineActivationEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  ability: ShrineAbility,
  worldX?: number,
): void {
  if (!getStarted() || getMuted()) return;
  switch (ability) {
    case 'bloom':
      // Healing chime: bright ascending
      mgr.playAt(400, 'sine', 0.3, 0.1, 800, worldX);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(600, 'sine', 0.25, 0.08, 1000, worldX);
      }, 150);
      break;
    case 'meteor':
      // Impact rumble: deep descending
      mgr.playAt(80, 'sawtooth', 0.4, 0.12, 30, worldX);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(50, 'square', 0.35, 0.1, 20, worldX);
      }, 200);
      break;
    case 'eclipse':
      // Dark pulse: ominous low tone
      mgr.playAt(60, 'square', 0.4, 0.1, 40, worldX);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(90, 'sine', 0.3, 0.08, 50, worldX);
      }, 250);
      break;
    case 'flood':
      // Rushing water: ascending sweep
      mgr.playAt(150, 'triangle', 0.35, 0.08, 400, worldX);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(300, 'sine', 0.3, 0.06, 500, worldX);
      }, 180);
      break;
    case 'stoneWall':
      // Heavy stone: low thud + grind
      mgr.playAt(70, 'sawtooth', 0.3, 0.1, 40, worldX);
      setTimeout(() => {
        if (!getMuted() && getStarted()) mgr.playAt(120, 'square', 0.25, 0.08, 60, worldX);
      }, 160);
      break;
  }
}

// ---- Berserker Rage Sound ----

/** Rage growl when Berserker drops below 50% HP. */
export function berserkerRageEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(70, 'sawtooth', 0.2, 0.07, 50, worldX);
}

/** Escalated rage at 25% HP: deeper, more intense. */
export function berserkerFuryEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(50, 'sawtooth', 0.25, 0.09, 30, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(40, 'square', 0.2, 0.07, 25, worldX);
  }, 100);
}

// ---- Diver Stealth Sounds ----

/** Subtle water splash when Diver enters stealth. */
export function diverSubmergeEffect(mgr: SfxManager, worldX?: number): void {
  mgr.playAt(400, 'sine', 0.12, 0.04, 200, worldX);
}

/** Dramatic emergence when stealth breaks on attack. */
export function diverEmergeEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(200, 'triangle', 0.15, 0.07, 500, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(400, 'sine', 0.1, 0.05, 700, worldX);
  }, 80);
}

// ---- Worm Emergence Sound ----

/** Rumbling/cracking sound when a Burrowing Worm surfaces. */
export function wormEmergenceEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(50, 'sawtooth', 0.3, 0.1, 30, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(80, 'square', 0.2, 0.08, 40, worldX);
  }, 120);
}

// ---- Heron Screech ----

/** Bird screech when a Flying Heron spawns. */
export function heronScreechEffect(
  mgr: SfxManager,
  getMuted: () => boolean,
  getStarted: () => boolean,
  worldX?: number,
): void {
  mgr.playAt(1600, 'sawtooth', 0.1, 0.06, 800, worldX);
  setTimeout(() => {
    if (!getMuted() && getStarted()) mgr.playAt(1200, 'triangle', 0.08, 0.04, 600, worldX);
  }, 80);
}
