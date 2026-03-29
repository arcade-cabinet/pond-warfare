/**
 * Reactive Store
 *
 * Central reactive state using @preact/signals-core. All UI components read from
 * these signals so they re-render only when their slice of state changes.
 */

import { computed, signal } from '@preact/signals';
import type { GameState, TooltipData } from '@/types';

// ---- Resources ----
export const clams = signal(200);
export const twigs = signal(50);
export const food = signal(0);
export const maxFood = signal(0);
export const rateClams = signal(0);
export const rateTwigs = signal(0);

// ---- Selection info ----
export const selectionCount = signal(0);
export const selectionName = signal('No Selection');
export const selectionNameColor = signal('text-slate-500');
export const selectionHp = signal(0);
export const selectionMaxHp = signal(0);
export const selectionShowHpBar = signal(false);
export const selectionStatsHtml = signal('');
export const selectionDesc = signal('');
export const selectionIsMulti = signal(false);
export const selectionSpriteData = signal<string | null>(null);
export const selectionKills = signal(0);

/** Typed composition breakdown for multi-select, e.g. "2 gatherer, 1 brawler" */
export const selectionComposition = signal('');

/** Entity IDs of the first 12 selected units, for mini-grid display */
export const selectionMiniGrid = signal<number[]>([]);

// ---- Game state ----
export const gameState = signal<GameState>('playing');
export const gameDay = signal(1);
export const gameTimeDisplay = signal('Day 1 - 08:00');
export const isPeaceful = signal(true);
export const peaceCountdown = signal(0);
export const gameSpeed = signal(1);
export const muted = signal(false);
export const paused = signal(false);
export const waveCountdown = signal(-1);
export const lowClams = signal(false);
export const lowTwigs = signal(false);
export const attackMoveActive = signal(false);

// ---- Counts ----
export const idleWorkerCount = signal(0);
export const armyCount = signal(0);

// ---- Game over stats ----
export const goTitle = signal('Victory');
export const goTitleColor = signal('text-amber-400');
export const goDesc = signal('');
export const goStatsText = signal('');
export const goStatLines = signal<string[]>([]);
export const goRating = signal(0);
export const goTimeSurvived = signal('');
export const goFrameCount = signal(0);

// ---- Tooltip ----
export const tooltipVisible = signal(false);
export const tooltipData = signal<TooltipData | null>(null);
export const tooltipX = signal(0);
export const tooltipY = signal(0);

// ---- Production queue ----
export interface QueueItem {
  buildingKind: number;
  unitLabel: string;
  progress: number;
  entityId?: number; // Optional stable identifier for the building producing this item
}
export const globalProductionQueue = signal<QueueItem[]>([]);

// ---- Derived ----
export const foodDisplay = computed(() => `${food.value}/${maxFood.value}`);
export const foodAtCap = computed(() => food.value >= maxFood.value);

export const hpPercent = computed(() => {
  if (selectionMaxHp.value === 0) return 0;
  return Math.max(0, (selectionHp.value / selectionMaxHp.value) * 100);
});

export const hpBarColor = computed(() => {
  const pct = hpPercent.value / 100;
  if (pct > 0.6) return '#22c55e';
  if (pct > 0.3) return '#eab308';
  return '#ef4444';
});

export const colorBlindMode = signal(false);

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
    ? 'text-green-400 font-bold uppercase tracking-widest hidden sm:block'
    : 'text-red-500 font-bold uppercase tracking-widest animate-pulse hidden sm:block',
);
