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

/**
 * Trigger a hit recoil: briefly offset the target away from the attacker
 * using a yOffset spring (3px push, spring back over ~4 frames).
 * We piggyback on entityScales to track the recoil animation state.
 */
export function triggerHitRecoil(
  eid: number,
  attackerX: number,
  attackerY: number,
  targetX: number,
  targetY: number,
): void {
  const dx = targetX - attackerX;
  const dy = targetY - attackerY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  // Recoil direction normalized, applied as scale distortion
  const recoilX = (dx / dist) * 0.15;
  const recoilY = (dy / dist) * 0.15;

  const existing = activeAnimations.get(eid);
  if (existing) existing.pause();

  const scale: EntityScale = { scaleX: 1 + recoilX, scaleY: 1 + recoilY };
  entityScales.set(eid, scale);

  const anim = animate(scale, {
    scaleX: [1 + recoilX, 1.0],
    scaleY: [1 + recoilY, 1.0],
    duration: 120,
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
  // Suppress unused parameters — directional data used above
  void attackerX;
  void attackerY;
  void targetX;
  void targetY;
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
 * Animate game-over stat lines with stagger, counter-up numbers, and tick sounds.
 * Each stat fades in, slides up, and its number counts from 0 to final value.
 * @param onTick - called for each stat reveal (tick sound)
 * @param onTotal - called for the final stat (total sound)
 */
export function animateGameOverStats(
  container: HTMLElement,
  onTick?: () => void,
  onTotal?: () => void,
): void {
  const lines = container.querySelectorAll('[data-stat-line]');
  if (lines.length === 0) return;

  const lineArr = Array.from(lines) as HTMLElement[];

  // Stagger fade-in + slide
  animate(lineArr, {
    opacity: [0, 1],
    translateY: [20, 0],
    delay: stagger(200, { start: 400 }),
    duration: 400,
    ease: 'outCubic',
  });

  // Counter-up animation for numeric values in each stat line
  for (let i = 0; i < lineArr.length; i++) {
    const el = lineArr[i];
    const text = el.textContent ?? '';
    const isLast = i === lineArr.length - 1;
    const revealDelay = 400 + i * 200;

    // Find the numeric portion: "Kills: 42" -> "42", "Time: 3 days, 5 hours" -> skip
    const match = text.match(/^(.+?:\s*)(\d+)(.*)$/);
    if (match) {
      const [, prefix, numStr, suffix] = match;
      const finalVal = parseInt(numStr, 10);
      const counter = { val: 0 };

      setTimeout(() => {
        if (onTick && !isLast) onTick();
        if (onTotal && isLast) onTotal();

        animate(counter, {
          val: finalVal,
          duration: 500,
          ease: 'outCubic',
          onUpdate: () => {
            el.textContent = `${prefix}${Math.round(counter.val)}${suffix}`;
          },
        });
      }, revealDelay);
    } else {
      // Non-numeric stat (e.g. "Time: 3 days...") — just play sound on reveal
      setTimeout(() => {
        if (isLast && onTotal) onTotal();
        else if (onTick) onTick();
      }, revealDelay);
    }
  }
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
