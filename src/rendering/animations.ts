/**
 * Animation Manager (anime.js)
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

import anime from 'animejs';

/** Per-entity visual scale state read by the renderer. */
export interface EntityScale {
  scaleX: number;
  scaleY: number;
}

/** Active anime.js instances per entity so we can cancel/override. */
const activeAnimations = new Map<number, anime.AnimeInstance>();

/** Current visual scale per entity, read by the game renderer. */
export const entityScales = new Map<number, EntityScale>();

/**
 * Trigger a squish-stretch pulse when a unit receives a command.
 * Quickly squashes then stretches back to normal.
 */
export function triggerCommandPulse(eid: number): void {
  // Cancel any existing animation for this entity
  const existing = activeAnimations.get(eid);
  if (existing) {
    existing.pause();
  }

  const scale: EntityScale = { scaleX: 1, scaleY: 1 };
  entityScales.set(eid, scale);

  const anim = anime({
    targets: scale,
    scaleX: [
      { value: 1.2, duration: 60, easing: 'easeOutQuad' },
      { value: 0.9, duration: 80, easing: 'easeInOutQuad' },
      { value: 1.0, duration: 100, easing: 'easeOutElastic(1, 0.5)' },
    ],
    scaleY: [
      { value: 0.8, duration: 60, easing: 'easeOutQuad' },
      { value: 1.1, duration: 80, easing: 'easeInOutQuad' },
      { value: 1.0, duration: 100, easing: 'easeOutElastic(1, 0.5)' },
    ],
    update: () => {
      entityScales.set(eid, { scaleX: scale.scaleX, scaleY: scale.scaleY });
    },
    complete: () => {
      activeAnimations.delete(eid);
      entityScales.delete(eid);
    },
    autoplay: true,
  });

  activeAnimations.set(eid, anim);
}

/**
 * Trigger a flash/glow effect when a building finishes construction.
 * Briefly scales up then returns to normal with a bright flash.
 */
export function triggerBuildingComplete(eid: number): void {
  const existing = activeAnimations.get(eid);
  if (existing) {
    existing.pause();
  }

  const scale: EntityScale = { scaleX: 1, scaleY: 1 };
  entityScales.set(eid, scale);

  const anim = anime({
    targets: scale,
    scaleX: [
      { value: 1.15, duration: 150, easing: 'easeOutQuad' },
      { value: 1.0, duration: 300, easing: 'easeOutElastic(1, 0.6)' },
    ],
    scaleY: [
      { value: 1.15, duration: 150, easing: 'easeOutQuad' },
      { value: 1.0, duration: 300, easing: 'easeOutElastic(1, 0.6)' },
    ],
    update: () => {
      entityScales.set(eid, { scaleX: scale.scaleX, scaleY: scale.scaleY });
    },
    complete: () => {
      activeAnimations.delete(eid);
      entityScales.delete(eid);
    },
    autoplay: true,
  });

  activeAnimations.set(eid, anim);
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

  anime({
    targets: Array.from(lines),
    opacity: [0, 1],
    translateY: [20, 0],
    delay: anime.stagger(150, { start: 300 }),
    duration: 400,
    easing: 'easeOutCubic',
  });
}

/**
 * Animate the intro overlay title with a slide-in from above.
 */
export function animateIntroTitle(titleElement: HTMLElement): void {
  anime({
    targets: titleElement,
    translateY: [-40, 0],
    opacity: [0, 1],
    duration: 800,
    easing: 'easeOutCubic',
  });
}

/**
 * Animate the intro subtitle with a delayed fade-in.
 */
export function animateIntroSubtitle(subtitleElement: HTMLElement): void {
  anime({
    targets: subtitleElement,
    opacity: [0, 1],
    duration: 600,
    delay: 400,
    easing: 'easeOutCubic',
  });
}
