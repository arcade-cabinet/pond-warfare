/**
 * Reactive Store
 *
 * Central reactive state using @preact/signals-core. All UI components read from
 * these signals so they re-render only when their slice of state changes.
 */

import { computed, signal } from '@preact/signals';
import type { GameState, TooltipData } from '@/types';
import type { FoodChange, ResourceChange } from './store-types';

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
/** When true, next terrain tap adds a patrol waypoint instead of a move command */
export const patrolModeActive = signal(false);

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

/** True when the current selection contains at least one player-owned mobile unit */
export const hasPlayerUnits = signal(false);

/** Current stance of the first selected player unit (-1 = no units, 0=Aggressive, 1=Defensive, 2=Hold). */
export const selectionStance = signal(-1);

// ---- Action panel tab ----
export const activeActionTab = signal<'train' | 'build' | 'tech'>('train');

// ---- Radial menu ----
export const radialMenuOpen = signal(false);
export const radialMenuX = signal(0);
export const radialMenuY = signal(0);

// ---- Map scenario ----
export type MapScenario =
  | 'standard'
  | 'island'
  | 'contested'
  | 'labyrinth'
  | 'river'
  | 'peninsula'
  | 'archipelago'
  | 'ravine'
  | 'swamp';
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
/** Last-recalled control group number, -1 means none active. */
export const lastRecalledGroup = signal(-1);

// ---- Production queue & roster: re-exported from store-gameplay ----
export {
  buildingRoster,
  globalProductionQueue,
  type QueueItem,
  unitRoster,
} from './store-gameplay';

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
export const selectedDifficulty = signal<DifficultyLevel>('normal');

// ---- Custom game settings ----
export type { CustomGameSettings } from './store-types';
export { DEFAULT_CUSTOM_SETTINGS } from './store-types';

import { DEFAULT_CUSTOM_SETTINGS as _defaults } from './store-types';
export const customGameSettings = signal<typeof _defaults>({ ..._defaults });

// ---- Menu state ----
export const menuState = signal<'main' | 'playing'>('main');
/** True while PixiJS initialises and entities spawn (shows loading screen). */
export const gameLoading = signal(false);
/** True when the player chose "Continue" from the main menu (load save on init). */
export const continueRequested = signal(false);
export const hasSaveGame = signal(false);
export const gameName = signal('');
export const gameSeed = signal(0);
export const permadeathEnabled = signal(false);

// ---- Commander selection ----
export const selectedCommander = signal('marshal');

export type { AIPersonality } from '@/config/ai-personalities';
// ---- Faction & AI personality ----
export type { PlayableFaction } from '@/config/factions';
export const playerFaction = signal<import('@/config/factions').PlayableFaction>('otter');
export const aiPersonality = signal<import('@/config/ai-personalities').AIPersonality>('balanced');

export {
  muteLabel,
  peaceStatusColor,
  peaceStatusStyle,
  peaceStatusText,
  speedLabel,
} from './store-derived';
// ---- Legacy aliases (v3: backward compat for tests, will be removed) ----
export {
  type AchievementToast,
  achievementsOpen,
  activeAchievementToast,
  activePanelTab,
  airdropCooldown,
  airdropsRemaining,
  autoCombatEnabled,
  autoCombatEnabled as autoDefendEnabled,
  autoCombatEnabled as autoAttackEnabled,
  autoGathererEnabled,
  autoGathererEnabled as autoGatherEnabled,
  autoGathererEnabled as autoBuildEnabled,
  autoHealerEnabled,
  autoHealerEnabled as autoHealEnabled,
  autoMenuExpanded,
  autoSaveEnabled,
  autoScoutEnabled,
  campaignMissionId,
  campaignOpen,
  checkpointCount,
  commanderAbilityActive,
  commanderAbilityCooldown,
  commanderAbilityName,
  commanderAbilityReady,
  cosmeticsOpen,
  dailyChallengeAlreadyDone,
  dailyChallengeDesc,
  dailyChallengeHistory,
  dailyChallengeStreak,
  dailyChallengeTitle,
  dailyChallengeXp,
  evacuationActive,
  fpsCounterVisible,
  fpsDisplay,
  gameEvents,
  goDailyChallengeCompleted,
  goDesc,
  goFrameCount,
  goLeveledUp,
  goMapSeed,
  goNewLevel,
  goRating,
  goStatLines,
  goStatsText,
  goTimeSurvived,
  goTitle,
  goTitleColor,
  goXpEarned,
  keyboardRefOpen,
  leaderboardOpen,
  masterVolume,
  matchHistoryOpen,
  mobilePanelOpen,
  musicVolume,
  type PanelTab,
  pondBlessingAvailable,
  rallyCryActive,
  rallyCryAvailable,
  rallyCryCooldown,
  replayMode,
  replayPaused,
  replayProgress,
  replaySpeedLabel,
  replayTimeDisplay,
  settingsOpen,
  sfxVolume,
  showSplashVideo,
  techTreeOpen,
  tidalSurgeAvailable,
  unlocksOpen,
  waveNumber,
} from './store-gameplay';
export {
  currentWeather,
  nextWeather,
  nextWeatherLabel,
  weatherCountdown,
  weatherLabel,
} from './store-weather';
