/**
 * Campaign Mission Types
 *
 * Shared types for mission definitions, objectives, and dialogue.
 */

import type { CustomGameSettings } from '@/ui/store';

export interface MissionDialogue {
  /** Trigger frame (absolute game frame count). */
  frame: number;
  /** Text shown above the Commander. */
  text: string;
  /** Duration in frames the text remains visible. */
  duration: number;
}

export type ObjectiveType =
  | 'build'
  | 'train'
  | 'explore'
  | 'destroyNest'
  | 'survive'
  | 'kill'
  | 'buildCount';

export interface MissionObjective {
  id: string;
  type: ObjectiveType;
  label: string;
  /** EntityKind value for build/train/kill objectives. */
  entityKind?: number;
  /** Target count for train/destroyNest/buildCount. */
  count?: number;
  /** Target percentage for explore objectives (0-100). */
  percent?: number;
  /** Target evolution tier for survive objectives. */
  tier?: number;
}

export interface MissionDef {
  id: string;
  /** Display number (1-5). */
  number: number;
  title: string;
  subtitle: string;
  /** Multi-line briefing text shown before the mission starts. */
  briefing: string;
  /** Objectives that must ALL be completed to win. */
  objectives: MissionObjective[];
  /** Scripted dialogue lines shown at specific frames. */
  dialogues: MissionDialogue[];
  /** Custom game settings overrides applied when starting this mission. */
  settingsOverrides: Partial<CustomGameSettings>;
  /** Extra world-level overrides applied after settings (peace timer, etc.). */
  worldOverrides?: {
    peaceTimerFrames?: number;
    startingClams?: number;
    startingTwigs?: number;
    evolutionSpeedMod?: number;
    nestCount?: number;
    heroMode?: boolean;
    fogOfWar?: 'full' | 'explored' | 'revealed';
    disableEnemyAttacksUntilObjectivesDone?: boolean;
    spawnAlphaPredator?: boolean;
    startingResourcesMult?: number;
    fullTechTree?: boolean;
    maxEnemyEvolution?: boolean;
  };
}

/** Entity kind values (mirror of EntityKind enum to avoid circular imports). */
export const EK = {
  Brawler: 1,
  Lodge: 5,
  Armory: 7,
  PredatorNest: 9,
  Scout: 16,
  AlphaPredator: 24,
} as const;
