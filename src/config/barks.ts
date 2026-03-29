/**
 * Unit Bark System
 *
 * Manages dialogue barks that appear as floating text above units.
 * Tracks per-entity cooldowns and click counts to prevent spam.
 * All bark state is module-level so it persists across frames but
 * resets when the module reloads (new game session).
 */

import { type DialogueTrigger, pickDialogue, selectTriggerForClickCount } from '@/config/dialogue';
import type { GameWorld } from '@/ecs/world';
import type { EntityKind } from '@/types';

/** Minimum frames between barks for a single entity. */
const BARK_COOLDOWN = 90;

/** Per-entity bark state: last bark frame to prevent rapid-fire. */
const lastBarkFrame = new Map<number, number>();

/** Per-entity click tracking for selection bark escalation. */
const clickState = new Map<number, { count: number; lastClickFrame: number }>();

/** Per-entity low-HP bark tracking (fire once per entity). */
const lowHpBarked = new Set<number>();

/**
 * Reset all bark state. Call when starting a new game.
 */
export function resetBarkState(): void {
  lastBarkFrame.clear();
  clickState.clear();
  lowHpBarked.clear();
}

/**
 * Show a dialogue bark above a unit as floating text.
 *
 * Returns true if a bark was actually shown (not on cooldown, pool not empty).
 * Color defaults to gold for friendly barks; pass a custom color for combat/death.
 */
export function showBark(
  world: GameWorld,
  eid: number,
  x: number,
  y: number,
  kind: EntityKind,
  trigger: DialogueTrigger,
  opts?: { color?: string; life?: number; force?: boolean },
): boolean {
  const frame = world.frameCount;
  const color = opts?.color ?? '#fbbf24';
  const life = opts?.life ?? 90;
  const force = opts?.force ?? false;

  // Cooldown check (skip if forced)
  if (!force) {
    const last = lastBarkFrame.get(eid) ?? 0;
    if (frame - last < BARK_COOLDOWN) return false;
  }

  const line = pickDialogue(kind, trigger);
  if (!line) return false;

  // Record bark time
  lastBarkFrame.set(eid, frame);

  // Push floating text above the unit
  world.floatingTexts.push({
    x,
    y: y - 30,
    text: line,
    color,
    life,
  });

  return true;
}

/**
 * Handle a selection click on an entity: track click count
 * and show the appropriate escalating bark.
 */
export function showSelectBark(
  world: GameWorld,
  eid: number,
  x: number,
  y: number,
  kind: EntityKind,
): void {
  const frame = world.frameCount;
  const state = clickState.get(eid);
  let count: number;

  if (state && frame - state.lastClickFrame <= 60) {
    count = state.count + 1;
  } else {
    count = 1;
  }
  clickState.set(eid, { count, lastClickFrame: frame });

  const trigger = selectTriggerForClickCount(count);
  showBark(world, eid, x, y, kind, trigger, { force: true });
}

/**
 * Check if an entity has already barked for low HP.
 * Returns true if it has NOT barked yet (meaning we should bark).
 */
export function shouldLowHpBark(eid: number): boolean {
  if (lowHpBarked.has(eid)) return false;
  lowHpBarked.add(eid);
  return true;
}
