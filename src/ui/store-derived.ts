/**
 * Store — Derived Computed Signals
 *
 * Computed signals that depend on core store values. Extracted from
 * store.ts for file size compliance.
 */

import { computed } from '@preact/signals';
import { gameSpeed, isPeaceful, muted, peaceCountdown } from './store';

export const speedLabel = computed(() => `${gameSpeed.value}x`);
export const muteLabel = computed(() => (muted.value ? '\u{1F507}' : '\u{1F50A}'));

export const peaceStatusText = computed(() => {
  if (isPeaceful.value) {
    return `Peaceful (${peaceCountdown.value}s)`;
  }
  return 'Hunting!';
});

export const peaceStatusColor = computed(() =>
  isPeaceful.value
    ? 'font-bold uppercase tracking-widest hidden sm:block'
    : 'font-bold uppercase tracking-widest animate-pulse hidden sm:block',
);

export const peaceStatusStyle = computed(() => ({
  color: isPeaceful.value ? 'var(--pw-success)' : 'var(--pw-enemy-light)',
}));
