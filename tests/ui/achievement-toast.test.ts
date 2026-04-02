/**
 * Achievement Toast Queue Tests
 *
 * Validates the FIFO queue behavior, 3-second display, and clear logic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearAchievementToasts, showAchievementToast } from '@/ui/achievement-toast-queue';
import { activeAchievementToast } from '@/ui/store';

describe('achievement-toast-queue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAchievementToasts();
  });

  afterEach(() => {
    clearAchievementToasts();
    vi.useRealTimers();
  });

  it('shows a toast immediately when queue is empty', () => {
    showAchievementToast('First Blood', 'Kill your first enemy');
    expect(activeAchievementToast.value).toEqual({
      name: 'First Blood',
      desc: 'Kill your first enemy',
    });
  });

  it('clears toast after 3 seconds', () => {
    showAchievementToast('First Blood', 'Kill your first enemy');
    expect(activeAchievementToast.value).not.toBeNull();

    vi.advanceTimersByTime(3000);
    expect(activeAchievementToast.value).toBeNull();
  });

  it('queues multiple toasts and shows them sequentially', () => {
    showAchievementToast('First Blood', 'Kill your first enemy');
    showAchievementToast('Triple Kill', 'Get a 3-kill streak');

    expect(activeAchievementToast.value?.name).toBe('First Blood');

    vi.advanceTimersByTime(3000);
    expect(activeAchievementToast.value?.name).toBe('Triple Kill');

    vi.advanceTimersByTime(3000);
    expect(activeAchievementToast.value).toBeNull();
  });

  it('clearAchievementToasts removes current and pending', () => {
    showAchievementToast('First Blood', 'Kill your first enemy');
    showAchievementToast('Triple Kill', 'Get a 3-kill streak');

    clearAchievementToasts();
    expect(activeAchievementToast.value).toBeNull();

    // Advancing timers should not show Triple Kill
    vi.advanceTimersByTime(5000);
    expect(activeAchievementToast.value).toBeNull();
  });
});
