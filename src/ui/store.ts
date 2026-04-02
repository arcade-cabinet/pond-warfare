/**
 * Reactive Store
 *
 * Central reactive state using @preact/signals-core. All UI components read from
 * these signals so they re-render only when their slice of state changes.
 */

import { computed, signal } from '@preact/signals';
import type { GameState, TooltipData } from '@/types';
import type { RosterBuilding, RosterGroup } from './roster-types';
import type { GameEvent as _GameEvent, FoodChange, ResourceChange } from './store-types';

export type { FoodChange, GameEvent, ResourceChange } from './store-types';

// ---- Resources ----
export const clams = signal(200);
export const twigs = signal(50);
export const pearls = signal(0);
export const food = signal(0);
export const maxFood = signal(0);
export const rateClams = signal(0);
export const rateTwigs = signal(0);

export const lastResourceChange = signal<ResourceChange>({
  clams: 0,
  twigs: 0,
  pearls: 0,
  frame: -999,
});
export const lastFoodChange = signal<FoodChange>({ delta: 0, frame: -999 });

// ---- Enemy economy ----
export const enemyClams = signal(0);
export const enemyTwigs = signal(0);
export const enemyEconomyVisible = signal(false);

// ---- Selection info ----
export const selectionCount = signal(0);
export const selectionName = signal('No Selection');
export const selectionNameColor = signal('');
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

/** Countdown seconds when peace timer is about to expire (< 30s remaining), -1 otherwise */
export const peaceWarningCountdown = signal(-1);

/** True when enemies are within 400px of the player's Lodge. */
export const baseUnderAttack = signal(false);

// ---- Counts ----
export const idleWorkerCount = signal(0);
export const armyCount = signal(0);

/** Per-type idle unit counts for contextual auto-behavior menu */
export const idleGathererCount = signal(0);
export const idleCombatCount = signal(0);
export const idleHealerCount = signal(0);
export const idleScoutCount = signal(0);

/** Whether the auto-behavior menu is expanded from the idle button */
export const autoMenuExpanded = signal(false);

/** True when the current selection contains at least one player-owned mobile unit */
export const hasPlayerUnits = signal(false);

// ---- Action panel tab ----
export const activeActionTab = signal<'train' | 'build' | 'tech'>('train');

// ---- Tech tree panel ----
export const techTreeOpen = signal(false);

// ---- Radial menu ----
export const radialMenuOpen = signal(false);
export const radialMenuX = signal(0);
export const radialMenuY = signal(0);

// Auto-behavior toggle states grouped by role (persist across menu opens)
export const autoGathererEnabled = signal(false); // covers gather + build
export const autoCombatEnabled = signal(false); // covers attack + defend
export const autoHealerEnabled = signal(false);
export const autoScoutEnabled = signal(false);

// --- Legacy aliases (deprecated, will be removed after full UI migration) ---
// These computed signals map old per-action names to the new per-role signals
// so existing UI code compiles during the transition.
export const autoGatherEnabled = autoGathererEnabled;
export const autoBuildEnabled = autoGathererEnabled;
export const autoDefendEnabled = autoCombatEnabled;
export const autoAttackEnabled = autoCombatEnabled;
export const autoHealEnabled = autoHealerEnabled;

// ---- Game over stats ----
export const goTitle = signal('Victory');
export const goTitleColor = signal('text-amber-400');
export const goDesc = signal('');
export const goStatsText = signal('');
export const goStatLines = signal<string[]>([]);
export const goRating = signal(0);
export const goTimeSurvived = signal('');
export const goFrameCount = signal(0);
export const goMapSeed = signal(0);

// ---- Map scenario ----
export type MapScenario = 'standard' | 'island' | 'contested' | 'labyrinth' | 'river' | 'peninsula';
export const mapScenario = signal<MapScenario>('standard');

// ---- Map seed input (for intro screen) ----
export const customMapSeed = signal('');

// ---- Tooltip ----
export const tooltipVisible = signal(false);
export const tooltipData = signal<TooltipData | null>(null);
export const tooltipX = signal(0);
export const tooltipY = signal(0);

// ---- Control groups ----
/** Mapping of group number (1-9) to entity count. Empty groups are omitted. */
export const ctrlGroupCounts = signal<Record<number, number>>({});

// ---- Production queue ----
export interface QueueItem {
  buildingKind: number;
  unitLabel: string;
  progress: number;
  entityId?: number; // Optional stable identifier for the building producing this item
}
export const globalProductionQueue = signal<QueueItem[]>([]);

// ---- Roster (Forces + Buildings tabs) ----
export const unitRoster = signal<RosterGroup[]>([]);
export const buildingRoster = signal<RosterBuilding[]>([]);

