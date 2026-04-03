/**
 * Core Puzzle Definitions — Puzzles 1-5
 *
 * The original five tactical puzzle missions.
 */

import { EntityKind } from '@/types';
import type { PuzzleDef } from './puzzles';

export const CORE_PUZZLES: PuzzleDef[] = [
  {
    id: 'first-strike',
    name: 'First Strike',
    description: '3 Brawlers must destroy 1 Predator Nest. No training allowed.',
    difficulty: 1,
    difficultyTier: 'beginner',
    mapSeed: 42001,
    scenario: 'standard',
    playerUnits: [
      { kind: EntityKind.Brawler, x: 400, y: 400 },
      { kind: EntityKind.Brawler, x: 430, y: 420 },
      { kind: EntityKind.Brawler, x: 460, y: 400 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 1800, y: 1800 },
      { kind: EntityKind.Gator, x: 1830, y: 1820 },
      { kind: EntityKind.Snake, x: 1860, y: 1800 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.PredatorNest,
      targetCount: 1,
      description: 'Destroy the Predator Nest',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 7200, // 2 minutes
    hint: 'Focus fire on the nest. Avoid the guards if you can.',
  },
  {
    id: 'stealth-run',
    name: 'Stealth Run',
    description: '2 Divers must reach the enemy Lodge without being detected.',
    difficulty: 2,
    difficultyTier: 'beginner',
    mapSeed: 42002,
    scenario: 'river',
    playerUnits: [
      { kind: EntityKind.Diver, x: 200, y: 1200 },
      { kind: EntityKind.Diver, x: 230, y: 1220 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 800, y: 1200 },
      { kind: EntityKind.Snake, x: 1000, y: 1000 },
      { kind: EntityKind.Gator, x: 1200, y: 800 },
      { kind: EntityKind.Snake, x: 1400, y: 1200 },
      { kind: EntityKind.ArmoredGator, x: 1600, y: 1000 },
    ],
    objective: {
      type: 'reach',
      targetX: 2200,
      targetY: 400,
      description: 'Reach the enemy Lodge with at least 1 Diver',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 10800, // 3 minutes
    hint: 'Divers are stealthy in water. Stick to rivers and shallows.',
  },
  {
    id: 'hold-the-bridge',
    name: 'Hold the Bridge',
    description: '5 units must defend a bridge chokepoint for 3 minutes.',
    difficulty: 3,
    difficultyTier: 'beginner',
    mapSeed: 42003,
    scenario: 'river',
    playerUnits: [
      { kind: EntityKind.Shieldbearer, x: 1250, y: 1250 },
      { kind: EntityKind.Shieldbearer, x: 1280, y: 1250 },
      { kind: EntityKind.Sniper, x: 1220, y: 1200 },
      { kind: EntityKind.Sniper, x: 1310, y: 1200 },
      { kind: EntityKind.Healer, x: 1265, y: 1180 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 1250, y: 1500 },
      { kind: EntityKind.Gator, x: 1280, y: 1520 },
      { kind: EntityKind.Snake, x: 1300, y: 1540 },
      { kind: EntityKind.Snake, x: 1230, y: 1540 },
    ],
    objective: {
      type: 'survive',
      surviveFrames: 10800, // 3 minutes
      description: 'Hold the bridge for 3 minutes',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 10800,
    hint: 'Place Shieldbearers at the front. Keep the Healer behind them.',
  },
  {
    id: 'economy-race',
    name: 'Economy Race',
    description: '4 Gatherers must accumulate 1000 clams before the enemy.',
    difficulty: 3,
    difficultyTier: 'beginner',
    mapSeed: 42004,
    scenario: 'standard',
    playerUnits: [
      { kind: EntityKind.Gatherer, x: 400, y: 1200 },
      { kind: EntityKind.Gatherer, x: 430, y: 1220 },
      { kind: EntityKind.Gatherer, x: 460, y: 1200 },
      { kind: EntityKind.Gatherer, x: 490, y: 1220 },
    ],
    enemyUnits: [],
    objective: {
      type: 'collect',
      collectAmount: 1000,
      description: 'Accumulate 1000 Clams',
    },
    trainingAllowed: false,
    buildingAllowed: true,
    parTimeFrames: 14400, // 4 minutes
    hint: 'Build a Lodge near clam beds for shorter trips. Optimize pathing.',
  },
  {
    id: 'commander-down',
    name: 'Commander Down',
    description: 'Kill the Alpha Predator with only your Commander + 2 Healers.',
    difficulty: 5,
    difficultyTier: 'beginner',
    mapSeed: 42005,
    scenario: 'contested',
    playerUnits: [
      { kind: EntityKind.Commander, x: 600, y: 600 },
      { kind: EntityKind.Healer, x: 620, y: 620 },
      { kind: EntityKind.Healer, x: 640, y: 600 },
    ],
    enemyUnits: [
      { kind: EntityKind.AlphaPredator, x: 1800, y: 1800 },
      { kind: EntityKind.Gator, x: 1750, y: 1780 },
      { kind: EntityKind.Gator, x: 1850, y: 1780 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.AlphaPredator,
      targetCount: 1,
      description: 'Defeat the Alpha Predator',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 18000, // 5 minutes
    hint: 'Keep your Healers alive. Kite the Alpha to separate it from guards.',
  },
];
