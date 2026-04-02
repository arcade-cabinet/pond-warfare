/**
 * Animation Manager (anime.js v4)
 *
 * Provides lightweight UI transitions and entity visual feedback:
 * - Unit command pulse (squish-stretch) tracked per entity
 * - Building completion flash/glow
 * - Game-over stat stagger animation
 * - Intro overlay title slide-in
 *
 * The renderer reads scaleX/scaleY from entityScales map
 * to apply squish effects during entity drawing.
 */

import { animate, stagger } from 'animejs';

/** Per-entity visual scale state read by the renderer. */
export interface EntityScale {
  scaleX: number;
  scaleY: number;
}

/** Active animation abort controllers per entity so we can cancel/override. */
const activeAnimations = new Map<number, { pause: () => void }>();

/** Current visual scale per entity, read by the game renderer. */
export const entityScales = new Map<number, EntityScale>();

/**
 * Trigger a squish-stretch pulse when a unit receives a command.
 * Quickly squashes then stretches back to normal.
 */
export function triggerCommandPulse(eid: number): void {
  // Cancel any existing animation for this entity
  const existing = activeAnimations.get(eid);
  if (existing) existing.pause();

  const scale: EntityScale = { scaleX: 1, scaleY: 1 };
  entityScales.set(eid, scale);

  const anim = animate(scale, {
    scaleX: [1, 1.2, 0.9, 1.0],
    scaleY: [1, 0.8, 1.1, 1.0],
    duration: 240,
    ease: 'outElastic(1, 0.5)',
    onUpdate: () => {
      entityScales.set(eid, { scaleX: scale.scaleX, scaleY: scale.scaleY });
    },
    onComplete: () => {
      activeAnimations.delete(eid);
      entityScales.delete(eid);
    },
  });

  activeAnimations.set(eid, anim);
}

/**
 * Trigger a flash/glow effect when a building finishes construction.
 * Briefly scales up then returns to normal with a bright flash.
 */
export function triggerBuildingComplete(eid: number): void {
  const existing = activeAnimations.get(eid);
  if (existing) existing.pause();

  const scale: EntityScale = { scaleX: 1, scaleY: 1 };
  entityScales.set(eid, scale);

  const anim = animate(scale, {
    scaleX: [1, 1.15, 1.0],
    scaleY: [1, 1.15, 1.0],
    duration: 450,
    ease: 'outElastic(1, 0.6)',
    onUpdate: () => {
      entityScales.set(eid, { scaleX: scale.scaleX, scaleY: scale.scaleY });
    },
    onComplete: () => {
      activeAnimations.delete(eid);
      entityScales.delete(eid);
    },
  });

  activeAnimations.set(eid, anim);
}

/**
 * Trigger a pop effect when a unit spawns.
 * Scales from 0 -> 1.2 -> 1.0 for a satisfying pop.
 */
export function triggerSpawnPop(eid: number): void {
  const existing = activeAnimations.get(eid);
  if (existing) existing.pause();

  const scale: EntityScale = { scaleX: 0, scaleY: 0 };
  entityScales.set(eid, scale);

  const anim = animate(scale, {
    scaleX: [0, 1.2, 1.0],
    scaleY: [0, 1.2, 1.0],
    duration: 300,
    ease: 'outElastic(1, 0.5)',
    onUpdate: () => {
      entityScales.set(eid, { scaleX: scale.scaleX, scaleY: scale.scaleY });
    },
    onComplete: () => {
      activeAnimations.delete(eid);
      entityScales.delete(eid);
    },
  });

  activeAnimations.set(eid, anim);
}

/**
 * Trigger a melee attack lunge: briefly shift toward the target then snap back.
 * Uses scaleX to simulate the lunge (stretch toward target, then compress back).
 */
export function triggerAttackLunge(eid: number, targetEid: number): void {
  // Use entityScales to represent lunge: stretch on X, squash on Y
  const existing = activeAnimations.get(eid);
  if (existing) existing.pause();

  const scale: EntityScale = { scaleX: 1, scaleY: 1 };
  entityScales.set(eid, scale);

  const anim = animate(scale, {
    scaleX: [1, 1.25, 0.95, 1.0],
    scaleY: [1, 0.85, 1.05, 1.0],
    duration: 180,
    ease: 'outQuad',
    onUpdate: () => {
      entityScales.set(eid, { scaleX: scale.scaleX, scaleY: scale.scaleY });
    },
    onComplete: () => {
      activeAnimations.delete(eid);
      entityScales.delete(eid);
    },
  });

  activeAnimations.set(eid, anim);
  // Suppress unused parameter lint — targetEid reserved for directional lunge
  void targetEid;
}

/** Remove animation state for a dead entity. */
export function cleanupEntityAnimation(eid: number): void {
  const existing = activeAnimations.get(eid);
  if (existing) {
    existing.pause();
    activeAnimations.delete(eid);
  }
  entityScales.delete(eid);
}

/**
 * Animate game-over stat lines with stagger.
 * Each element fades in and slides up with a delay.
 */
export function animateGameOverStats(container: HTMLElement): void {
  const lines = container.querySelectorAll('[data-stat-line]');
  if (lines.length === 0) return;

  animate(Array.from(lines), {
    opacity: [0, 1],
    translateY: [20, 0],
    delay: stagger(150, { start: 300 }),
    duration: 400,
    ease: 'outCubic',
  });
}

/**
 * Animate the intro overlay title with a slide-in from above.
 */
export function animateIntroTitle(titleElement: HTMLElement): void {
  animate(titleElement, {
    translateY: [-40, 0],
    opacity: [0, 1],
    duration: 800,
    ease: 'outCubic',
  });
}

/**
 * Animate the intro subtitle with a delayed fade-in.
 */
export function animateIntroSubtitle(subtitleElement: HTMLElement): void {
  animate(subtitleElement, {
    opacity: [0, 1],
    duration: 600,
    delay: 400,
    ease: 'outCubic',
  });
}
