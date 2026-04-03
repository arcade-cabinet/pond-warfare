/**
 * Puzzle Mission Definitions — Types, star rating, and aggregate export
 *
 * 20 tactical puzzle missions with fixed starting units and specific objectives.
 * Split across puzzles-core.ts (1-5), puzzles-advanced.ts (6-10), and
 * puzzles-expert.ts (11-20) to stay under 300 LOC per file.
 */

import type { EntityKind } from '@/types';

export interface PuzzleUnit {
  kind: EntityKind;
  x: number;
  y: number;
}

export interface PuzzleObjective {
  type: 'destroy' | 'survive' | 'collect' | 'reach' | 'defend' | 'build-all' | 'kill-count';
  /** For 'destroy': entity kind to destroy. */
  targetKind?: EntityKind;
  /** For 'destroy' / 'kill-count': how many to destroy/kill. */
  targetCount?: number;
  /** For 'survive': frames to survive. */
  surviveFrames?: number;
  /** For 'collect': resource amount to accumulate. */
  collectAmount?: number;
  /** For 'reach': world position to reach. */
  targetX?: number;
  targetY?: number;
  /** Description shown in the objective tracker. */
  description: string;
}

export type DifficultyTier = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const DIFFICULTY_TIER_LABELS: Record<DifficultyTier, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export interface PuzzleDef {
  id: string;
  name: string;
  description: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** Named difficulty tier for UI grouping. */
  difficultyTier: DifficultyTier;
  /** Fixed map seed for reproducible terrain. */
  mapSeed: number;
  /** Scenario override for map generation. */
  scenario:
    | 'standard'
    | 'river'
    | 'island'
    | 'contested'
    | 'labyrinth'
    | 'peninsula'
    | 'archipelago';
  /** Fixed starting units for the player. */
  playerUnits: PuzzleUnit[];
  /** Fixed starting units for the enemy. */
  enemyUnits: PuzzleUnit[];
  /** Win condition. */
  objective: PuzzleObjective;
  /** Whether training new units is allowed. */
  trainingAllowed: boolean;
  /** Whether building is allowed. */
  buildingAllowed: boolean;
  /** Par time in frames for 2-star rating. */
  parTimeFrames: number;
  /** Hint text shown before the puzzle starts. */
  hint: string;
}

import { ADVANCED_PUZZLES } from './puzzles-advanced';
import { CORE_PUZZLES } from './puzzles-core';
import { EXPERT_PUZZLES } from './puzzles-expert';
import { MASTER_PUZZLES } from './puzzles-master';

export const PUZZLES: PuzzleDef[] = [
  ...CORE_PUZZLES,
  ...ADVANCED_PUZZLES,
  ...EXPERT_PUZZLES,
  ...MASTER_PUZZLES,
];

/** Group puzzles by difficulty tier for UI display. */
export function puzzlesByTier(): Record<DifficultyTier, PuzzleDef[]> {
  const groups: Record<DifficultyTier, PuzzleDef[]> = {
    beginner: [],
    intermediate: [],
    advanced: [],
    expert: [],
  };
  for (const p of PUZZLES) {
    groups[p.difficultyTier].push(p);
  }
  return groups;
}

/** Star rating: 1 star (complete), 2 stars (under par), 3 stars (no unit losses). */
export function getPuzzleStars(
  completed: boolean,
  elapsedFrames: number,
  parTimeFrames: number,
  unitsLost: number,
): number {
  if (!completed) return 0;
  let stars = 1;
  if (elapsedFrames <= parTimeFrames) stars++;
  if (unitsLost === 0) stars++;
  return stars;
}
