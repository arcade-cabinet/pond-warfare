/**
 * Ambient Sounds – Individual procedural nature sounds for the ambient system.
 */

import * as Tone from 'tone';
import type { SfxManager } from './sfx';

export interface AmbientSoundCtx {
  getStarted: () => boolean;
  getMuted: () => boolean;
  sfx: SfxManager;
  randomWorldX: (span?: number) => number;
}

/** Short filtered noise burst simulating pond bubbling and small droplets. */
export function playPondBubble(ctx: AmbientSoundCtx): void {
  if (!ctx.getStarted() || ctx.getMuted()) return;
  try {
    const filter = new Tone.Filter({ frequency: 520, type: 'bandpass', Q: 2 }).toDestination();
    const gain = new Tone.Gain(0.035).connect(filter);
    const noise = new Tone.Noise({ type: 'pink' }).connect(gain);
    noise.start();
    filter.frequency.rampTo(1100, 0.18);
    ctx.sfx.playAt(220 + Math.random() * 60, 'sine', 0.08, 0.025, 320, ctx.randomWorldX(0.5));
    setTimeout(() => {
      noise.stop();
      setTimeout(() => {
        noise.dispose();
        gain.dispose();
        filter.dispose();
      }, 100);
    }, 180);
  } catch {
    /* ignore */
  }
}

/** Quick clustered chirps for nighttime crickets. */
export function playCricketChirp(ctx: AmbientSoundCtx): void {
  if (!ctx.getStarted() || ctx.getMuted()) return;
  const worldX = ctx.randomWorldX();
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (!ctx.getStarted() || ctx.getMuted()) return;
      const freq = 2800 + Math.random() * 1700;
      ctx.sfx.playAt(freq, 'sine', 0.03, 0.035, freq + 500, worldX);
    }, i * 65);
  }
}

/** Low croak sweep to make night ambience feel alive. */
export function playFrogCroak(ctx: AmbientSoundCtx): void {
  if (!ctx.getStarted() || ctx.getMuted()) return;
  const worldX = ctx.randomWorldX(0.9);
  ctx.sfx.playAt(140 + Math.random() * 40, 'triangle', 0.22, 0.05, 90, worldX);
  setTimeout(() => {
    if (!ctx.getStarted() || ctx.getMuted()) return;
    ctx.sfx.playAt(95, 'triangle', 0.18, 0.035, 70, worldX);
  }, 120);
}

/** Gentle paired plucks that read as ripples and fish splashes. */
export function playWaterRipple(ctx: AmbientSoundCtx): void {
  if (!ctx.getStarted() || ctx.getMuted()) return;
  const worldX = ctx.randomWorldX(0.7);
  ctx.sfx.playAt(480, 'triangle', 0.08, 0.025, 620, worldX);
  setTimeout(() => {
    if (!ctx.getStarted() || ctx.getMuted()) return;
    ctx.sfx.playAt(640, 'sine', 0.07, 0.02, 760, worldX);
  }, 110);
}

/** Rustling reeds with a soft tonal scrape. */
export function playReedRustle(ctx: AmbientSoundCtx): void {
  if (!ctx.getStarted() || ctx.getMuted()) return;
  const worldX = ctx.randomWorldX();
  ctx.sfx.playAt(340, 'sawtooth', 0.14, 0.02, 180, worldX);
  setTimeout(() => {
    if (!ctx.getStarted() || ctx.getMuted()) return;
    ctx.sfx.playAt(220, 'triangle', 0.1, 0.018, 140, worldX);
  }, 90);
}

/** Subtle wind gust using filtered noise plus a soft moving tone. */
export function playWindGust(ctx: AmbientSoundCtx): void {
  if (!ctx.getStarted() || ctx.getMuted()) return;
  try {
    const filter = new Tone.Filter({
      frequency: 280 + Math.random() * 220,
      type: 'lowpass',
    }).toDestination();
    const gain = new Tone.Gain(0.02).connect(filter);
    const noise = new Tone.Noise({ type: 'white' }).connect(gain);
    const worldX = ctx.randomWorldX();
    noise.start();
    gain.gain.rampTo(0.04, 0.4);
    ctx.sfx.playAt(260, 'triangle', 0.24, 0.02, 180, worldX);
    setTimeout(() => {
      gain.gain.rampTo(0, 0.5);
      setTimeout(() => {
        noise.stop();
        setTimeout(() => {
          noise.dispose();
          gain.dispose();
          filter.dispose();
        }, 100);
      }, 500);
    }, 400);
  } catch {
    /* ignore */
  }
}
