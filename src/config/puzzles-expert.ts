/**
 * Expert Puzzle Definitions — Puzzles 11-15
 *
 * Five puzzles covering economy micro, tech rushing, defensive play,
 * sniper precision, and flood survival.
 *
 * Puzzles 11-13 are "advanced" difficulty; 14-15 are "expert" difficulty.
 */

import { EntityKind } from '@/types';
import type { PuzzleDef } from './puzzles';

export const EXPERT_PUZZLES: PuzzleDef[] = [
  // ---- Puzzle 11: Economy Rush (Advanced) ----
  {
    id: 'economy-rush',
    name: 'Economy Rush',
    description: 'Accumulate 500 clams in 3 minutes with only 2 Gatherers and a Lodge.',
    difficulty: 3,
    difficultyTier: 'advanced',
    mapSeed: 42011,
    scenario: 'standard',
    playerUnits: [
      { kind: EntityKind.Gatherer, x: 500, y: 500 },
      { kind: EntityKind.Gatherer, x: 530, y: 520 },
    ],
    enemyUnits: [],
    objective: {
      type: 'collect',
      collectAmount: 500,
      description: 'Accumulate 500 Clams in 3 minutes',
    },
    trainingAllowed: false,
    buildingAllowed: true,
    parTimeFrames: 10800, // 3 minutes
    hint: 'Build your Lodge as close to clam beds as possible to minimize travel time.',
  },

  // ---- Puzzle 12: Tech Sprint (Advanced) ----
  {
    id: 'tech-sprint',
    name: 'Tech Sprint',
    description: 'Research 5 technologies before the enemy attacks in 5 minutes.',
    difficulty: 3,
    difficultyTier: 'advanced',
    mapSeed: 42012,
    scenario: 'standard',
    playerUnits: [
      { kind: EntityKind.Commander, x: 600, y: 600 },
      { kind: EntityKind.Gatherer, x: 620, y: 620 },
      { kind: EntityKind.Gatherer, x: 640, y: 600 },
      { kind: EntityKind.Gatherer, x: 660, y: 620 },
      { kind: EntityKind.Gatherer, x: 680, y: 600 },
    ],
    enemyUnits: [
      { kind: EntityKind.ArmoredGator, x: 2000, y: 2000 },
      { kind: EntityKind.VenomSnake, x: 2030, y: 2020 },
      { kind: EntityKind.SwampDrake, x: 2060, y: 2000 },
    ],
    objective: {
      type: 'build-all',
      description: 'Research 5 technologies before the enemy attacks',
    },
    trainingAllowed: true,
    buildingAllowed: true,
    parTimeFrames: 18000, // 5 minutes
    hint: 'Prioritize economy techs first, then branch into military. Build early.',
  },

  // ---- Puzzle 13: Hold the Line (Advanced) ----
  {
    id: 'hold-the-line',
    name: 'Hold the Line',
    description: 'Defend 3 buildings for 5 minutes with a small garrison and walls.',
    difficulty: 4,
    difficultyTier: 'advanced',
    mapSeed: 42013,
    scenario: 'peninsula',
    playerUnits: [
      { kind: EntityKind.Shieldbearer, x: 800, y: 800 },
      { kind: EntityKind.Shieldbearer, x: 830, y: 820 },
      { kind: EntityKind.Sniper, x: 770, y: 770 },
      { kind: EntityKind.Healer, x: 800, y: 760 },
      { kind: EntityKind.Engineer, x: 830, y: 760 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 1800, y: 1200 },
      { kind: EntityKind.Gator, x: 1830, y: 1220 },
      { kind: EntityKind.ArmoredGator, x: 1860, y: 1200 },
      { kind: EntityKind.Snake, x: 1800, y: 1260 },
      { kind: EntityKind.VenomSnake, x: 1830, y: 1260 },
      { kind: EntityKind.SwampDrake, x: 1900, y: 1200 },
    ],
    objective: {
      type: 'survive',
      surviveFrames: 18000, // 5 minutes
      description: 'Defend your buildings for 5 minutes',
    },
    trainingAllowed: false,
    buildingAllowed: true,
    parTimeFrames: 18000,
    hint: 'Use the Engineer to build walls at chokepoints. Keep the Healer safe.',
  },

  // ---- Puzzle 14: Sniper Alley (Expert) ----
  {
    id: 'sniper-alley',
    name: 'Sniper Alley',
    description: 'Eliminate 10 targets using only 3 Snipers. Precision is everything.',
    difficulty: 4,
    difficultyTier: 'expert',
    mapSeed: 42014,
    scenario: 'contested',
    playerUnits: [
      { kind: EntityKind.Sniper, x: 300, y: 1200 },
      { kind: EntityKind.Sniper, x: 330, y: 1220 },
      { kind: EntityKind.Sniper, x: 360, y: 1200 },
    ],
    enemyUnits: [
      { kind: EntityKind.Snake, x: 800, y: 1000 },
      { kind: EntityKind.Snake, x: 1000, y: 800 },
      { kind: EntityKind.Gator, x: 1200, y: 1100 },
      { kind: EntityKind.Gator, x: 1400, y: 900 },
      { kind: EntityKind.Snake, x: 1600, y: 1200 },
      { kind: EntityKind.ArmoredGator, x: 1800, y: 1000 },
    ],
    objective: {
      type: 'kill-count',
      targetCount: 10,
      description: 'Eliminate 10 enemies with 3 Snipers',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 14400, // 4 minutes
    hint: 'Snipers deal bonus damage from high ground. Position before engaging.',
  },

  // ---- Puzzle 15: The Great Flood (Expert) ----
  {
    id: 'the-great-flood',
    name: 'The Great Flood',
    description: 'Survive a mega-wave with only 50 starting resources and one of each unit.',
    difficulty: 4,
    difficultyTier: 'expert',
    mapSeed: 42015,
    scenario: 'island',
    playerUnits: [
      { kind: EntityKind.Brawler, x: 1200, y: 1200 },
      { kind: EntityKind.Sniper, x: 1230, y: 1180 },
      { kind: EntityKind.Shieldbearer, x: 1200, y: 1230 },
      { kind: EntityKind.Healer, x: 1230, y: 1230 },
      { kind: EntityKind.Diver, x: 1260, y: 1200 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 600, y: 600 },
      { kind: EntityKind.Gator, x: 700, y: 500 },
      { kind: EntityKind.ArmoredGator, x: 1800, y: 600 },
      { kind: EntityKind.Snake, x: 600, y: 1800 },
      { kind: EntityKind.VenomSnake, x: 1800, y: 1800 },
      { kind: EntityKind.SwampDrake, x: 1200, y: 400 },
      { kind: EntityKind.SiegeTurtle, x: 400, y: 1200 },
      { kind: EntityKind.BurrowingWorm, x: 2000, y: 1200 },
    ],
    objective: {
      type: 'survive',
      surviveFrames: 14400, // 4 minutes
      description: 'Survive the mega-wave with minimal resources',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 14400,
    hint: 'Each unit type counters something. Use Diver to scout, Shieldbearer to tank.',
  },
];
