/**
 * Sprite Animation System
 *
 * Tracks per-entity animation state for walk cycles, attack swings,
 * and idle fidgets. All unit types have 3-frame walk cycles, distinct
 * attack frames, and idle bobbing.
 *
 * Animation is achieved through Y-offset, X-scale squash/stretch, and
 * rotation applied during rendering — not by swapping textures.
 */

import { UnitStateMachine } from '@/ecs/components';
import { UnitState } from '@/types';

/** Animation state for a single entity. */
export interface SpriteAnimState {
  /** Current animation frame index (0-2 for walk, 0-1 for attack). */
  frame: number;
  /** Frame counter for timing animation transitions. */
  timer: number;
  /** Current animation type. */
  anim: 'idle' | 'walk' | 'attack' | 'gather';
}

const animStates = new Map<number, SpriteAnimState>();

/** Frames per animation step for each animation type. */
const WALK_FRAME_RATE = 8; // frames per walk step
const ATTACK_FRAME_RATE = 12;
const IDLE_FRAME_RATE = 40;
const GATHER_FRAME_RATE = 10;

/** Number of frames in each animation cycle. */
const WALK_FRAMES = 3;
const ATTACK_FRAMES = 2;
const IDLE_FRAMES = 2;

/** Get or create animation state for an entity. */
export function getAnimState(eid: number): SpriteAnimState {
  let state = animStates.get(eid);
  if (!state) {
    state = { frame: 0, timer: 0, anim: 'idle' };
    animStates.set(eid, state);
  }
  return state;
}

/** Remove animation state for a destroyed entity. */
export function removeAnimState(eid: number): void {
  animStates.delete(eid);
}

/** Determine the animation type from the unit's ECS state. */
function resolveAnim(eid: number): 'idle' | 'walk' | 'attack' | 'gather' {
  const unitState = UnitStateMachine.state[eid] as UnitState;
  switch (unitState) {
    case UnitState.Move:
    case UnitState.AttackMove:
    case UnitState.AttackMovePatrol:
      return 'walk';
    case UnitState.GatherMove:
    case UnitState.Gathering:
    case UnitState.ReturnMove:
      return 'gather';
    case UnitState.Attacking:
      return 'attack';
    default:
      return 'idle';
  }
}

/** Advance the animation state for one frame. */
export function tickAnimation(eid: number): void {
  const state = getAnimState(eid);
  const newAnim = resolveAnim(eid);

  // Reset on animation type change
  if (newAnim !== state.anim) {
    state.anim = newAnim;
    state.frame = 0;
    state.timer = 0;
  }

  state.timer++;

  let frameRate: number;
  let maxFrames: number;
  switch (state.anim) {
    case 'walk':
      frameRate = WALK_FRAME_RATE;
      maxFrames = WALK_FRAMES;
      break;
    case 'gather':
      frameRate = GATHER_FRAME_RATE;
      maxFrames = WALK_FRAMES;
      break;
    case 'attack':
      frameRate = ATTACK_FRAME_RATE;
      maxFrames = ATTACK_FRAMES;
      break;
    default:
      frameRate = IDLE_FRAME_RATE;
      maxFrames = IDLE_FRAMES;
      break;
  }

  if (state.timer >= frameRate) {
    state.timer = 0;
    state.frame = (state.frame + 1) % maxFrames;
  }
}

/**
 * Get the visual modifiers for the current animation frame.
 * Returns offsets to apply during rendering.
 */
export function getAnimVisuals(eid: number): {
  yOffset: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
} {
  const state = getAnimState(eid);

  switch (state.anim) {
    case 'walk': {
      // Walk cycle: bounce up/down + slight lean
      const bounceY = state.frame === 1 ? -2 : state.frame === 2 ? -1 : 0;
      const lean = state.frame === 0 ? -0.03 : state.frame === 2 ? 0.03 : 0;
      return { yOffset: bounceY, scaleX: 1, scaleY: 1, rotation: lean };
    }
    case 'gather': {
      // Gathering: similar to walk but with a forward lean
      const bounceY = state.frame === 1 ? -1 : 0;
      const lean = state.frame === 1 ? 0.05 : state.frame === 2 ? -0.02 : 0;
      return { yOffset: bounceY, scaleX: 1, scaleY: 1, rotation: lean };
    }
    case 'attack': {
      // Attack swing: lunge forward + squash
      if (state.frame === 0) {
        // Wind-up: pull back
        return { yOffset: 0, scaleX: 0.9, scaleY: 1.1, rotation: -0.1 };
      }
      // Strike: thrust forward
      return { yOffset: -1, scaleX: 1.15, scaleY: 0.9, rotation: 0.1 };
    }
    default: {
      // Idle: subtle bob every other frame
      const bob = state.frame === 1 ? -1 : 0;
      return { yOffset: bob, scaleX: 1, scaleY: 1, rotation: 0 };
    }
  }
}

/** Clear all animation states (e.g., on game reset). */
export function clearAllAnimStates(): void {
  animStates.clear();
}
