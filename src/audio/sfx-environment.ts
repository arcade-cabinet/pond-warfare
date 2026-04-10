/**
 * Environment & Unit SFX
 *
 * Weather transitions, unit-specific ability sounds, and environmental cues.
 * Extracted to keep sfx.ts under 300 LOC.
 */

import type { WeatherType } from '@/config/weather';
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
