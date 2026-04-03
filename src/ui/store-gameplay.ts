/**
 * Store -- Gameplay Mode Signals
 *
 * Game-over stats, FPS counter, replay, and game event feed
 * signals extracted from store.ts for file size compliance.
 */

import { signal } from '@preact/signals';
import type { RosterBuilding, RosterGroup } from './roster-types';
import type { GameEvent as _GameEvent } from './store-types';

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

// ---- FPS ----
export const fpsDisplay = signal(0);
export const fpsCounterVisible = signal(false);

// ---- Game event feed / wave tracking ----
export const gameEvents = signal<_GameEvent[]>([]);
export const waveNumber = signal(0);

// ---- v2.0.0: Replay ----
export const replayMode = signal(false);
export const replayProgress = signal(0);
export const replayTimeDisplay = signal('00:00');
export const replaySpeedLabel = signal('1x');
export const replayPaused = signal(false);

// ---- Commander ability ----
export const commanderAbilityReady = signal(false);
export const commanderAbilityCooldown = signal(0);
export const commanderAbilityActive = signal(false);
export const commanderAbilityName = signal('');

// ---- Airdrop system ----
export const airdropsRemaining = signal(0);
export const airdropCooldown = signal(0);

// ---- Checkpoint/Evacuation ----
export const evacuationActive = signal(false);
export const checkpointCount = signal(0);

// ---- Active abilities ----
export const rallyCryAvailable = signal(false);
export const rallyCryCooldown = signal(0);
export const rallyCryActive = signal(false);
export const pondBlessingAvailable = signal(false);
export const tidalSurgeAvailable = signal(false);

// ---- UI panel open/close signals ----
export const settingsOpen = signal(false);
export const achievementsOpen = signal(false);
export const leaderboardOpen = signal(false);
export const cosmeticsOpen = signal(false);
export const keyboardRefOpen = signal(false);
export const mobilePanelOpen = signal(false);

/** Active achievement toast: name + description shown for 3 seconds. */
export interface AchievementToast {
  name: string;
  desc: string;
}
export const activeAchievementToast = signal<AchievementToast | null>(null);

// ---- Volume ----
export const masterVolume = signal(80);
export const musicVolume = signal(50);
export const sfxVolume = signal(80);
export const autoSaveEnabled = signal(false);

// ---- Match history / XP ----
export const matchHistoryOpen = signal(false);
/** XP earned in the just-completed game (shown in battle report). */
export const goXpEarned = signal(0);
/** Whether the player leveled up in the just-completed game. */
export const goLeveledUp = signal(false);
/** Player's new level after the just-completed game. */
export const goNewLevel = signal(0);

// ---- Daily challenge (v3: stub signals, will be replaced by event system) ----
export const goDailyChallengeCompleted = signal(false);
export const dailyChallengeTitle = signal('');
export const dailyChallengeDesc = signal('');
export const dailyChallengeXp = signal(0);
export const dailyChallengeAlreadyDone = signal(false);
export const dailyChallengeStreak = signal(0);
export const dailyChallengeHistory = signal<unknown[]>([]);

// ---- Auto-behavior toggles (v3: stub signals, replaced by prestige auto-deploy) ----
export const autoGathererEnabled = signal(false);
export const autoCombatEnabled = signal(false);
export const autoHealerEnabled = signal(false);
export const autoScoutEnabled = signal(false);
export const autoMenuExpanded = signal(false);

// ---- Panel tab (v3: stub, panel removed) ----
export type PanelTab = 'map' | 'forces' | 'buildings' | 'menu';
export const activePanelTab = signal<PanelTab>('forces');

// ---- Tech tree open (v3: stub, replaced by upgrade web) ----
export const techTreeOpen = signal(false);
// ---- Campaign (v3: stub, removed) ----
export const campaignOpen = signal(false);
export const campaignMissionId = signal<string | null>(null);
// ---- Unlocks (v3: stub, removed) ----
export const unlocksOpen = signal(false);

// ---- Production queue ----
export interface QueueItem {
  buildingKind: number;
  unitLabel: string;
  progress: number;
  entityId?: number;
}
export const globalProductionQueue = signal<QueueItem[]>([]);

// ---- Roster (Forces + Buildings) ----
export const unitRoster = signal<RosterGroup[]>([]);
export const buildingRoster = signal<RosterBuilding[]>([]);

/** True when the splash video should play before a new game. */
export const showSplashVideo = signal(false);