// ---- Derived ----
export const foodDisplay = computed(() => `${food.value}/${maxFood.value}`);
export const foodAtCap = computed(() => food.value >= maxFood.value);

export const hpPercent = computed(() => {
  if (selectionMaxHp.value === 0) return 0;
  return Math.max(0, (selectionHp.value / selectionMaxHp.value) * 100);
});

export const hpBarColor = computed(() => {
  const pct = hpPercent.value / 100;
  if (pct > 0.6) return 'var(--pw-hp-good)';
  if (pct > 0.3) return 'var(--pw-hp-mid)';
  return 'var(--pw-hp-low)';
});

export const colorBlindMode = signal(false);

// ---- Objective tracking ----
/** Total number of enemy nests on the map at game start. */
export const totalEnemyNests = signal(0);
/** Number of enemy nests that have been destroyed so far. */
export const destroyedEnemyNests = signal(0);
/** Momentary flag: true for ~3 seconds after a nest is destroyed (pulse feedback). */
export const nestJustDestroyed = signal(false);

// ---- Accessibility ----
/** UI scale multiplier (1 = default, 1.5 = large, 2 = extra large). */
export const uiScale = signal(1);
/** When false, computeShakeOffset returns zero offset. */
export const screenShakeEnabled = signal(true);
/** When true, particle spawning and floating damage text are suppressed. */
export const reduceVisualNoise = signal(false);

// ---- Difficulty ----
export type DifficultyLevel = 'easy' | 'normal' | 'hard' | 'nightmare' | 'ultraNightmare';
/** @deprecated Use DifficultyLevel instead */
export type Difficulty = DifficultyLevel;
export const selectedDifficulty = signal<DifficultyLevel>('normal');

// ---- Custom game settings ----
export type { CustomGameSettings } from './store-types';
export { DEFAULT_CUSTOM_SETTINGS } from './store-types';

import { DEFAULT_CUSTOM_SETTINGS as _defaults, type CustomGameSettings } from './store-types';

export const customGameSettings = signal<CustomGameSettings>({ ..._defaults });

// ---- Menu state ----
export const menuState = signal<'main' | 'newGame' | 'playing'>('main');
/** True when the player chose "Continue" from the main menu (load save on init). */
export const continueRequested = signal(false);
export const hasSaveGame = signal(false);
export const gameName = signal('');
export const gameSeed = signal(0);
export const permadeathEnabled = signal(false);

// ---- Settings panel ----
export const settingsOpen = signal(false);

// ---- Achievements panel ----
export const achievementsOpen = signal(false);

/** Active achievement toast: name + description shown for 3 seconds. */
export interface AchievementToast {
  name: string;
  desc: string;
}
export const activeAchievementToast = signal<AchievementToast | null>(null);

// ---- Leaderboard panel ----
export const leaderboardOpen = signal(false);

// ---- Unlocks panel ----
export const unlocksOpen = signal(false);

// ---- Cosmetics panel ----
export const cosmeticsOpen = signal(false);

// ---- Keyboard reference overlay ----
export const keyboardRefOpen = signal(false);

// ---- Mobile slide-out panel ----
export const mobilePanelOpen = signal(false);

/** Active tab in the slide-out command panel. */
export type PanelTab = 'map' | 'forces' | 'buildings' | 'menu';
export const activePanelTab = signal<PanelTab>('forces');
export const masterVolume = signal(80);
export const musicVolume = signal(50);
export const sfxVolume = signal(80);
export const autoSaveEnabled = signal(false);

// ---- Commander selection ----
export const selectedCommander = signal('marshal');

export type { AIPersonality } from '@/config/ai-personalities';
// ---- Faction & AI personality ----
export type { PlayableFaction } from '@/config/factions';
export const playerFaction = signal<import('@/config/factions').PlayableFaction>('otter');
export const aiPersonality = signal<import('@/config/ai-personalities').AIPersonality>('balanced');

// ---- Airdrop system ----
export const airdropsRemaining = signal(0);
export const airdropCooldown = signal(0);

// ---- Checkpoint/Evacuation ----
export const evacuationActive = signal(false);
export const checkpointCount = signal(0);

// ---- Active abilities (tech tree) ----
export const rallyCryAvailable = signal(false);
export const rallyCryCooldown = signal(0);
export const rallyCryActive = signal(false);
export const pondBlessingAvailable = signal(false);
export const tidalSurgeAvailable = signal(false);

// ---- Game event feed / wave tracking ----
export const gameEvents = signal<_GameEvent[]>([]);
export const waveNumber = signal(0);

// ---- FPS / Campaign ----
export const fpsDisplay = signal(0);
export const fpsCounterVisible = signal(false);
export const campaignOpen = signal(false);
export const campaignMissionId = signal('');
export const campaignObjectiveStatuses = signal<Record<string, boolean>>({});

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
