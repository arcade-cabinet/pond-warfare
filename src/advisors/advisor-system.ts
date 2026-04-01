/**
 * Advisor ECS System
 *
 * Evaluates advisor tip conditions every ADVISOR_EVAL_INTERVAL frames,
 * sorts candidates by priority, and surfaces the highest-priority tip
 * via a reactive signal for the toast UI to consume.
 *
 * Only one tip is shown at a time. Tips respect cooldowns, per-game
 * uniqueness, permanent dismissals, and per-advisor enable toggles.
 */

import { signal } from '@preact/signals';

import {
  ADVISOR_EVAL_INTERVAL,
  ADVISOR_TIP_GAP,
  ADVISOR_TOAST_DURATION,
} from '@/config/advisor-config';
import type { GameWorld } from '@/ecs/world';

import { saveDismissedTips } from './advisor-state';
import { ADVISOR_TIPS } from './tips';
import type { AdvisorTip } from './types';

/** The currently displayed advisor tip (null when no tip is active). */
export const currentAdvisorTip = signal<AdvisorTip | null>(null);

/** Frame at which the current tip was shown (for auto-dismiss timing). */
let tipShownFrame = 0;

/** Reference to the world for dismiss handlers (set each system tick). */
let activeWorld: GameWorld | null = null;

/** Tips already shown this game session (for oncePerGame tracking). */
const shownThisSession = new Set<string>();

/**
 * Core advisor system -- call once per frame from the game loop.
 * Internally gates evaluation behind the configured interval.
 */
export function advisorSystem(world: GameWorld): void {
  activeWorld = world;
  const state = world.advisorState;
  const frame = world.frameCount;

  // Auto-dismiss current tip after ADVISOR_TOAST_DURATION frames
  if (currentAdvisorTip.value && frame - tipShownFrame >= ADVISOR_TOAST_DURATION) {
    autoDismissCurrent(world);
  }

  // Only evaluate new candidates at the configured interval
  if (frame % ADVISOR_EVAL_INTERVAL !== 0) return;

  // Don't push a new tip while one is already visible
  if (currentAdvisorTip.value) return;

  // Enforce a gap between consecutive tips so the player isn't spammed
  if (tipShownFrame > 0 && frame - tipShownFrame < ADVISOR_TIP_GAP) return;

  const candidates: AdvisorTip[] = [];

  for (const tip of ADVISOR_TIPS) {
    // Skip if this advisor role is disabled in settings
    if (!state.enabled[tip.advisor]) continue;

    // Skip permanently dismissed tips
    if (state.dismissedTips.has(tip.id)) continue;

    // Skip oncePerGame tips already shown this session
    if (tip.oncePerGame && shownThisSession.has(tip.id)) continue;

    // Skip tips on cooldown
    const lastShown = state.shownTips.get(tip.id);
    if (lastShown !== undefined && frame - lastShown < tip.cooldown) continue;

    // Evaluate the condition predicate
    if (tip.condition(world)) {
      candidates.push(tip);
    }
  }

  if (candidates.length === 0) return;

  // Sort by priority descending (highest first)
  candidates.sort((a, b) => b.priority - a.priority);

  // Show the highest-priority candidate
  const winner = candidates[0];
  currentAdvisorTip.value = winner;
  tipShownFrame = frame;
}

/**
 * Auto-dismiss: fires when the toast times out. Marks as shown with
 * cooldown but does NOT permanently dismiss.
 */
function autoDismissCurrent(world: GameWorld): void {
  const tip = currentAdvisorTip.value;
  if (!tip) return;

  const state = world.advisorState;
  state.shownTips.set(tip.id, world.frameCount);
  if (tip.oncePerGame) shownThisSession.add(tip.id);

  currentAdvisorTip.value = null;
}

/** "Got it" -- mark tip as shown, start cooldown, close toast. */
export function dismissCurrentTip(): void {
  const tip = currentAdvisorTip.value;
  if (!tip || !activeWorld) return;

  const state = activeWorld.advisorState;
  state.shownTips.set(tip.id, activeWorld.frameCount);
  if (tip.oncePerGame) shownThisSession.add(tip.id);

  currentAdvisorTip.value = null;
}

/** "Don't show again" -- permanently dismiss and persist. */
export function permanentlyDismissTip(): void {
  const tip = currentAdvisorTip.value;
  if (!tip || !activeWorld) return;

  const state = activeWorld.advisorState;
  state.dismissedTips.add(tip.id);
  state.shownTips.set(tip.id, activeWorld.frameCount);

  currentAdvisorTip.value = null;

  // Fire-and-forget persistence
  saveDismissedTips(state.dismissedTips).catch(() => {
    /* best-effort */
  });
}

/**
 * Reset session-scoped state (call when starting a new game session).
 * Exported for testing and game restart scenarios.
 */
export function resetAdvisorSession(): void {
  shownThisSession.clear();
  currentAdvisorTip.value = null;
  tipShownFrame = 0;
  activeWorld = null;
}
