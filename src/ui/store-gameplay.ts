/**
 * Store — Gameplay Mode Signals
 *
 * Game-over stats, campaign, FPS counter, puzzle, replay, and game event feed
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

// ---- FPS / Campaign ----
export const fpsDisplay = signal(0);
export const fpsCounterVisible = signal(false);
export const campaignOpen = signal(false);
export const campaignMissionId = signal('');
export const campaignObjectiveStatuses = signal<Record<string, boolean>>({});
export const campaignChoiceOpen = signal(false);
export const campaignBranchPath = signal<'A' | 'B' | null>(null);

// ---- Game event feed / wave tracking ----
export const gameEvents = signal<_GameEvent[]>([]);
export const waveNumber = signal(0);

// ---- v2.0.0: Puzzle mode ----
export const puzzleId = signal('');
export const puzzleStars = signal(0);
export const puzzleObjectiveText = signal('');
export const puzzleTimerDisplay = signal('');

// ---- v2.0.0: Replay ----
export const replayMode = signal(false);
export const replayProgress = signal(0);
export const replayTimeDisplay = signal('00:00');
export const replaySpeedLabel = signal('1x');
export const replayPaused = signal(false);

// ---- Game mode ----
export type GameMode = 'skirmish' | 'survival' | 'campaign' | 'puzzle';
export const gameMode = signal<GameMode>('skirmish');
export const survivalScore = signal(0);
export const survivalWave = signal(0);

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

// ---- Active abilities (tech tree) ----
export const rallyCryAvailable = signal(false);
export const rallyCryCooldown = signal(0);
export const rallyCryActive = signal(false);
export const pondBlessingAvailable = signal(false);
export const tidalSurgeAvailable = signal(false);

// ---- UI panel open/close signals ----
export const settingsOpen = signal(false);
export const achievementsOpen = signal(false);
export const leaderboardOpen = signal(false);
export const unlocksOpen = signal(false);
export const cosmeticsOpen = signal(false);
export const keyboardRefOpen = signal(false);
export const mobilePanelOpen = signal(false);

/** Active achievement toast: name + description shown for 3 seconds. */
export interface AchievementToast {
  name: string;
  desc: string;
}
export const activeAchievementToast = signal<AchievementToast | null>(null);

// ---- Volume & panel tab ----
/** Active tab in the slide-out command panel. */
export type PanelTab = 'map' | 'forces' | 'buildings' | 'menu';
export const activePanelTab = signal<PanelTab>('forces');
export const masterVolume = signal(80);
export const musicVolume = signal(50);
export const sfxVolume = signal(80);
export const autoSaveEnabled = signal(false);

// ---- Match history / daily challenge / XP ----
export const matchHistoryOpen = signal(false);
/** XP earned in the just-completed game (shown in battle report). */
export const goXpEarned = signal(0);
/** Whether the player leveled up in the just-completed game. */
export const goLeveledUp = signal(false);
/** Player's new level after the just-completed game. */
export const goNewLevel = signal(0);
/** Whether today's daily challenge was completed in the just-completed game. */
export const goDailyChallengeCompleted = signal(false);
/** Today's daily challenge title (for HUD/menu display). */
export const dailyChallengeTitle = signal('');
/** Today's daily challenge description. */
export const dailyChallengeDesc = signal('');
/** Whether today's daily challenge has already been completed. */
export const dailyChallengeAlreadyDone = signal(false);

// ---- Production queue (moved from store.ts) ----
export interface QueueItem {
  buildingKind: number;
  unitLabel: string;
  progress: number;
  entityId?: number;
}
export const globalProductionQueue = signal<QueueItem[]>([]);

// ---- Roster (Forces + Buildings tabs) ----
export const unitRoster = signal<RosterGroup[]>([]);
export const buildingRoster = signal<RosterBuilding[]>([]);
