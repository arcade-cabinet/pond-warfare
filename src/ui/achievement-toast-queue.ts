/**
 * Achievement Toast Queue
 *
 * Manages a FIFO queue of achievement notifications. Each toast is shown
 * for 3 seconds before advancing to the next. The active toast is exposed
 * via the activeAchievementToast store signal.
 */

import { type AchievementToast, activeAchievementToast } from './store';

const queue: AchievementToast[] = [];
let timerId: ReturnType<typeof setTimeout> | null = null;

const TOAST_DURATION_MS = 3000;

function showNext(): void {
  if (queue.length === 0) {
    activeAchievementToast.value = null;
    timerId = null;
    return;
  }

  const next = queue.shift();
  if (!next) {
    activeAchievementToast.value = null;
    timerId = null;
    return;
  }
  activeAchievementToast.value = next;

  timerId = setTimeout(() => {
    showNext();
  }, TOAST_DURATION_MS);
}

/**
 * Enqueue an achievement toast. If nothing is currently showing,
 * it displays immediately; otherwise it waits in line.
 */
export function showAchievementToast(name: string, desc: string): void {
  queue.push({ name, desc });
  if (timerId === null) {
    showNext();
  }
}

/** Clear all pending toasts and hide the current one. */
export function clearAchievementToasts(): void {
  queue.length = 0;
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
  activeAchievementToast.value = null;
}
